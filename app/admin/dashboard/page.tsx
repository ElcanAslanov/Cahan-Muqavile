"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Contract = {
  id: string;
  company_name: string;
  company_id?: string | null;
  company_voen?: string | null;
  counterparty: string;
  counterparty_voen?: string | null;
  start_date: string;
  end_date: string;
  file_url: string | null;
  generated_file_path?: string | null;
  template_name?: string | null;
  auto_renew: boolean;
  created_by?: string | null;
  created_by_name?: string | null;
};

type StatFilter = "ALL" | "COMPANIES" | "EXPIRING_30" | "CRITICAL" | "AUTO_RENEW" | "PDF";

export default function DashboardPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [activeStatFilter, setActiveStatFilter] = useState<StatFilter>("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [sortConfig, setSortConfig] = useState<{
    key: keyof Contract | null;
    direction: "asc" | "desc";
  }>({
    key: null,
    direction: "asc",
  });

  function getProfileName(profile: any) {
    if (!profile) return "-";

    const firstLast = `${profile.first_name || ""} ${
      profile.last_name || ""
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
    const { data, error } = await supabase
      .from("contracts")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      console.log(error);
      return;
    }

    if (data) {
      const enriched = await enrichContractsWithCreators(data);
      setContracts(enriched as Contract[]);
    }
  }

  useEffect(() => {
    loadContracts();
  }, []);
  function isHttpUrl(value: string) {
    return /^https?:\/\//i.test(value);
  }

  function getFileLabel(filePath: string | null | undefined) {
    if (!filePath) return "Fayl yoxdur";

    const clean = filePath.split("?")[0].toLowerCase();

    if (clean.endsWith(".pdf")) return "PDFə bax";
    if (clean.endsWith(".docx")) return "DOCXə bax";
    if (clean.endsWith(".doc")) return "DOCa bax";

    return "Fayla bax";
  }

  function normalizeContractStoragePath(value: string) {
    if (!value) return "";

    if (!isHttpUrl(value)) {
      return value.replace(/^\/+/, "");
    }

    try {
      const url = new URL(value);
      const marker = "/storage/v1/object/public/contracts/";
      const signedMarker = "/storage/v1/object/sign/contracts/";

      if (url.pathname.includes(marker)) {
        return decodeURIComponent(url.pathname.split(marker)[1] || "");
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
    const rawPath = contract.generated_file_path || contract.file_url;

    if (!rawPath) {
      alert("Bu müqaviləyə fayl əlavə edilməyib");
      return;
    }

    if (isHttpUrl(rawPath)) {
      window.open(rawPath, "_blank", "noopener,noreferrer");
      return;
    }

    const storagePath = normalizeContractStoragePath(rawPath);

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


  const companies = [...new Set(contracts.map((c) => c.company_name))];

  function requestSort(key: keyof Contract) {
    let direction: "asc" | "desc" = "asc";

    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }

    setSortConfig({ key, direction });
  }

  function daysLeft(end: string) {
    const endDate = new Date(`${end}T00:00:00`).getTime();
    const today = new Date().getTime();
    const diff = endDate - today;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  function applyDateRangeFilter(contract: Contract) {
    if (!dateFrom && !dateTo) return true;

    const contractDate = new Date(`${contract.start_date}T00:00:00`).getTime();

    if (Number.isNaN(contractDate)) return false;

    const fromTime = dateFrom
      ? new Date(`${dateFrom}T00:00:00`).getTime()
      : null;

    const toTime = dateTo
      ? new Date(`${dateTo}T23:59:59`).getTime()
      : null;

    if (fromTime !== null && contractDate < fromTime) return false;
    if (toTime !== null && contractDate > toTime) return false;

    return true;
  }

  function applyStatFilter(contract: Contract) {
    if (activeStatFilter === "ALL") return true;
    if (activeStatFilter === "COMPANIES") return true;
    if (activeStatFilter === "EXPIRING_30") return daysLeft(contract.end_date) <= 30;
    if (activeStatFilter === "CRITICAL") return daysLeft(contract.end_date) <= 7;
    if (activeStatFilter === "AUTO_RENEW") return contract.auto_renew;
    if (activeStatFilter === "PDF") return Boolean(contract.file_url);
    return true;
  }

  function expiryBadge(days: number) {
    if (days <= 7) {
      return <span style={dangerBadge}>7 GÜN</span>;
    }

    if (days <= 30) {
      return <span style={warningBadge}>30 GÜN</span>;
    }

    return <span style={safeBadge}>AKTİV</span>;
  }

  function toggleCompany(company: string) {
    setActiveStatFilter("ALL");

    setSelectedCompanies((prev) => {
      if (prev.includes(company)) {
        return prev.filter((c) => c !== company);
      } else {
        return [...prev, company];
      }
    });
  }

  function handleStatCardClick(filter: StatFilter) {
    setActiveStatFilter((prev) => (prev === filter ? "ALL" : filter));
    setSelectedCompanies([]);
  }

  function clearAllFilters() {
    setSelectedCompanies([]);
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setActiveStatFilter("ALL");
  }

  const filteredContracts = useMemo(() => {
    let result = contracts
      .filter((c) => applyStatFilter(c))
      .filter((c) => applyDateRangeFilter(c))
      .filter((c) => {
        if (selectedCompanies.length === 0) return true;
        return selectedCompanies.includes(c.company_name);
      })
      .filter((c) => {
        const q = search.toLowerCase().trim();
        if (!q) return true;

        return (
          c.counterparty.toLowerCase().includes(q) ||
          c.company_name.toLowerCase().includes(q) ||
          (c.company_voen || "").toLowerCase().includes(q) ||
          (c.counterparty_voen || "").toLowerCase().includes(q) ||
          (c.created_by_name || "").toLowerCase().includes(q)
        );
      });

    if (sortConfig.key) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortConfig.key!] || "";
        const bVal = b[sortConfig.key!] || "";

        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [
    contracts,
    selectedCompanies,
    search,
    sortConfig,
    activeStatFilter,
    dateFrom,
    dateTo,
  ]);

  function exportExcel() {
    const data = filteredContracts.map((c) => ({
      Şirkət: c.company_name,
      "Şirkət VÖEN": c.company_voen || "-",
      Müqavilə: c.counterparty,
      "Qarşı tərəf VÖEN": c.counterparty_voen || "-",
      Yaradan: c.created_by_name || "-",
      Başlanma: c.start_date,
      Bitmə: c.end_date,
      Yeniləmə: c.auto_renew ? "Bəli" : "Xeyr",
      Sənəd: c.file_url ? "Fayl var" : "Fayl yoxdur",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Contracts");
    XLSX.writeFile(wb, "contracts.xlsx");
  }

  function exportPDF() {
    const doc = new jsPDF();

    const columns = [
      "Sirket",
      "Sirket VOEN",
      "Muqavile",
      "Qarsi VOEN",
      "Yaradan",
      "Baslanma",
      "Bitme",
      "Yenileme",
    ];

    const rows = filteredContracts.map((c) => [
      c.company_name,
      c.company_voen || "-",
      c.counterparty,
      c.counterparty_voen || "-",
      c.created_by_name || "-",
      c.start_date,
      c.end_date,
      c.auto_renew ? "Beli" : "Xeyr",
    ]);

    autoTable(doc, {
      head: [columns],
      body: rows,
    });

    doc.save("contracts.pdf");
  }

  function sortIcon(key: keyof Contract) {
    if (sortConfig.key !== key) return "↕";
    return sortConfig.direction === "asc" ? "↑" : "↓";
  }

  function getActiveTitle() {
    if (selectedCompanies.length > 0) {
      return `Seçilmiş şirkətlər (${selectedCompanies.length})`;
    }

    if (activeStatFilter === "EXPIRING_30") return "30 günə bitən müqavilələr";
    if (activeStatFilter === "CRITICAL") return "Kritik müqavilələr";
    if (activeStatFilter === "AUTO_RENEW") return "Avto yenilənən müqavilələr";
    if (activeStatFilter === "PDF") return "Faylı olan müqavilələr";
    if (activeStatFilter === "COMPANIES") return "Şirkətlər üzrə müqavilələr";

    return "Bütün müqavilələr";
  }

  const expiringSoonCount = contracts.filter(
    (c) => daysLeft(c.end_date) <= 30
  ).length;

  const criticalCount = contracts.filter((c) => daysLeft(c.end_date) <= 7)
    .length;

  const autoRenewCount = contracts.filter((c) => c.auto_renew).length;
  const pdfCount = contracts.filter((c) => c.file_url).length;

  const hasAnyFilter =
    search ||
    dateFrom ||
    dateTo ||
    selectedCompanies.length > 0 ||
    activeStatFilter !== "ALL";

  return (
    <div
      className="admin-dashboard-page"
      onClick={() => setSelectedCompanies([])}
      style={pageStyle}
    >
      {/* HERO */}
      <section className="dashboard-hero" style={heroCard}>
        <div style={heroGlowOne} />
        <div style={heroGlowTwo} />

        <div className="dashboard-hero-content" style={heroContent}>
          <div className="dashboard-hero-left" style={heroLeft}>
            <div className="dashboard-eyebrow" style={eyebrow}>
              <span style={eyebrowDot} />
              Admin panel
            </div>

            <h1 className="dashboard-title" style={titleStyle}>
              İdarəetmə paneli
            </h1>

            <p className="dashboard-subtitle" style={subtitleStyle}>
              Aktiv müqavilələri izləyin, şirkətlər üzrə filter edin, axtarın,
              sıralayın və hesabat kimi ixrac edin.
            </p>
          </div>

          <div className="dashboard-actions" style={heroActions}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                exportExcel();
              }}
              style={excelBtnStyle}
              type="button"
            >
              📊 Excel
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                exportPDF();
              }}
              style={pdfExportBtnStyle}
              type="button"
            >
              📄 PDF
            </button>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="dashboard-stats" style={statsGrid} onClick={(e) => e.stopPropagation()}>
        <StatCard
          icon="📁"
          label="Aktiv müqavilə"
          value={contracts.length}
          hint="Sistemdə aktiv olan müqavilələr"
          active={activeStatFilter === "ALL"}
          onClick={() => handleStatCardClick("ALL")}
          iconStyle={statIconBlue}
        />

        <StatCard
          icon="🏢"
          label="Şirkətlər"
          value={companies.length}
          hint="Müqaviləsi olan şirkətlər"
          active={activeStatFilter === "COMPANIES"}
          onClick={() => handleStatCardClick("COMPANIES")}
          iconStyle={statIconGreen}
        />

        <StatCard
          icon="⏳"
          label="30 günə bitən"
          value={expiringSoonCount}
          hint="Bitmə tarixi yaxın olanlar"
          active={activeStatFilter === "EXPIRING_30"}
          onClick={() => handleStatCardClick("EXPIRING_30")}
          iconStyle={statIconOrange}
        />

        <StatCard
          icon="⚠️"
          label="Kritik"
          value={criticalCount}
          hint="7 gün və ya daha az qalanlar"
          active={activeStatFilter === "CRITICAL"}
          onClick={() => handleStatCardClick("CRITICAL")}
          iconStyle={statIconRed}
        />

        <StatCard
          icon="🔁"
          label="Avto yenilənən"
          value={autoRenewCount}
          hint="Avtomatik yenilənən müqavilələr"
          active={activeStatFilter === "AUTO_RENEW"}
          onClick={() => handleStatCardClick("AUTO_RENEW")}
          iconStyle={statIconPurple}
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

      {/* TOOLBAR */}
      <section className="dashboard-toolbar" style={toolbarCard}>
        <div style={toolbarInfo}>
          <h2 style={toolbarTitle}>Filter və axtarış</h2>
          <p style={toolbarText}>
            Şirkət kartlarını seçərək, tarix aralığı verərək və ya axtarışla
            müqavilələri filter edə bilərsiniz.
          </p>
        </div>

        <div style={toolbarRight}>
          <div style={searchAndDateWrap}>
            <div className="dashboard-search-wrap" style={searchWrap}>
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
          </div>

          {hasAnyFilter && (
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

      {/* COMPANY CARDS */}
      <section className="dashboard-company-grid" style={companyGrid}>
        {companies.map((company) => {
          const count = contracts.filter((c) => c.company_name === company).length;
          const active = selectedCompanies.includes(company);

          return (
            <div
              key={company}
              onClick={(e) => {
                e.stopPropagation();
                toggleCompany(company);
              }}
              style={{
                ...companyCardBase,
                ...(active ? companyCardActive : companyCardInactive),
              }}
            >
              <div style={companyCardTop}>
                <span style={companyAvatar}>
                  {company?.trim().slice(0, 1).toUpperCase() || "Ş"}
                </span>

                <span style={active ? selectedPill : normalPill}>
                  {active ? "Seçildi" : "Şirkət"}
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

      {/* TABLE */}
      <section className="dashboard-table-card" style={contentContainerStyle}>
        <div style={tableHeader}>
          <div>
            <h2 style={tableTitle}>{getActiveTitle()}</h2>

            <p style={tableSubtitle}>
              Göstərilən nəticə: {filteredContracts.length} / {contracts.length} ·
              Faylı olan: {pdfCount} · Avto yenilənən: {autoRenewCount}
            </p>
          </div>

          {hasAnyFilter && (
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

        {filteredContracts.length === 0 ? (
          <div style={emptyBox}>
            <div style={emptyIcon}>📭</div>
            <h3 style={emptyTitle}>Müqavilə tapılmadı</h3>
            <p style={emptyText}>
              Axtarış sözünü dəyişin və ya filterləri təmizləyin.
            </p>
          </div>
        ) : (
          <div style={tableWrap}>
            <table style={tableStyle}>
              <thead>
                <tr style={theadRow}>
                  <th style={thStyle} onClick={() => requestSort("company_name")}>
                    Şirkət {sortIcon("company_name")}
                  </th>
                  <th style={thStyle} onClick={() => requestSort("company_voen")}>
                    Şirkət VÖEN {sortIcon("company_voen")}
                  </th>
                  <th style={thStyle} onClick={() => requestSort("counterparty")}>
                    Müqavilə {sortIcon("counterparty")}
                  </th>
                  <th style={thStyle} onClick={() => requestSort("counterparty_voen")}>
                    Qarşı tərəf VÖEN {sortIcon("counterparty_voen")}
                  </th>
                  <th style={thStyle} onClick={() => requestSort("created_by_name")}>
                    Yaradan {sortIcon("created_by_name")}
                  </th>
                  <th style={thStyle} onClick={() => requestSort("start_date")}>
                    Başlanma {sortIcon("start_date")}
                  </th>
                  <th style={thStyle} onClick={() => requestSort("end_date")}>
                    Bitmə {sortIcon("end_date")}
                  </th>
                  <th style={thStyle}>Vaxtın bitməsi</th>
                  <th style={thStyle}>Yeniləmə</th>
                  <th style={thStyle} onClick={() => requestSort("file_url")}>
                    Sənəd {sortIcon("file_url")}
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredContracts.map((c) => {
                  const days = daysLeft(c.end_date);

                  return (
                    <tr key={c.id} style={rowStyle}>
                      <td style={tdStyle}>
                        <strong style={strongText}>{c.company_name}</strong>
                      </td>
                      <td style={tdStyle}>{c.company_voen || "-"}</td>
                      <td style={tdStyle}>{c.counterparty}</td>
                      <td style={tdStyle}>{c.counterparty_voen || "-"}</td>
                      <td style={tdStyle}>{c.created_by_name || "-"}</td>
                      <td style={tdStyle}>
                        <span style={datePill}>{c.start_date}</span>
                      </td>
                      <td style={tdStyle}>
                        <span style={datePill}>{c.end_date}</span>
                      </td>
                      <td style={tdStyle}>{expiryBadge(days)}</td>
                      <td style={tdStyle}>
                        {c.auto_renew ? (
                          <span style={renewBadge}>🔄 Yeniləmə</span>
                        ) : (
                          <span style={noRenewBadge}>⛔ Yeniləmə yoxdur</span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        {c.file_url || c.generated_file_path ? (
                          <button
                            type="button"
                            onClick={() => openContractFile(c)}
                            style={pdfBtn}
                          >
                            {getFileLabel(c.generated_file_path || c.file_url)}
                          </button>
                        ) : (
                          <span style={noPdfBadge}>Fayl yoxdur</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <style jsx>{`
        .admin-dashboard-page,
        .admin-dashboard-page * {
          box-sizing: border-box;
        }

        @media (max-width: 900px) {
          .dashboard-hero-content,
          .dashboard-toolbar {
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .dashboard-hero-left {
            min-width: 0 !important;
            flex: 1 1 auto !important;
          }

          .dashboard-actions {
            width: 100% !important;
            justify-content: stretch !important;
          }

          .dashboard-actions button {
            flex: 1 !important;
          }

          .dashboard-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .dashboard-search-wrap {
            width: 100% !important;
          }
        }

        @media (max-width: 560px) {
          .admin-dashboard-page {
            padding: 18px 12px 28px !important;
          }

          .dashboard-hero,
          .dashboard-toolbar,
          .dashboard-table-card {
            border-radius: 20px !important;
            padding: 16px 14px !important;
          }

          .dashboard-title {
            font-size: 29px !important;
          }

          .dashboard-subtitle {
            font-size: 14px !important;
            line-height: 1.6 !important;
          }

          .dashboard-stats,
          .dashboard-company-grid {
            grid-template-columns: 1fr !important;
          }

          .dashboard-actions {
            flex-direction: column !important;
          }

          .dashboard-actions button {
            width: 100% !important;
          }

          input[type="date"] {
            min-height: 46px;
          }
        }
      `}</style>
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

/* STYLES */

const pageStyle: CSSProperties = {
  width: "100%",
  minHeight: "100svh",
  overflowX: "hidden",
  padding: "26px clamp(14px, 3vw, 32px) 38px",
  background:
    "radial-gradient(circle at top left, rgba(56,189,248,0.18), transparent 28%), radial-gradient(circle at top right, rgba(99,102,241,0.16), transparent 28%), linear-gradient(135deg, #f3f7fb 0%, #eaf2fb 48%, #f8fafc 100%)",
  color: "#0f172a",
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
  fontSize: "clamp(30px, 4vw, 44px)",
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

const excelBtnStyle: CSSProperties = {
  border: "none",
  background: "linear-gradient(135deg, #16a34a, #15803d)",
  color: "#fff",
  padding: "12px 16px",
  borderRadius: 15,
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 950,
  boxShadow: "0 16px 34px rgba(22,163,74,0.24)",
};

const pdfExportBtnStyle: CSSProperties = {
  border: "none",
  background: "linear-gradient(135deg, #dc2626, #b91c1c)",
  color: "#fff",
  padding: "12px 16px",
  borderRadius: 15,
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 950,
  boxShadow: "0 16px 34px rgba(220,38,38,0.22)",
};

/* STATS */

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
  fontSize: 32,
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

const statIconGreen: CSSProperties = {
  ...statIconBlue,
  background: "#dcfce7",
};

const statIconOrange: CSSProperties = {
  ...statIconBlue,
  background: "#ffedd5",
};

const statIconRed: CSSProperties = {
  ...statIconBlue,
  background: "#fee2e2",
};

const statIconPurple: CSSProperties = {
  ...statIconBlue,
  background: "#ede9fe",
};

const statIconGray: CSSProperties = {
  ...statIconBlue,
  background: "#f1f5f9",
};

/* TOOLBAR */

const toolbarCard: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 18,
  flexWrap: "wrap",
  marginBottom: 18,
  padding: 18,
  borderRadius: 22,
  background: "rgba(255,255,255,0.9)",
  border: "1px solid rgba(203,213,225,0.88)",
  boxShadow: "0 18px 45px rgba(15,23,42,0.07)",
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
  display: "flex",
  alignItems: "flex-end",
  gap: 10,
  flex: "1 1 520px",
  flexWrap: "wrap",
  minWidth: 0,
};

const searchAndDateWrap: CSSProperties = {
  flex: "1 1 520px",
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const searchWrap: CSSProperties = {
  width: "100%",
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
};

const dateFilterWrap: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 180px))",
  alignItems: "end",
  gap: 10,
  width: "100%",
  minWidth: 0,
};

const dateLabel: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 5,
  color: "#475569",
  fontSize: 12,
  fontWeight: 900,
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

/* COMPANY CARDS */

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
};

const companyCountLabel: CSSProperties = {
  fontSize: 13,
  opacity: 0.78,
  fontWeight: 700,
};

/* TABLE */

const contentContainerStyle: CSSProperties = {
  background: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(203,213,225,0.9)",
  boxShadow: "0 24px 70px rgba(15,23,42,0.09)",
  padding: 18,
  borderRadius: 26,
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
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  minWidth: 1250,
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
  cursor: "pointer",
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

const strongText: CSSProperties = {
  fontWeight: 850,
  color: "#0f172a",
};

const datePill: CSSProperties = {
  display: "inline-flex",
  padding: "7px 10px",
  borderRadius: 999,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#334155",
  fontSize: 13,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const dangerBadge: CSSProperties = {
  background: "#fee2e2",
  color: "#991b1b",
  padding: "6px 11px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const warningBadge: CSSProperties = {
  background: "#ffedd5",
  color: "#9a3412",
  padding: "6px 11px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const safeBadge: CSSProperties = {
  background: "#dcfce7",
  color: "#166534",
  padding: "6px 11px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const renewBadge: CSSProperties = {
  background: "#dcfce7",
  color: "#166534",
  padding: "6px 11px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const noRenewBadge: CSSProperties = {
  background: "#f1f5f9",
  color: "#475569",
  padding: "6px 11px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const noPdfBadge: CSSProperties = {
  display: "inline-flex",
  padding: "7px 10px",
  borderRadius: 999,
  background: "#f1f5f9",
  color: "#64748b",
  fontSize: 12,
  fontWeight: 850,
};

const pdfBtn: CSSProperties = {
  display: "inline-flex",
  background: "linear-gradient(135deg, #3b82f6, #2563eb)",
  color: "white",
  padding: "8px 12px",
  borderRadius: 12,
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 900,
  border: "none",
  cursor: "pointer",
};

/* EMPTY */

const emptyBox: CSSProperties = {
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
};

const emptyText: CSSProperties = {
  margin: "8px auto 0",
  maxWidth: 430,
  color: "#64748b",
  fontSize: 14,
};
