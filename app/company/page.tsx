"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import { createAuditLog } from "@/lib/auditlog";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Contract = {
  id: string;
  company_name: string;
  company_id: string;
  company_voen?: string | null;
  counterparty: string;
  counterparty_voen?: string | null;
  start_date: string;
  end_date: string;
  file_url: string | null;
  generated_file_path?: string | null;
  template_name?: string | null;
  template_file_path?: string | null;
  auto_renew: boolean;
  contract_direction: string | null;
  contract_group: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
};

type ContractDirection = {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
};

type ContractGroup = {
  id: string;
  direction_id: string;
  name: string;
  code: string;
  is_active: boolean;
};

type DirectionFilter = "ALL" | string;
type GroupFilter = "ALL" | string;
type StatFilter =
  | "ALL"
  | "EXPIRING_30"
  | "CRITICAL"
  | "AUTO_RENEW"
  | "PDF"
  | `DIRECTION:${string}`;

export default function CompanyDashboard() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contractDirections, setContractDirections] = useState<
    ContractDirection[]
  >([]);
  const [contractGroups, setContractGroups] = useState<ContractGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [permissions, setPermissions] = useState<any[]>([]);
  const [editingContract, setEditingContract] = useState<any>(null);
  const [activeStatFilter, setActiveStatFilter] = useState<StatFilter>("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [directionFilter, setDirectionFilter] =
    useState<DirectionFilter>("ALL");
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("ALL");

  const [openFilterKey, setOpenFilterKey] = useState<keyof Contract | null>(
    null
  );

  const [columnFilters, setColumnFilters] = useState<
    Partial<Record<keyof Contract, string[]>>
  >({});

  async function loadContractSettings() {
    const { data: directionData, error: directionError } = await supabase
      .from("contract_directions")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    const { data: groupData, error: groupError } = await supabase
      .from("contract_groups")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (directionError || groupError) {
      alert("Müqavilə bölmə və qrupları yüklənmədi");
      return;
    }

    setContractDirections(directionData || []);
    setContractGroups(groupData || []);
  }

  function getProfileName(profile: any) {
    if (!profile) return "-";

    const firstLast = `${profile.first_name || ""} ${profile.last_name || ""
      }`.trim();

    return (
      profile.full_name ||
      firstLast ||
      profile.name ||
      profile.display_name ||
      profile.email ||
      "-"
    );
  }

  async function enrichContractsWithCreators(rows: any[]) {
    const creatorIds = Array.from(
      new Set(
        rows
          .map((c) => c.created_by)
          .filter((id): id is string => Boolean(id))
      )
    );

    if (creatorIds.length === 0) {
      return rows.map((c) => ({
        ...c,
        created_by_name: "-",
      }));
    }

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*")
      .in("id", creatorIds);

    if (error) {
      console.error("Creator profiles load error:", error);
      return rows.map((c) => ({
        ...c,
        created_by_name: c.created_by || "-",
      }));
    }

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    return rows.map((c) => {
      const profile = c.created_by ? profileMap.get(c.created_by) : null;

      return {
        ...c,
        created_by_name: getProfileName(profile),
      };
    });
  }

  async function loadContracts() {
    await loadContractSettings();

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    const { data: perms } = await supabase
      .from("user_company_permissions")
      .select("*")
      .eq("user_id", userId);

    setPermissions(perms || []);

    if (!userId) {
      setLoading(false);
      return;
    }

    const { data: userCompanies } = await supabase
      .from("user_companies")
      .select("company_id")
      .eq("user_id", userId);

    if (!userCompanies || userCompanies.length === 0) {
      setLoading(false);
      return;
    }

    const companyIds = userCompanies.map((c) => c.company_id);

    const { data, error } = await supabase
      .from("contracts")
      .select("*")
      .in("company_id", companyIds)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    if (data) {
      const now = new Date().getTime();

      const expiredContracts = data.filter((c) => {
        const end = new Date(c.end_date).getTime();
        return end < now && !c.auto_renew;
      });

      if (expiredContracts.length > 0) {
        await supabase
          .from("contracts")
          .update({ status: "archived" })
          .in(
            "id",
            expiredContracts.map((c) => c.id)
          );
      }

      const activeContracts = data.filter((c) => {
        const end = new Date(c.end_date).getTime();
        return !(end < now && !c.auto_renew);
      });

      const enrichedContracts = await enrichContractsWithCreators(
        activeContracts
      );

      setContracts(enrichedContracts as Contract[]);
    }

    setLoading(false);
  }

  async function updateContract() {
    if (!editingContract) return;

    let fileUrl = editingContract.file_url;

    if (editingContract.newFile) {
      const fileName = `${Date.now()}-${editingContract.newFile.name}`;

      const { error } = await supabase.storage
        .from("contracts")
        .upload(fileName, editingContract.newFile);

      if (!error) {
        const { data } = supabase.storage
          .from("contracts")
          .getPublicUrl(fileName);

        fileUrl = data.publicUrl;
      }
    }

    const oldContract =
      contracts.find((contract) => contract.id === editingContract.id) || null;

    const updatePayload = {
      company_name: editingContract.company_name,
      company_voen: editingContract.company_voen || null,
      counterparty: editingContract.counterparty,
      counterparty_voen: editingContract.counterparty_voen || null,
      start_date: editingContract.start_date,
      end_date: editingContract.end_date,
      file_url: fileUrl,
      contract_direction: editingContract.contract_direction || null,
      contract_group: editingContract.contract_group || null,
    };

    const { data: updatedContract, error } = await supabase
      .from("contracts")
      .update(updatePayload)
      .eq("id", editingContract.id)
      .select("*")
      .single();

    if (error) {
      alert("Xəta baş verdi");
      console.error(error);
      return;
    }

    await createAuditLog({
      action: "UPDATE_CONTRACT",
      tableName: "contracts",
      recordId: editingContract.id,
      description: `Şirkət panelində müqavilə yeniləndi: ${
        updatePayload.counterparty || editingContract.id
      }`,
      oldData: oldContract,
      newData: updatedContract || updatePayload,
    });

    alert("Updated");
    setEditingContract(null);
    loadContracts();
  }

  function openEditModal(contract: any) {
    const directionCode =
      contract.contract_direction || contractDirections[0]?.code || "";
    const groupCode =
      contract.contract_group ||
      getGroupsForDirection(directionCode)[0]?.code ||
      "";

    setEditingContract({
      ...contract,
      contract_direction: directionCode,
      contract_group: groupCode,
    });
  }

  useEffect(() => {
    loadContracts();
  }, []);
  function isHttpUrl(value: string) {
    return /^https?:\/\//i.test(value);
  }

  function getContractFilePath(contract: Contract) {
    return contract.generated_file_path || contract.file_url || null;
  }

  function getFileLabel(contract: Contract) {
    const filePath = getContractFilePath(contract);

    if (!filePath) return "Fayl yoxdur";

    const cleanPath = filePath.split("?")[0].toLowerCase();

    if (cleanPath.endsWith(".pdf")) return "PDF bax";
    if (cleanPath.endsWith(".docx")) return "DOCX bax";
    if (cleanPath.endsWith(".doc")) return "DOC bax";

    return "Fayla bax";
  }

  function normalizeContractsStoragePath(value: string) {
    if (!value) return "";

    if (!isHttpUrl(value)) {
      return value.replace(/^\/+/, "");
    }

    try {
      const url = new URL(value);
      const publicMarker = "/storage/v1/object/public/contracts/";
      const signedMarker = "/storage/v1/object/sign/contracts/";

      if (url.pathname.includes(publicMarker)) {
        return decodeURIComponent(url.pathname.split(publicMarker)[1] || "");
      }

      if (url.pathname.includes(signedMarker)) {
        return decodeURIComponent(url.pathname.split(signedMarker)[1] || "");
      }
    } catch {
      return value;
    }

    return value;
  }

  async function openContractFile(contract: Contract) {
    const rawPath = getContractFilePath(contract);

    if (!rawPath) {
      alert("Bu müqaviləyə fayl əlavə edilməyib");
      return;
    }

    if (isHttpUrl(rawPath)) {
      window.open(rawPath, "_blank", "noopener,noreferrer");
      return;
    }

    const storagePath = normalizeContractsStoragePath(rawPath);

    const { data, error } = await supabase.storage
      .from("contracts")
      .createSignedUrl(storagePath, 60 * 10);

    if (error || !data?.signedUrl) {
      console.error(error);
      alert("Fayl açıla bilmədi");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }


  async function deleteContract(id: string) {
    if (!confirm("Silmək istədiyinizə əminsiniz?")) return;

    const oldContract = contracts.find((c) => c.id === id) || null;

    const { error } = await supabase.from("contracts").delete().eq("id", id);

    if (error) {
      alert("Xəta baş verdi");
      console.error(error);
      return;
    }

    await createAuditLog({
      action: "DELETE_CONTRACT",
      tableName: "contracts",
      recordId: id,
      description: `Şirkət panelində müqavilə silindi: ${
        oldContract?.counterparty || id
      }`,
      oldData: oldContract,
      newData: null,
    });

    setContracts((prev) => prev.filter((c) => c.id !== id));
  }

  async function archiveContract(id: string) {
    if (!confirm("Arxivə göndərmək istədiyinizə əminsiniz?")) return;

    const oldContract = contracts.find((c) => c.id === id) || null;

    const { data: updatedContract, error } = await supabase
      .from("contracts")
      .update({ status: "archived" })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      alert("Xəta baş verdi");
      console.error(error);
      return;
    }

    await createAuditLog({
      action: "ARCHIVE_CONTRACT",
      tableName: "contracts",
      recordId: id,
      description: `Şirkət panelində müqavilə arxivə göndərildi: ${
        oldContract?.counterparty || updatedContract?.counterparty || id
      }`,
      oldData: oldContract,
      newData: updatedContract,
    });

    setContracts((prev) => prev.filter((c) => c.id !== id));
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }

  function daysLeft(end: string) {
    const endDate = new Date(end).getTime();
    const today = new Date().getTime();
    const diff = endDate - today;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  function getDirectionLabel(value: string | null) {
    if (!value) return "-";
    return contractDirections.find((d) => d.code === value)?.name || value;
  }

  function getGroupLabel(value: string | null) {
    if (!value) return "-";
    return contractGroups.find((g) => g.code === value)?.name || value;
  }

  function getDirectionByCode(code: string | null) {
    if (!code) return null;
    return contractDirections.find((d) => d.code === code) || null;
  }

  function getGroupsForDirection(directionCode: string | null) {
    const direction = getDirectionByCode(directionCode);
    if (!direction) return [];
    return contractGroups.filter((g) => g.direction_id === direction.id);
  }

  function getColumnValue(contract: Contract, key: keyof Contract) {
    if (key === "contract_direction")
      return getDirectionLabel(contract.contract_direction);
    if (key === "contract_group") return getGroupLabel(contract.contract_group);
    if (key === "start_date" || key === "end_date")
      return formatDate(contract[key]);
    if (key === "auto_renew") return contract.auto_renew ? "Bəli" : "Xeyr";
    if (key === "file_url") return getContractFilePath(contract) ? "Fayl var" : "Fayl yoxdur";

    const value = contract[key];
    return value === null || value === undefined || value === ""
      ? "-"
      : String(value);
  }

  function getAvailableColumnValues(key: keyof Contract) {
    return Array.from(new Set(contracts.map((c) => getColumnValue(c, key))))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "az"));
  }

  function toggleColumnFilter(key: keyof Contract, value: string) {
    setColumnFilters((prev) => {
      const current = prev[key] || [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];

      const next = { ...prev };

      if (updated.length === 0) {
        delete next[key];
      } else {
        next[key] = updated;
      }

      return next;
    });
  }

  function clearColumnFilter(key: keyof Contract) {
    setColumnFilters((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function isColumnFilterActive(key: keyof Contract) {
    return (columnFilters[key] || []).length > 0;
  }

  function applyStatFilter(contract: Contract) {
    if (activeStatFilter === "ALL") return true;
    if (activeStatFilter === "EXPIRING_30") return daysLeft(contract.end_date) <= 30;
    if (activeStatFilter === "CRITICAL") return daysLeft(contract.end_date) <= 7;
    if (activeStatFilter === "AUTO_RENEW") return contract.auto_renew;
    if (activeStatFilter === "PDF") return Boolean(getContractFilePath(contract));

    if (activeStatFilter.startsWith("DIRECTION:")) {
      const directionCode = activeStatFilter.replace("DIRECTION:", "");
      return contract.contract_direction === directionCode;
    }

    return true;
  }
  function applyDateRangeFilter(contract: Contract) {
    if (!dateFrom && !dateTo) return true;

    const contractDate = new Date(`${contract.start_date}T00:00:00`).getTime();

    if (Number.isNaN(contractDate)) return false;

    const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toTime = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null;

    if (fromTime !== null && contractDate < fromTime) return false;
    if (toTime !== null && contractDate > toTime) return false;

    return true;
  }

  function handleStatCardClick(filter: StatFilter) {
    setActiveStatFilter((prev) => (prev === filter ? "ALL" : filter));
    setSelectedCompanies([]);
    setDirectionFilter("ALL");
    setGroupFilter("ALL");
    setColumnFilters({});
    setOpenFilterKey(null);
  }

  const companies = [...new Set(contracts.map((c) => c.company_name))];

  const sortedAndFilteredContracts = useMemo(() => {
    return contracts
      .filter((c) => applyStatFilter(c))
      .filter((c) => applyDateRangeFilter(c))
      .filter((c) => {
        if (selectedCompanies.length === 0) return true;
        return selectedCompanies.includes(c.company_name);
      })
      .filter((c) => {
        if (directionFilter === "ALL") return true;
        return c.contract_direction === directionFilter;
      })
      .filter((c) => {
        if (directionFilter === "ALL" || groupFilter === "ALL") return true;
        return c.contract_group === groupFilter;
      })
      .filter((c) => {
        return Object.entries(columnFilters).every(([key, values]) => {
          if (!values || values.length === 0) return true;
          return values.includes(getColumnValue(c, key as keyof Contract));
        });
      })
      .filter(
        (c) =>
          c.counterparty.toLowerCase().includes(search.toLowerCase()) ||
          c.company_name.toLowerCase().includes(search.toLowerCase()) ||
          (c.company_voen || "").toLowerCase().includes(search.toLowerCase()) ||
          (c.counterparty_voen || "")
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          (c.created_by_name || "")
            .toLowerCase()
            .includes(search.toLowerCase())
      );
  }, [
    contracts,
    selectedCompanies,
    search,
    directionFilter,
    groupFilter,
    columnFilters,
    contractDirections,
    contractGroups,
    activeStatFilter,
    dateFrom,
    dateTo,
  ]);

  const exportToExcel = () => {
    const dataToExport = sortedAndFilteredContracts.map((c) => ({
      Şirkət: c.company_name,
      "Şirkət VÖEN": c.company_voen || "-",
      Müqavilə: c.counterparty,
      "Qarşı tərəf VÖEN": c.counterparty_voen || "-",
      Yaradan: c.created_by_name || "-",
      Bölmə: getDirectionLabel(c.contract_direction),
      Qrup: getGroupLabel(c.contract_group),
      Başlama: formatDate(c.start_date),
      Bitmə: formatDate(c.end_date),
      Yenilənmə: c.auto_renew ? "Bəli" : "Xeyr",
      Sənəd: getContractFilePath(c) ? "Fayl var" : "Fayl yoxdur",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Contracts");
    XLSX.writeFile(workbook, "Sirket_Muqavileleri.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const tableColumn = [
      "Company",
      "Company VOEN",
      "Counterparty",
      "Counterparty VOEN",
      "Created By",
      "Start",
      "End",
      "Renew",
    ];

    const tableRows = sortedAndFilteredContracts.map((c) => [
      c.company_name,
      c.company_voen || "-",
      c.counterparty,
      c.counterparty_voen || "-",
      c.created_by_name || "-",
      formatDate(c.start_date),
      formatDate(c.end_date),
      c.auto_renew ? "Yes" : "No",
    ]);

    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 20 });
    doc.save("Sirket_Muqavileleri.pdf");
  };

  const expiringSoonCount = contracts.filter(
    (c) => daysLeft(c.end_date) <= 30
  ).length;

  const criticalCount = contracts.filter((c) => daysLeft(c.end_date) <= 7)
    .length;

  const autoRenewCount = contracts.filter((c) => c.auto_renew).length;
  const pdfCount = contracts.filter((c) => getContractFilePath(c)).length;
  const directionStats = contractDirections.map((direction) => ({
    ...direction,
    count: contracts.filter((c) => c.contract_direction === direction.code)
      .length,
  }));

  function clearAllFilters() {
    setSelectedCompanies([]);
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setDirectionFilter("ALL");
    setGroupFilter("ALL");
    setColumnFilters({});
    setOpenFilterKey(null);
    setActiveStatFilter("ALL");
  }

  function getActiveStatTitle() {
    if (activeStatFilter === "ALL") return "";
    if (activeStatFilter === "EXPIRING_30") return "30 günə bitən";
    if (activeStatFilter === "CRITICAL") return "Kritik";
    if (activeStatFilter === "AUTO_RENEW") return "Avto yenilənən";
    if (activeStatFilter === "PDF") return "Faylı olan";

    if (activeStatFilter.startsWith("DIRECTION:")) {
      const directionCode = activeStatFilter.replace("DIRECTION:", "");
      return getDirectionLabel(directionCode);
    }

    return "";
  }

  if (loading) {
    return (
      <div style={loadingBox}>
        <div style={loadingCard}>
          <div style={loadingIcon}>📄</div>
          <div style={spinner} />
          <h2 style={loadingTitle}>Müqavilələr yüklənir</h2>
          <p style={loadingText}>
            Şirkət icazələri və aktiv müqavilələr yoxlanılır...
          </p>
        </div>

        <style jsx>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      style={pageStyle}
      onClick={() => {
        setSelectedCompanies([]);
        setOpenFilterKey(null);
      }}
    >
      <section style={heroCard}>
        <div style={heroGlowOne} />
        <div style={heroGlowTwo} />

        <div style={heroContent}>
          <div style={heroLeft}>
            <div style={eyebrow}>
              <span style={eyebrowDot} />
              Şirkət paneli
            </div>

            <h1 style={titleStyle}>Şirkət Müqavilələri</h1>

            <p style={subtitleStyle}>
              Sizə aid şirkətlər üzrə aktiv müqavilələri izləyin, axtarın,
              sıralayın, bölmə və qrup üzrə filter edin, ixrac edin və icazəniz
              varsa redaktə, silmə və arxiv əməliyyatlarını icra edin.
            </p>
          </div>

          <div style={heroActions}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                exportToExcel();
              }}
              type="button"
              style={excelBtnStyle}
            >
              <span style={buttonIcon}>📊</span>
              Excel
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                exportToPDF();
              }}
              type="button"
              style={pdfExportBtnStyle}
            >
              <span style={buttonIcon}>📄</span>
              PDF
            </button>
          </div>
        </div>
      </section>

      <section style={statsGrid} onClick={(e) => e.stopPropagation()}>
        <StatCard
          icon="📁"
          label="Aktiv müqavilələr"
          value={contracts.length}
          hint="Hazırda aktiv siyahıda olan müqavilələr"
          active={activeStatFilter === "ALL"}
          onClick={() => handleStatCardClick("ALL")}
          iconStyle={statIconBlue}
        />

        {directionStats.map((direction) => (
          <StatCard
            key={direction.id}
            icon="🏷️"
            label={direction.name}
            value={direction.count}
            hint="Bu bölməyə aid aktiv müqavilələr"
            active={activeStatFilter === `DIRECTION:${direction.code}`}
            onClick={() => handleStatCardClick(`DIRECTION:${direction.code}`)}
            iconStyle={statIconPurple}
          />
        ))}

        <StatCard
          icon="⏳"
          label="30 günə bitən"
          value={expiringSoonCount}
          hint="Bitmə tarixi yaxın olan müqavilələr"
          active={activeStatFilter === "EXPIRING_30"}
          onClick={() => handleStatCardClick("EXPIRING_30")}
          iconStyle={statIconOrange}
        />

        <StatCard
          icon="⚠️"
          label="Kritik"
          value={criticalCount}
          hint="7 gün və ya daha az qalan müqavilələr"
          active={activeStatFilter === "CRITICAL"}
          onClick={() => handleStatCardClick("CRITICAL")}
          iconStyle={statIconRed}
        />

        <StatCard
          icon="🔁"
          label="Avto yenilənən"
          value={autoRenewCount}
          hint="Avtomatik yenilənmə seçilmiş müqavilələr"
          active={activeStatFilter === "AUTO_RENEW"}
          onClick={() => handleStatCardClick("AUTO_RENEW")}
          iconStyle={statIconGreen}
        />

        <StatCard
          icon="📄"
          label="Faylı olan"
          value={pdfCount}
          hint="Fayl əlavə edilmiş müqavilələr"
          active={activeStatFilter === "PDF"}
          onClick={() => handleStatCardClick("PDF")}
          iconStyle={statIconGray}
        />
      </section>

      <section style={toolbarCard}>
        <div style={toolbarInfo}>
          <h2 style={toolbarTitle}>Filter və axtarış</h2>
          <p style={toolbarText}>
            Şirkət, bölmə, qrup və cədvəl sütunları üzrə Excel tipli filter edə
            bilərsiniz.
          </p>
        </div>

        <div style={toolbarRight}>
          <div style={searchWrap}>
            <span style={searchIcon}>⌕</span>

            <input
              placeholder="Müqavilə, şirkət, VÖEN və ya yaradan üzrə axtar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={searchInputStyle}
            />
          </div>
          <div style={dateFilterWrap} onClick={(e) => e.stopPropagation()}>
            <label style={dateLabel}>
              Başlama
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={dateInputStyle}
              />
            </label>

            <label style={dateLabel}>
              Bitmə
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={dateInputStyle}
              />
            </label>
          </div>


          {(search ||
            dateFrom ||
            dateTo ||
            selectedCompanies.length > 0 ||
            directionFilter !== "ALL" ||
            groupFilter !== "ALL" ||
            activeStatFilter !== "ALL" ||
            Object.keys(columnFilters).length > 0) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearAllFilters();
                }}
                style={clearSearchBtn}
              >
                Təmizlə
              </button>
            )}
        </div>
      </section>

      <section style={directionFilterCard} onClick={(e) => e.stopPropagation()}>
        <div style={filterHeader}>
          <div>
            <h2 style={filterTitle}>Müqavilə bölməsi</h2>
            <p style={filterText}>
              Admin paneldə aktiv olan bölmələr və həmin bölmələrə bağlı
              qruplar burada görünür.
            </p>
          </div>
        </div>

        <div style={filterButtonRow}>
          <button
            type="button"
            onClick={() => {
              setDirectionFilter("ALL");
              setGroupFilter("ALL");
              setActiveStatFilter("ALL");
            }}
            style={{
              ...filterButton,
              ...(directionFilter === "ALL" ? filterButtonActive : {}),
            }}
          >
            Hamısı
          </button>

          {contractDirections.map((direction) => (
            <button
              key={direction.id}
              type="button"
              onClick={() => {
                setDirectionFilter(direction.code);
                setGroupFilter("ALL");
                setActiveStatFilter("ALL");
              }}
              style={{
                ...filterButton,
                ...(directionFilter === direction.code
                  ? filterButtonActive
                  : {}),
              }}
            >
              {direction.name}
            </button>
          ))}
        </div>

        {directionFilter !== "ALL" && (
          <div style={groupFilterBox}>
            <div style={groupFilterTitle}>
              {getDirectionLabel(directionFilter)} müqavilə qrupları
            </div>

            <div style={filterButtonRow}>
              <button
                type="button"
                onClick={() => setGroupFilter("ALL")}
                style={{
                  ...groupButton,
                  ...(groupFilter === "ALL" ? groupButtonActive : {}),
                }}
              >
                Hamısı
              </button>

              {getGroupsForDirection(directionFilter).map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setGroupFilter(group.code)}
                  style={{
                    ...groupButton,
                    ...(groupFilter === group.code ? groupButtonActive : {}),
                  }}
                >
                  {group.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {companies.length > 1 && (
        <section style={companyGrid}>
          {companies.map((company) => {
            const count = contracts.filter(
              (c) => c.company_name === company
            ).length;

            const isActive = selectedCompanies.includes(company);

            return (
              <div
                key={company}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveStatFilter("ALL");

                  setSelectedCompanies((prev) => {
                    if (prev.includes(company)) {
                      return prev.filter((c) => c !== company);
                    } else {
                      return [...prev, company];
                    }
                  });
                }}
                style={{
                  ...companyCardBase,
                  ...(isActive ? companyCardActive : companyCardInactive),
                }}
              >
                <div style={companyCardTop}>
                  <span style={companyAvatar}>
                    {company.trim().slice(0, 1).toUpperCase()}
                  </span>

                  <span style={isActive ? selectedPill : normalPill}>
                    {isActive ? "Seçildi" : "Şirkət"}
                  </span>
                </div>

                <h3 style={companyName}>{company}</h3>

                <div style={companyFooter}>
                  <span style={companyCount}>{count}</span>
                  <span style={companyCountLabel}>müqavilə</span>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section style={contentContainerStyle}>
        <div style={tableHeader}>
          <div>
            <h2 style={tableTitle}>
              {activeStatFilter !== "ALL"
                ? `${getActiveStatTitle()} müqavilələri`
                : directionFilter !== "ALL"
                  ? groupFilter === "ALL"
                    ? `${getDirectionLabel(directionFilter)} müqavilələr`
                    : `${getDirectionLabel(directionFilter)} / ${getGroupLabel(
                      groupFilter
                    )}`
                  : selectedCompanies.length > 0
                    ? `Seçilmiş şirkətlər (${selectedCompanies.length})`
                    : "Bütün müqavilələr"}
            </h2>

            <p style={tableSubtitle}>
              Göstərilən nəticə: {sortedAndFilteredContracts.length} /{" "}
              {contracts.length} · Faylı olan: {pdfCount}
            </p>
          </div>

          {(selectedCompanies.length > 0 ||
            dateFrom ||
            dateTo ||
            directionFilter !== "ALL" ||
            groupFilter !== "ALL" ||
            activeStatFilter !== "ALL" ||
            Object.keys(columnFilters).length > 0) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearAllFilters();
                }}
                style={clearFilterBtn}
              >
                Filteri təmizlə
              </button>
            )}
        </div>

        {sortedAndFilteredContracts.length === 0 ? (
          <div style={emptyCard}>
            <div style={emptyIcon}>📭</div>
            <h3 style={emptyTitle}>Müqavilə tapılmadı</h3>
            <p style={emptyText}>
              Axtarış sözünü dəyişin və ya filterləri təmizləyərək yenidən
              yoxlayın.
            </p>
          </div>
        ) : (
          <>
            <div className="desktop-table" style={tableWrap}>
              <table style={tableStyle}>
                <thead>
                  <tr style={theadRow}>
                    <FilterTh
                      label="Şirkət"
                      columnKey="company_name"
                      openFilterKey={openFilterKey}
                      setOpenFilterKey={setOpenFilterKey}
                      values={getAvailableColumnValues("company_name")}
                      selectedValues={columnFilters.company_name || []}
                      onToggle={toggleColumnFilter}
                      onClear={clearColumnFilter}
                      active={isColumnFilterActive("company_name")}
                    />

                    <FilterTh
                      label="Şirkət VÖEN"
                      columnKey="company_voen"
                      openFilterKey={openFilterKey}
                      setOpenFilterKey={setOpenFilterKey}
                      values={getAvailableColumnValues("company_voen")}
                      selectedValues={columnFilters.company_voen || []}
                      onToggle={toggleColumnFilter}
                      onClear={clearColumnFilter}
                      active={isColumnFilterActive("company_voen")}
                    />

                    <FilterTh
                      label="Müqavilə"
                      columnKey="counterparty"
                      openFilterKey={openFilterKey}
                      setOpenFilterKey={setOpenFilterKey}
                      values={getAvailableColumnValues("counterparty")}
                      selectedValues={columnFilters.counterparty || []}
                      onToggle={toggleColumnFilter}
                      onClear={clearColumnFilter}
                      active={isColumnFilterActive("counterparty")}
                    />

                    <FilterTh
                      label="Qarşı VÖEN"
                      columnKey="counterparty_voen"
                      openFilterKey={openFilterKey}
                      setOpenFilterKey={setOpenFilterKey}
                      values={getAvailableColumnValues("counterparty_voen")}
                      selectedValues={columnFilters.counterparty_voen || []}
                      onToggle={toggleColumnFilter}
                      onClear={clearColumnFilter}
                      active={isColumnFilterActive("counterparty_voen")}
                    />

                    <FilterTh
                      label="Yaradan"
                      columnKey="created_by_name"
                      openFilterKey={openFilterKey}
                      setOpenFilterKey={setOpenFilterKey}
                      values={getAvailableColumnValues("created_by_name")}
                      selectedValues={columnFilters.created_by_name || []}
                      onToggle={toggleColumnFilter}
                      onClear={clearColumnFilter}
                      active={isColumnFilterActive("created_by_name")}
                    />

                    <FilterTh
                      label="Başlama"
                      columnKey="start_date"
                      openFilterKey={openFilterKey}
                      setOpenFilterKey={setOpenFilterKey}
                      values={getAvailableColumnValues("start_date")}
                      selectedValues={columnFilters.start_date || []}
                      onToggle={toggleColumnFilter}
                      onClear={clearColumnFilter}
                      active={isColumnFilterActive("start_date")}
                    />

                    <FilterTh
                      label="Bitmə"
                      columnKey="end_date"
                      openFilterKey={openFilterKey}
                      setOpenFilterKey={setOpenFilterKey}
                      values={getAvailableColumnValues("end_date")}
                      selectedValues={columnFilters.end_date || []}
                      onToggle={toggleColumnFilter}
                      onClear={clearColumnFilter}
                      active={isColumnFilterActive("end_date")}
                    />

                    <th style={thStyle}>Status</th>

                    <FilterTh
                      label="Yeniləmə"
                      columnKey="auto_renew"
                      openFilterKey={openFilterKey}
                      setOpenFilterKey={setOpenFilterKey}
                      values={getAvailableColumnValues("auto_renew")}
                      selectedValues={columnFilters.auto_renew || []}
                      onToggle={toggleColumnFilter}
                      onClear={clearColumnFilter}
                      active={isColumnFilterActive("auto_renew")}
                    />

                    <FilterTh
                      label="Sənəd"
                      columnKey="file_url"
                      openFilterKey={openFilterKey}
                      setOpenFilterKey={setOpenFilterKey}
                      values={getAvailableColumnValues("file_url")}
                      selectedValues={columnFilters.file_url || []}
                      onToggle={toggleColumnFilter}
                      onClear={clearColumnFilter}
                      active={isColumnFilterActive("file_url")}
                    />

                    <th style={thStyle}>Əməliyyatlar</th>
                  </tr>
                </thead>

                <tbody>
                  {sortedAndFilteredContracts.map((c) => {
                    const canDelete = permissions.some(
                      (p) => p.company_id === c.company_id && p.can_delete
                    );

                    const canArchive = permissions.some(
                      (p) => p.company_id === c.company_id && p.can_archive
                    );

                    const canEdit = permissions.some(
                      (p) => p.company_id === c.company_id && p.can_edit
                    );

                    const days = daysLeft(c.end_date);

                    return (
                      <tr key={c.id} style={rowStyle}>
                        <td style={tdStyle}>
                          <div style={companyCell}>
                            <span style={miniCompanyAvatar}>
                              {c.company_name.trim().slice(0, 1).toUpperCase()}
                            </span>
                            <span style={strongText}>{c.company_name}</span>
                          </div>
                        </td>

                        <td style={tdStyle}>
                          <span style={counterpartyText}>
                            {c.company_voen || "-"}
                          </span>
                        </td>

                        <td style={tdStyle}>
                          <span style={counterpartyText}>{c.counterparty}</span>
                        </td>

                        <td style={tdStyle}>
                          <span style={counterpartyText}>
                            {c.counterparty_voen || "-"}
                          </span>
                        </td>

                        <td style={tdStyle}>
                          <span style={counterpartyText}>
                            {c.created_by_name || "-"}
                          </span>
                        </td>

                        <td style={tdStyle}>
                          <span style={datePill}>
                            {formatDate(c.start_date)}
                          </span>
                        </td>

                        <td style={tdStyle}>
                          <span style={datePill}>{formatDate(c.end_date)}</span>
                        </td>

                        <td style={tdStyle}>{expiryBadge(days)}</td>

                        <td style={tdStyle}>
                          {c.auto_renew ? (
                            <span style={renewBadge}>🔄 Yeniləmə</span>
                          ) : (
                            <span style={noRenewBadge}>
                              ⛔ Yeniləmə yoxdur
                            </span>
                          )}
                        </td>

                        <td style={tdStyle}>
                          {getContractFilePath(c) ? (
                            <button
                              type="button"
                              onClick={() => openContractFile(c)}
                              style={pdfBtn}
                            >
                              {getFileLabel(c)}
                            </button>
                          ) : (
                            <span style={noPdfBadge}>N/A</span>
                          )}
                        </td>

                        <td style={tdStyle}>
                          <div style={actionGroup}>
                            {canArchive && (
                              <button
                                onClick={() => archiveContract(c.id)}
                                style={archiveBtn}
                                type="button"
                              >
                                Arxiv
                              </button>
                            )}

                            {canDelete && (
                              <button
                                onClick={() => deleteContract(c.id)}
                                style={deleteBtn}
                                type="button"
                              >
                                Sil
                              </button>
                            )}

                            {canEdit && (
                              <button
                                onClick={() => openEditModal(c)}
                                style={editBtn}
                                type="button"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mobile-cards" style={mobileGrid}>
              {sortedAndFilteredContracts.map((c) => {
                const days = daysLeft(c.end_date);

                return (
                  <div key={c.id} style={mobileContractCard}>
                    <div style={mobileTop}>
                      <div style={mobileCompanyWrap}>
                        <span style={mobileCompanyAvatar}>
                          {c.company_name.trim().slice(0, 1).toUpperCase()}
                        </span>

                        <div>
                          <span style={mobileCompanyName}>
                            {c.company_name} · VÖEN: {c.company_voen || "-"}
                          </span>
                          <h3 style={mobileContractTitle}>{c.counterparty}</h3>
                          <p style={mobileSmallText}>
                            Qarşı VÖEN: {c.counterparty_voen || "-"}
                          </p>
                          <p style={mobileSmallText}>
                            Yaradan: {c.created_by_name || "-"}
                          </p>
                        </div>
                      </div>

                      {expiryBadge(days)}
                    </div>

                    <div style={mobileMetaRow}>
                      <span style={mobileMetaPill}>
                        {getDirectionLabel(c.contract_direction)}
                      </span>

                      {c.contract_group && (
                        <span style={mobileMetaPill}>
                          {getGroupLabel(c.contract_group)}
                        </span>
                      )}
                    </div>

                    <div style={mobileInfoRow}>
                      <div style={mobileInfoBox}>
                        <p style={mobileLabel}>Start Date</p>
                        <p style={mobileValue}>{formatDate(c.start_date)}</p>
                      </div>

                      <div style={mobileInfoBox}>
                        <p style={mobileLabel}>End Date</p>
                        <p style={mobileValue}>{formatDate(c.end_date)}</p>
                      </div>
                    </div>

                    <div style={mobileFooter}>
                      <div>
                        {c.auto_renew ? (
                          <span style={renewBadge}>
                            🔄 Avtomatik Yeniləmə
                          </span>
                        ) : (
                          <span style={noRenewBadge}>⛔ Manual</span>
                        )}
                      </div>

                      {getContractFilePath(c) && (
                        <button
                          type="button"
                          onClick={() => openContractFile(c)}
                          style={pdfBtn}
                        >
                          {getFileLabel(c)}
                        </button>
                      )}
                    </div>

                    <div style={mobileActions}>
                      {permissions.some(
                        (p) => p.company_id === c.company_id && p.can_delete
                      ) && (
                          <button
                            onClick={() => deleteContract(c.id)}
                            style={deleteBtn}
                            type="button"
                          >
                            Sil
                          </button>
                        )}

                      {permissions.some(
                        (p) => p.company_id === c.company_id && p.can_archive
                      ) && (
                          <button
                            onClick={() => archiveContract(c.id)}
                            style={archiveBtn}
                            type="button"
                          >
                            Arxiv
                          </button>
                        )}

                      {permissions.some(
                        (p) => p.company_id === c.company_id && p.can_edit
                      ) && (
                          <button
                            onClick={() => openEditModal(c)}
                            style={editBtn}
                            type="button"
                          >
                            Edit
                          </button>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      <style jsx>{`
        @media (max-width: 900px) {
          .desktop-table {
            display: none !important;
          }

          .mobile-cards {
            display: grid !important;
          }
        }

        @media (min-width: 901px) {
          .mobile-cards {
            display: none !important;
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>

      {editingContract && (
        <div style={modalOverlay}>
          <div style={modalCard}>
            <div style={modalHeader}>
              <div>
                <div style={modalEyebrow}>
                  <span style={modalEyebrowDot} />
                  Redaktə
                </div>

                <h3 style={modalTitle}>Edit Contract</h3>

                <p style={modalSubtitle}>
                  Müqavilə məlumatlarını yeniləyin və lazım olduqda yeni fayl
                  əlavə edin.
                </p>
              </div>

              <button
                onClick={() => setEditingContract(null)}
                style={modalCloseBtn}
                type="button"
                aria-label="Bağla"
              >
                ×
              </button>
            </div>

            <div style={modalForm}>
              <div style={modalField}>
                <label style={modalLabel}>Şirkət</label>

                <select
                  value={editingContract.company_name}
                  onChange={(e) =>
                    setEditingContract({
                      ...editingContract,
                      company_name: e.target.value,
                    })
                  }
                  style={inputStyle}
                >
                  {companies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div style={modalField}>
                <label style={modalLabel}>Şirkət VÖEN</label>

                <input
                  value={editingContract.company_voen || ""}
                  onChange={(e) =>
                    setEditingContract({
                      ...editingContract,
                      company_voen: e.target.value,
                    })
                  }
                  placeholder="Şirkət VÖEN"
                  style={inputStyle}
                />
              </div>

              <div style={modalField}>
                <label style={modalLabel}>Counterparty</label>

                <input
                  value={editingContract.counterparty}
                  onChange={(e) =>
                    setEditingContract({
                      ...editingContract,
                      counterparty: e.target.value,
                    })
                  }
                  placeholder="Counterparty"
                  style={inputStyle}
                />
              </div>

              <div style={modalField}>
                <label style={modalLabel}>Qarşı tərəf VÖEN</label>

                <input
                  value={editingContract.counterparty_voen || ""}
                  onChange={(e) =>
                    setEditingContract({
                      ...editingContract,
                      counterparty_voen: e.target.value,
                    })
                  }
                  placeholder="Qarşı tərəf VÖEN"
                  style={inputStyle}
                />
              </div>

              <div style={modalField}>
                <label style={modalLabel}>Müqavilə bölməsi</label>

                <select
                  value={editingContract.contract_direction || ""}
                  onChange={(e) => {
                    const newDirectionCode = e.target.value;
                    const firstGroup = getGroupsForDirection(newDirectionCode)[0];

                    setEditingContract({
                      ...editingContract,
                      contract_direction: newDirectionCode,
                      contract_group: firstGroup?.code || "",
                    });
                  }}
                  style={inputStyle}
                >
                  {contractDirections.map((direction) => (
                    <option key={direction.id} value={direction.code}>
                      {direction.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={modalField}>
                <label style={modalLabel}>Müqavilə qrupu</label>

                <select
                  value={editingContract.contract_group || ""}
                  onChange={(e) =>
                    setEditingContract({
                      ...editingContract,
                      contract_group: e.target.value,
                    })
                  }
                  style={inputStyle}
                  disabled={
                    getGroupsForDirection(editingContract.contract_direction)
                      .length === 0
                  }
                >
                  {getGroupsForDirection(editingContract.contract_direction)
                    .length === 0 ? (
                    <option value="">Bu bölmədə aktiv qrup yoxdur</option>
                  ) : (
                    getGroupsForDirection(
                      editingContract.contract_direction
                    ).map((group) => (
                      <option key={group.id} value={group.code}>
                        {group.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div style={modalField}>
                <label style={modalLabel}>Başlama tarixi</label>

                <input
                  type="date"
                  value={editingContract.start_date}
                  onChange={(e) =>
                    setEditingContract({
                      ...editingContract,
                      start_date: e.target.value,
                    })
                  }
                  style={inputStyle}
                />
              </div>

              <div style={modalField}>
                <label style={modalLabel}>Bitmə tarixi</label>

                <input
                  type="date"
                  value={editingContract.end_date}
                  onChange={(e) =>
                    setEditingContract({
                      ...editingContract,
                      end_date: e.target.value,
                    })
                  }
                  style={inputStyle}
                />
              </div>

              <div style={modalField}>
                <label style={modalLabel}>Fayl</label>

                <label style={modalFileBox}>
                  <span style={modalFileIcon}>📎</span>

                  <span style={modalFileContent}>
                    <strong style={modalFileTitle}>
                      {editingContract.newFile
                        ? editingContract.newFile.name
                        : "Yeni fayl seç"}
                    </strong>

                    <span style={modalFileText}>
                      Yeni fayl seçilərsə, mövcud fayl linki yenilənəcək.
                    </span>
                  </span>

                  <input
                    type="file"
                    onChange={(e) =>
                      setEditingContract({
                        ...editingContract,
                        newFile: e.target.files?.[0],
                      })
                    }
                    style={{ display: "none" }}
                  />
                </label>
              </div>
            </div>

            <div style={modalActions}>
              <button onClick={updateContract} style={saveBtn} type="button">
                Save
              </button>

              <button
                onClick={() => setEditingContract(null)}
                style={cancelBtn}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type StatCardProps = {
  icon: string;
  label: string;
  value: string | number;
  hint: string;
  active: boolean;
  onClick: () => void;
  iconStyle: CSSProperties;
};

function StatCard({
  icon,
  label,
  value,
  hint,
  active,
  onClick,
  iconStyle,
}: StatCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...statCardButton,
        ...(active ? statCardButtonActive : {}),
      }}
    >
      <div style={statTop}>
        <span style={iconStyle}>{icon}</span>
        <span style={statLabel}>{label}</span>
      </div>

      <strong style={statValue}>{value}</strong>
      <span style={statHint}>{hint}</span>
    </button>
  );
}

type FilterThProps = {
  label: string;
  columnKey: keyof Contract;
  openFilterKey: keyof Contract | null;
  setOpenFilterKey: (key: keyof Contract | null) => void;
  values: string[];
  selectedValues: string[];
  active: boolean;
  onToggle: (key: keyof Contract, value: string) => void;
  onClear: (key: keyof Contract) => void;
};

function FilterTh({
  label,
  columnKey,
  openFilterKey,
  setOpenFilterKey,
  values,
  selectedValues,
  active,
  onToggle,
  onClear,
}: FilterThProps) {
  const isOpen = openFilterKey === columnKey;

  return (
    <th style={thStyle}>
      <div style={filterThWrap}>
        <button
          type="button"
          style={{
            ...filterThButton,
            ...(active ? filterThButtonActive : {}),
          }}
          onClick={(e) => {
            e.stopPropagation();
            setOpenFilterKey(isOpen ? null : columnKey);
          }}
        >
          <span>{label}</span>
          <span style={filterIcon}>{active ? "●" : "▾"}</span>
        </button>

        {isOpen && (
          <div style={filterDropdown} onClick={(e) => e.stopPropagation()}>
            <div style={filterDropdownHeader}>
              <strong style={filterDropdownTitle}>{label} filteri</strong>

              <button
                type="button"
                style={filterClearSmall}
                onClick={() => onClear(columnKey)}
              >
                Təmizlə
              </button>
            </div>

            <div style={filterOptions}>
              {values.length === 0 ? (
                <div style={filterEmpty}>Dəyər yoxdur</div>
              ) : (
                values.map((value) => (
                  <label key={value} style={filterOption}>
                    <input
                      type="checkbox"
                      checked={selectedValues.includes(value)}
                      onChange={() => onToggle(columnKey, value)}
                      style={filterCheckbox}
                    />
                    <span style={filterOptionText}>{value}</span>
                  </label>
                ))
              )}
            </div>

            <div style={filterDropdownFooter}>
              Seçilmiş: {selectedValues.length || "hamısı"}
            </div>
          </div>
        )}
      </div>
    </th>
  );
}

function expiryBadge(days: number) {
  if (days <= 7) return <span style={dangerBadge}>7 Gün</span>;
  if (days <= 30) return <span style={warningBadge}>30 GÜN</span>;
  return <span style={safeBadge}>Aktiv</span>;
}

/* ====== STYLES ====== */

const pageStyle: CSSProperties = {
  width: "100%",
  minHeight: "calc(100vh - 120px)",
};

const heroCard: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  borderRadius: 28,
  padding: "28px clamp(20px, 4vw, 34px)",
  marginBottom: 20,
  background:
    "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,64,105,0.96) 52%, rgba(8,47,73,0.98))",
  border: "1px solid rgba(148, 163, 184, 0.18)",
  boxShadow: "0 24px 80px rgba(15, 23, 42, 0.24)",
  color: "#fff",
};

const heroGlowOne: CSSProperties = {
  position: "absolute",
  width: 260,
  height: 260,
  borderRadius: "50%",
  right: -70,
  top: -90,
  background: "rgba(56,189,248,0.28)",
  filter: "blur(8px)",
};

const heroGlowTwo: CSSProperties = {
  position: "absolute",
  width: 220,
  height: 220,
  borderRadius: "50%",
  left: "35%",
  bottom: -150,
  background: "rgba(99,102,241,0.24)",
  filter: "blur(10px)",
};

const heroContent: CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 22,
  flexWrap: "wrap",
};

const heroLeft: CSSProperties = {
  minWidth: 260,
  flex: "1 1 520px",
};

const eyebrow: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 9,
  padding: "7px 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.09)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#dbeafe",
  fontSize: 13,
  fontWeight: 800,
  marginBottom: 14,
};

const eyebrowDot: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "#38bdf8",
  boxShadow: "0 0 0 5px rgba(56,189,248,0.15)",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "clamp(28px, 4vw, 42px)",
  lineHeight: 1.08,
  letterSpacing: "-0.055em",
  fontWeight: 950,
};

const subtitleStyle: CSSProperties = {
  margin: "14px 0 0",
  maxWidth: 760,
  color: "#cbd5e1",
  fontSize: 15,
  lineHeight: 1.7,
};

const heroActions: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 12,
  flexWrap: "wrap",
};

const buttonIcon: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const excelBtnStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  background: "linear-gradient(135deg, #107c41, #059669)",
  color: "white",
  padding: "12px 16px",
  borderRadius: 15,
  border: "1px solid rgba(255,255,255,0.16)",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 900,
  boxShadow: "0 16px 34px rgba(16,185,129,0.26)",
};

const pdfExportBtnStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  background: "linear-gradient(135deg, #e11d48, #be123c)",
  color: "white",
  padding: "12px 16px",
  borderRadius: 15,
  border: "1px solid rgba(255,255,255,0.16)",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 900,
  boxShadow: "0 16px 34px rgba(225,29,72,0.24)",
};

const statsGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 14,
  marginBottom: 20,
};

const statCard: CSSProperties = {
  background: "rgba(255,255,255,0.88)",
  border: "1px solid rgba(203,213,225,0.86)",
  boxShadow: "0 18px 45px rgba(15,23,42,0.08)",
  borderRadius: 22,
  padding: 18,
  backdropFilter: "blur(12px)",
};

const statCardButton: CSSProperties = {
  ...statCard,
  width: "100%",
  textAlign: "left",
  cursor: "pointer",
  transition: "0.2s",
};

const statCardButtonActive: CSSProperties = {
  border: "1px solid rgba(37,99,235,0.45)",
  boxShadow: "0 22px 52px rgba(37,99,235,0.18)",
  transform: "translateY(-2px)",
};

const statTop: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 14,
};

const statLabel: CSSProperties = {
  color: "#475569",
  fontSize: 13,
  fontWeight: 850,
};

const statValue: CSSProperties = {
  display: "block",
  color: "#0f172a",
  fontSize: 34,
  lineHeight: 1,
  letterSpacing: "-0.05em",
  fontWeight: 950,
  marginBottom: 8,
};

const statHint: CSSProperties = {
  display: "block",
  color: "#64748b",
  fontSize: 12,
  lineHeight: 1.45,
};

const statIconBlue: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 14,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#dbeafe",
};

const statIconOrange: CSSProperties = {
  ...statIconBlue,
  background: "#ffedd5",
};

const statIconRed: CSSProperties = {
  ...statIconBlue,
  background: "#fee2e2",
};

const statIconGreen: CSSProperties = {
  ...statIconBlue,
  background: "#dcfce7",
};

const statIconPurple: CSSProperties = {
  ...statIconBlue,
  background: "#ede9fe",
};

const statIconGray: CSSProperties = {
  ...statIconBlue,
  background: "#f1f5f9",
};

const toolbarCard: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 18,
  flexWrap: "wrap",
  marginBottom: 18,
  padding: 18,
  borderRadius: 22,
  background: "rgba(255,255,255,0.88)",
  border: "1px solid rgba(203,213,225,0.86)",
  boxShadow: "0 18px 45px rgba(15,23,42,0.07)",
  backdropFilter: "blur(12px)",
};

const toolbarInfo: CSSProperties = {
  minWidth: 240,
  flex: "1 1 340px",
};

const toolbarTitle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: 18,
  fontWeight: 950,
  letterSpacing: "-0.035em",
};

const toolbarText: CSSProperties = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: 13,
  lineHeight: 1.5,
};

const toolbarRight: CSSProperties = {
  // display: "flex",
  alignItems: "center",
  gap: 10,
  flex: "1 1 420px",
  flexWrap: "wrap",
  minWidth: 0,
};

const searchWrap: CSSProperties = {
  flex: "1 1 260px",
  minWidth: 0,
  position: "relative",
};

const searchIcon: CSSProperties = {
  position: "absolute",
  left: 15,
  top: "50%",
  transform: "translateY(-50%)",
  color: "#64748b",
  fontSize: 19,
  pointerEvents: "none",
};

const searchInputStyle: CSSProperties = {
  width: "100%",
  padding: "14px 16px 14px 44px",
  borderRadius: 16,
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#0f172a",
  fontSize: 14,
  outline: "none",
  boxShadow: "inset 0 1px 0 rgba(15,23,42,0.03)",
};

const clearSearchBtn: CSSProperties = {
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#334155",
  padding: "13px 14px",
  borderRadius: 15,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 850,
  whiteSpace: "nowrap",
};

const directionFilterCard: CSSProperties = {
  marginBottom: 18,
  padding: 18,
  borderRadius: 22,
  background: "rgba(255,255,255,0.9)",
  border: "1px solid rgba(203,213,225,0.86)",
  boxShadow: "0 18px 45px rgba(15,23,42,0.07)",
};

const filterHeader: CSSProperties = {
  marginBottom: 13,
};

const filterTitle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: 18,
  fontWeight: 950,
};

const filterText: CSSProperties = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: 13,
};

const filterButtonRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 9,
};

const filterButton: CSSProperties = {
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#334155",
  padding: "10px 13px",
  borderRadius: 14,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 900,
};

const filterButtonActive: CSSProperties = {
  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
  border: "1px solid rgba(255,255,255,0.25)",
  color: "#fff",
  boxShadow: "0 12px 26px rgba(37,99,235,0.25)",
};

const groupFilterBox: CSSProperties = {
  marginTop: 14,
  paddingTop: 14,
  borderTop: "1px solid #e2e8f0",
};

const groupFilterTitle: CSSProperties = {
  color: "#334155",
  fontSize: 13,
  fontWeight: 950,
  marginBottom: 10,
};

const groupButton: CSSProperties = {
  ...filterButton,
  background: "#f8fafc",
};

const groupButtonActive: CSSProperties = {
  ...filterButtonActive,
};

const companyGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: 16,
  marginBottom: 20,
};

const companyCardBase: CSSProperties = {
  padding: 18,
  borderRadius: 22,
  cursor: "pointer",
  transition: "all 0.25s ease",
  minHeight: 150,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
};

const companyCardActive: CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(37,99,235,0.98), rgba(79,70,229,0.98))",
  border: "1px solid rgba(255,255,255,0.35)",
  boxShadow: "0 22px 48px rgba(37,99,235,0.30)",
  transform: "translateY(-3px)",
  color: "#fff",
};

const companyCardInactive: CSSProperties = {
  background: "rgba(255,255,255,0.88)",
  border: "1px solid rgba(203,213,225,0.92)",
  boxShadow: "0 18px 44px rgba(15,23,42,0.07)",
  color: "#0f172a",
};

const companyCardTop: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  marginBottom: 16,
};

const companyAvatar: CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 16,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(15,23,42,0.08)",
  color: "inherit",
  fontWeight: 950,
};

const selectedPill: CSSProperties = {
  padding: "6px 10px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.18)",
  color: "#fff",
  fontSize: 12,
  fontWeight: 900,
};

const normalPill: CSSProperties = {
  padding: "6px 10px",
  borderRadius: 999,
  background: "#f1f5f9",
  color: "#475569",
  fontSize: 12,
  fontWeight: 900,
};

const companyName: CSSProperties = {
  margin: 0,
  color: "inherit",
  fontSize: 16,
  lineHeight: 1.35,
  fontWeight: 900,
  letterSpacing: "-0.02em",
};

const companyFooter: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 7,
  marginTop: 14,
};

const companyCount: CSSProperties = {
  fontSize: 28,
  lineHeight: 1,
  fontWeight: 950,
  letterSpacing: "-0.05em",
};

const companyCountLabel: CSSProperties = {
  fontSize: 13,
  opacity: 0.78,
  fontWeight: 700,
};

const contentContainerStyle: CSSProperties = {
  background: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(203,213,225,0.9)",
  boxShadow: "0 24px 70px rgba(15,23,42,0.09)",
  padding: 18,
  borderRadius: 26,
  backdropFilter: "blur(14px)",
};

const tableHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
  flexWrap: "wrap",
  padding: "2px 2px 16px",
};

const tableTitle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: 21,
  fontWeight: 950,
  letterSpacing: "-0.04em",
};

const tableSubtitle: CSSProperties = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: 13,
};

const clearFilterBtn: CSSProperties = {
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#334155",
  padding: "10px 13px",
  borderRadius: 14,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 850,
};

const tableWrap: CSSProperties = {
  width: "100%",
  overflowX: "auto",
  borderRadius: 18,
  border: "1px solid #e2e8f0",
  background: "#fff",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  minWidth: 1500,
  background: "#fff",
};

const theadRow: CSSProperties = {
  background: "#f8fafc",
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "14px",
  color: "#475569",
  fontSize: 12,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  borderBottom: "1px solid #e2e8f0",
  whiteSpace: "nowrap",
};

const rowStyle: CSSProperties = {
  transition: "0.2s",
};

const tdStyle: CSSProperties = {
  padding: "14px",
  color: "#0f172a",
  fontSize: 14,
  borderBottom: "1px solid #eef2f7",
  verticalAlign: "middle",
};

const companyCell: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  minWidth: 210,
};

const miniCompanyAvatar: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 13,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#e0f2fe",
  color: "#0369a1",
  fontWeight: 950,
  flexShrink: 0,
};

const strongText: CSSProperties = {
  fontWeight: 850,
  color: "#0f172a",
};

const counterpartyText: CSSProperties = {
  color: "#334155",
  fontWeight: 750,
};

const datePill: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "7px 10px",
  borderRadius: 999,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#334155",
  fontSize: 13,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const renewBadge: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#dcfce7",
  border: "1px solid #bbf7d0",
  padding: "6px 11px",
  borderRadius: 999,
  fontSize: 12,
  color: "#166534",
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const noRenewBadge: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f1f5f9",
  border: "1px solid #cbd5e1",
  padding: "6px 11px",
  borderRadius: 999,
  fontSize: 12,
  color: "#475569",
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const safeBadge: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#dcfce7",
  border: "1px solid #bbf7d0",
  padding: "6px 11px",
  borderRadius: 999,
  fontSize: 12,
  color: "#166534",
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const warningBadge: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#ffedd5",
  border: "1px solid #fed7aa",
  padding: "6px 11px",
  borderRadius: 999,
  fontSize: 12,
  color: "#9a3412",
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const dangerBadge: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#fee2e2",
  border: "1px solid #fecaca",
  padding: "6px 11px",
  borderRadius: 999,
  fontSize: 12,
  color: "#991b1b",
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const noPdfBadge: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "7px 10px",
  borderRadius: 999,
  background: "#f1f5f9",
  color: "#64748b",
  fontSize: 12,
  fontWeight: 850,
  whiteSpace: "nowrap",
};

const pdfBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(135deg, #3b82f6, #2563eb)",
  color: "white",
  padding: "8px 12px",
  borderRadius: 12,
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 900,
  boxShadow: "0 10px 22px rgba(37,99,235,0.22)",
  whiteSpace: "nowrap",
  border: "none",
  cursor: "pointer",
};

const actionGroup: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  flexWrap: "wrap",
};

const archiveBtn: CSSProperties = {
  background: "linear-gradient(135deg, #f59e0b, #d97706)",
  color: "white",
  padding: "8px 11px",
  borderRadius: 12,
  fontSize: 12,
  fontWeight: 900,
  border: "none",
  cursor: "pointer",
  boxShadow: "0 10px 20px rgba(245,158,11,0.20)",
};

const deleteBtn: CSSProperties = {
  background: "linear-gradient(135deg, #dc2626, #b91c1c)",
  color: "white",
  padding: "8px 11px",
  borderRadius: 12,
  fontSize: 12,
  fontWeight: 900,
  border: "none",
  cursor: "pointer",
  boxShadow: "0 10px 20px rgba(220,38,38,0.20)",
};

const editBtn: CSSProperties = {
  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
  color: "white",
  padding: "8px 11px",
  borderRadius: 12,
  fontSize: 12,
  fontWeight: 900,
  border: "none",
  cursor: "pointer",
  boxShadow: "0 10px 20px rgba(37,99,235,0.20)",
};

const emptyCard: CSSProperties = {
  padding: "46px 20px",
  borderRadius: 20,
  background: "#f8fafc",
  border: "1px dashed #cbd5e1",
  textAlign: "center",
};

const emptyIcon: CSSProperties = {
  width: 58,
  height: 58,
  margin: "0 auto 14px",
  borderRadius: 20,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f1f5f9",
  fontSize: 28,
};

const emptyTitle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: 18,
  fontWeight: 950,
  letterSpacing: "-0.03em",
};

const emptyText: CSSProperties = {
  margin: "8px auto 0",
  maxWidth: 440,
  color: "#64748b",
  fontSize: 14,
  lineHeight: 1.55,
};

const mobileGrid: CSSProperties = {
  gap: 16,
  gridTemplateColumns: "1fr",
};

const mobileContractCard: CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 20,
  padding: 16,
  boxShadow: "0 14px 36px rgba(15,23,42,0.07)",
};

const mobileTop: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 14,
};

const mobileCompanyWrap: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  minWidth: 0,
};

const mobileCompanyAvatar: CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 14,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#e0f2fe",
  color: "#0369a1",
  fontWeight: 950,
  flexShrink: 0,
};

const mobileCompanyName: CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "#2563eb",
  fontWeight: 900,
  marginBottom: 4,
};

const mobileContractTitle: CSSProperties = {
  margin: 0,
  fontSize: 16,
  color: "#0f172a",
  fontWeight: 950,
  lineHeight: 1.35,
  letterSpacing: "-0.025em",
};

const mobileSmallText: CSSProperties = {
  margin: "4px 0 0",
  color: "#64748b",
  fontSize: 12,
  fontWeight: 750,
};

const mobileMetaRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
  marginBottom: 12,
};

const mobileMetaPill: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: 999,
  background: "#eff6ff",
  color: "#1d4ed8",
  fontSize: 12,
  fontWeight: 950,
};

const mobileInfoRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  marginTop: 10,
};

const mobileInfoBox: CSSProperties = {
  padding: 12,
  borderRadius: 16,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const mobileLabel: CSSProperties = {
  fontSize: 11,
  color: "#64748b",
  margin: 0,
  fontWeight: 850,
};

const mobileValue: CSSProperties = {
  fontSize: 13,
  color: "#0f172a",
  margin: "4px 0 0 0",
  fontWeight: 900,
};

const mobileFooter: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  marginTop: 15,
  paddingTop: 15,
  borderTop: "1px solid #e2e8f0",
  flexWrap: "wrap",
};

const mobileActions: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginTop: 12,
  flexWrap: "wrap",
};

const modalOverlay: CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(15,23,42,0.72)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 999,
  padding: 18,
  backdropFilter: "blur(10px)",
};

const modalCard: CSSProperties = {
  width: "100%",
  maxWidth: 500,
  maxHeight: "90vh",
  overflowY: "auto",
  background: "rgba(255,255,255,0.96)",
  border: "1px solid rgba(203,213,225,0.9)",
  boxShadow: "0 30px 90px rgba(0,0,0,0.34)",
  padding: 22,
  borderRadius: 26,
};

const modalHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 14,
  marginBottom: 18,
};

const modalEyebrow: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 10px",
  borderRadius: 999,
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1d4ed8",
  fontSize: 12,
  fontWeight: 900,
  marginBottom: 10,
};

const modalEyebrowDot: CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: "50%",
  background: "#2563eb",
};

const modalTitle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: 22,
  fontWeight: 950,
  letterSpacing: "-0.04em",
};

const modalSubtitle: CSSProperties = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: 13,
  lineHeight: 1.5,
};

const modalCloseBtn: CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  color: "#334155",
  cursor: "pointer",
  fontSize: 24,
  lineHeight: 1,
  flexShrink: 0,
};

const modalForm: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const modalField: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 7,
};

const modalLabel: CSSProperties = {
  color: "#334155",
  fontSize: 13,
  fontWeight: 900,
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "12px 13px",
  border: "1px solid #cbd5e1",
  borderRadius: 15,
  background: "#fff",
  color: "#0f172a",
  fontSize: 14,
  outline: "none",
};

const modalFileBox: CSSProperties = {
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 12,
  width: "100%",
  padding: 14,
  borderRadius: 18,
  border: "1px dashed #94a3b8",
  background:
    "linear-gradient(135deg, rgba(248,250,252,0.95), rgba(239,246,255,0.95))",
};

const modalFileIcon: CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 15,
  background: "#dbeafe",
  color: "#1d4ed8",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 21,
  flexShrink: 0,
};

const modalFileContent: CSSProperties = {
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 3,
};

const modalFileTitle: CSSProperties = {
  color: "#0f172a",
  fontSize: 14,
  fontWeight: 950,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const modalFileText: CSSProperties = {
  color: "#64748b",
  fontSize: 12,
  lineHeight: 1.45,
};

const modalActions: CSSProperties = {
  display: "flex",
  gap: 10,
  marginTop: 18,
};

const saveBtn: CSSProperties = {
  flex: 1,
  background: "linear-gradient(135deg, #16a34a, #15803d)",
  color: "white",
  padding: "12px 14px",
  borderRadius: 15,
  border: "none",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 950,
  boxShadow: "0 14px 28px rgba(22,163,74,0.22)",
};

const cancelBtn: CSSProperties = {
  flex: 1,
  background: "#f1f5f9",
  color: "#334155",
  padding: "12px 14px",
  borderRadius: 15,
  border: "1px solid #cbd5e1",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 950,
};

const filterThWrap: CSSProperties = {
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
};

const filterThButton: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#475569",
  fontSize: 12,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: 0,
};

const filterThButtonActive: CSSProperties = {
  color: "#2563eb",
};

const filterIcon: CSSProperties = {
  fontSize: 12,
  color: "inherit",
};

const filterDropdown: CSSProperties = {
  position: "absolute",
  top: "calc(100% + 10px)",
  left: 0,
  zIndex: 50,
  width: 250,
  maxWidth: "70vw",
  background: "#fff",
  border: "1px solid #cbd5e1",
  borderRadius: 16,
  boxShadow: "0 22px 55px rgba(15,23,42,0.22)",
  padding: 12,
  textTransform: "none",
  letterSpacing: 0,
};

const filterDropdownHeader: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  paddingBottom: 10,
  borderBottom: "1px solid #e2e8f0",
};

const filterDropdownTitle: CSSProperties = {
  color: "#0f172a",
  fontSize: 13,
  fontWeight: 950,
};

const filterClearSmall: CSSProperties = {
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  color: "#334155",
  borderRadius: 10,
  padding: "6px 8px",
  fontSize: 12,
  fontWeight: 850,
  cursor: "pointer",
};

const filterOptions: CSSProperties = {
  maxHeight: 220,
  overflowY: "auto",
  display: "grid",
  gap: 7,
  paddingTop: 10,
};

const filterOption: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 9px",
  borderRadius: 11,
  background: "#f8fafc",
  border: "1px solid #eef2f7",
  cursor: "pointer",
};

const filterCheckbox: CSSProperties = {
  width: 15,
  height: 15,
  accentColor: "#2563eb",
  flexShrink: 0,
};

const filterOptionText: CSSProperties = {
  color: "#0f172a",
  fontSize: 13,
  fontWeight: 750,
  lineHeight: 1.35,
  wordBreak: "break-word",
};

const filterEmpty: CSSProperties = {
  color: "#64748b",
  fontSize: 13,
  padding: "10px 4px",
};

const filterDropdownFooter: CSSProperties = {
  marginTop: 10,
  paddingTop: 9,
  borderTop: "1px solid #e2e8f0",
  color: "#64748b",
  fontSize: 12,
  fontWeight: 800,
};

const loadingBox: CSSProperties = {
  minHeight: "calc(100vh - 120px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
};

const loadingCard: CSSProperties = {
  width: "100%",
  maxWidth: 390,
  borderRadius: 28,
  padding: "32px 26px",
  background: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(203,213,225,0.9)",
  boxShadow: "0 24px 70px rgba(15,23,42,0.12)",
  backdropFilter: "blur(16px)",
  textAlign: "center",
};

const loadingIcon: CSSProperties = {
  width: 62,
  height: 62,
  borderRadius: 22,
  margin: "0 auto 16px",
  background: "linear-gradient(135deg, #38bdf8, #2563eb)",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 28,
  boxShadow: "0 18px 36px rgba(37,99,235,0.28)",
};

const spinner: CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: "50%",
  margin: "0 auto 18px",
  border: "4px solid #e2e8f0",
  borderTopColor: "#2563eb",
  animation: "spin 0.9s linear infinite",
};

const loadingTitle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: 21,
  fontWeight: 950,
  letterSpacing: "-0.035em",
};

const loadingText: CSSProperties = {
  margin: "10px 0 0",
  color: "#64748b",
  fontSize: 14,
  lineHeight: 1.6,
};
const dateFilterWrap: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flex: "1 1 260px",
  flexWrap: "wrap",
  minWidth: 0,
};

const dateLabel: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 5,
  color: "#475569",
  fontSize: 12,
  fontWeight: 900,
  flex: "1 1 120px",
  minWidth: 0,
};

const dateInputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 13px",
  borderRadius: 15,
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#0f172a",
  fontSize: 13,
  outline: "none",
};