"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Contract = {
  id: string;
  company_name: string;
  company_id: string;
  counterparty: string;
  start_date: string;
  end_date: string;
  file_url: string | null;
  auto_renew: boolean;
};

export default function CompanyDashboard() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  // const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [permissions, setPermissions] = useState<any[]>([]);
  const [editingContract, setEditingContract] = useState<any>(null);

  // SIRALAMA UCUN STATE
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Contract | null;
    direction: "asc" | "desc";
  }>({ key: null, direction: "asc" });

  async function loadContracts() {
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

    const { data } = await supabase
      .from("contracts")
      .select("*")
      .in("company_id", companyIds)
      .eq("status", "active")
      .order("created_at", { ascending: false });

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

      setContracts(activeContracts);
    }

    setLoading(false);
  }

  async function updateContract() {
    if (!editingContract) return;

    let fileUrl = editingContract.file_url;

    // yeni file varsa upload et
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

    const { error } = await supabase
      .from("contracts")
      .update({
        company_name: editingContract.company_name,
        counterparty: editingContract.counterparty,
        start_date: editingContract.start_date,
        end_date: editingContract.end_date,
        file_url: fileUrl,
      })
      .eq("id", editingContract.id);

    if (error) {
      alert("Xəta baş verdi");
      return;
    }

    alert("Updated");
    setEditingContract(null);
    loadContracts();
  }

  function openEditModal(contract: any) {
    setEditingContract(contract);
  }

  useEffect(() => {
    loadContracts();
  }, []);

  async function deleteContract(id: string) {
    if (!confirm("Silmək istədiyinizə əminsiniz?")) return;

    const { error } = await supabase.from("contracts").delete().eq("id", id);

    if (error) {
      alert("Xəta baş verdi");
      return;
    }

    setContracts((prev) => prev.filter((c) => c.id !== id));
  }

  async function archiveContract(id: string) {
    if (!confirm("Arxivə göndərmək istədiyinizə əminsiniz?")) return;

    const { error } = await supabase
      .from("contracts")
      .update({ status: "archived" })
      .eq("id", id);

    if (error) {
      alert("Xəta baş verdi");
      return;
    }

    // UI-dan da sil (çünki active list-də göstərirsən)
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

  const companies = [...new Set(contracts.map((c) => c.company_name))];

  // FILTRLEME VE SIRALAMA MENTIQI
  const sortedAndFilteredContracts = useMemo(() => {
    let result = contracts
      .filter((c) => {
        if (selectedCompanies.length === 0) return true;
        return selectedCompanies.includes(c.company_name);
      })
      .filter(
        (c) =>
          c.counterparty.toLowerCase().includes(search.toLowerCase()) ||
          c.company_name.toLowerCase().includes(search.toLowerCase())
      );

    if (sortConfig.key) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key!] || "";
        const bVal = b[sortConfig.key!] || "";
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [contracts, selectedCompanies, search, sortConfig]);

  // --- EXPORT FUNKSIYALARI ---
  const exportToExcel = () => {
    const dataToExport = sortedAndFilteredContracts.map((c) => ({
      Şirkət: c.company_name,
      Müqavilə: c.counterparty,
      Başlama: formatDate(c.start_date),
      Bitmə: formatDate(c.end_date),
      Yenilənmə: c.auto_renew ? "Bəli" : "Xeyr",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Contracts");
    XLSX.writeFile(workbook, "Sirket_Muqavileleri.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const tableColumn = ["Company", "Counterparty", "Start", "End", "Renew"];
    const tableRows = sortedAndFilteredContracts.map((c) => [
      c.company_name,
      c.counterparty,
      formatDate(c.start_date),
      formatDate(c.end_date),
      c.auto_renew ? "Yes" : "No",
    ]);

    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 20 });
    doc.save("Sirket_Muqavileleri.pdf");
  };

  const requestSort = (key: keyof Contract) => {
    let direction: "asc" | "desc" = "asc";

    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }

    setSortConfig({ key, direction });
  };

  function sortIcon(key: keyof Contract) {
    if (sortConfig.key !== key) return "↕";
    return sortConfig.direction === "asc" ? "↑" : "↓";
  }

  const expiringSoonCount = contracts.filter(
    (c) => daysLeft(c.end_date) <= 30
  ).length;

  const criticalCount = contracts.filter((c) => daysLeft(c.end_date) <= 7)
    .length;

  const autoRenewCount = contracts.filter((c) => c.auto_renew).length;

  const pdfCount = contracts.filter((c) => c.file_url).length;

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
    <div style={pageStyle} onClick={() => setSelectedCompanies([])}>
      {/* HERO */}
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
              sıralayın, ixrac edin və icazəniz varsa redaktə, silmə və arxiv
              əməliyyatlarını icra edin.
            </p>
          </div>

          {/* EXPORT BUTONLARI */}
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

      {/* STATS */}
      <section style={statsGrid}>
        <div style={statCard}>
          <div style={statTop}>
            <span style={statIconBlue}>📁</span>
            <span style={statLabel}>Aktiv müqavilələr</span>
          </div>

          <strong style={statValue}>{contracts.length}</strong>

          <span style={statHint}>Hazırda aktiv siyahıda olan müqavilələr</span>
        </div>

        <div style={statCard}>
          <div style={statTop}>
            <span style={statIconOrange}>⏳</span>
            <span style={statLabel}>30 günə bitən</span>
          </div>

          <strong style={statValue}>{expiringSoonCount}</strong>

          <span style={statHint}>Bitmə tarixi yaxın olan müqavilələr</span>
        </div>

        <div style={statCard}>
          <div style={statTop}>
            <span style={statIconRed}>⚠️</span>
            <span style={statLabel}>Kritik</span>
          </div>

          <strong style={statValue}>{criticalCount}</strong>

          <span style={statHint}>7 gün və ya daha az qalan müqavilələr</span>
        </div>

        <div style={statCard}>
          <div style={statTop}>
            <span style={statIconGreen}>🔁</span>
            <span style={statLabel}>Avto yenilənən</span>
          </div>

          <strong style={statValue}>{autoRenewCount}</strong>

          <span style={statHint}>Avtomatik yenilənmə seçilmiş müqavilələr</span>
        </div>
      </section>

      {/* TOOLBAR */}
      <section style={toolbarCard}>
        <div style={toolbarInfo}>
          <h2 style={toolbarTitle}>Filter və axtarış</h2>

          <p style={toolbarText}>
            Şirkət kartlarını seçərək çoxlu filter tətbiq edə bilərsiniz. Boş
            sahəyə klik etdikdə filter təmizlənir.
          </p>
        </div>

        <div style={toolbarRight}>
          <div style={searchWrap}>
            <span style={searchIcon}>⌕</span>

            <input
              placeholder="Müqavilə və ya şirkət üzrə axtar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={searchInputStyle}
            />
          </div>

          {search && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSearch("");
              }}
              style={clearSearchBtn}
            >
              Təmizlə
            </button>
          )}
        </div>
      </section>

      {/* COMPANY CARDS */}
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

                  setSelectedCompanies((prev) => {
                    if (prev.includes(company)) {
                      // çıxart
                      return prev.filter((c) => c !== company);
                    } else {
                      // əlavə et
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

      {/* CONTENT */}
      <section style={contentContainerStyle}>
        <div style={tableHeader}>
          <div>
            <h2 style={tableTitle}>
              {selectedCompanies.length > 0
                ? `Seçilmiş şirkətlər (${selectedCompanies.length})`
                : "Bütün müqavilələr"}
            </h2>

            <p style={tableSubtitle}>
              Göstərilən nəticə: {sortedAndFilteredContracts.length} /{" "}
              {contracts.length} · PDF-i olan: {pdfCount}
            </p>
          </div>

          {selectedCompanies.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCompanies([]);
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
              Axtarış sözünü dəyişin və ya şirkət filterlərini təmizləyərək
              yenidən yoxlayın.
            </p>
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <div className="desktop-table" style={tableWrap}>
              <table style={tableStyle}>
                <thead>
                  <tr style={theadRow}>
                    <th
                      style={{ ...thStyle, cursor: "pointer" }}
                      onClick={() => requestSort("company_name")}
                    >
                      <span style={thInner}>
                        Şirkət
                        <span style={sortMark}>
                          {sortIcon("company_name")}
                        </span>
                      </span>
                    </th>

                    <th
                      style={{ ...thStyle, cursor: "pointer" }}
                      onClick={() => requestSort("counterparty")}
                    >
                      <span style={thInner}>
                        Müqavilə
                        <span style={sortMark}>
                          {sortIcon("counterparty")}
                        </span>
                      </span>
                    </th>

                    <th
                      style={{ ...thStyle, cursor: "pointer" }}
                      onClick={() => requestSort("start_date")}
                    >
                      <span style={thInner}>
                        Başlama
                        <span style={sortMark}>{sortIcon("start_date")}</span>
                      </span>
                    </th>

                    <th
                      style={{ ...thStyle, cursor: "pointer" }}
                      onClick={() => requestSort("end_date")}
                    >
                      <span style={thInner}>
                        Bitmə
                        <span style={sortMark}>{sortIcon("end_date")}</span>
                      </span>
                    </th>

                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Yeniləmə</th>

                    <th
                      style={{ ...thStyle, cursor: "pointer" }}
                      onClick={() => requestSort("file_url")}
                    >
                      <span style={thInner}>
                        Sənəd
                        <span style={sortMark}>{sortIcon("file_url")}</span>
                      </span>
                    </th>

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
                          <span style={counterpartyText}>{c.counterparty}</span>
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
                          {c.file_url ? (
                            <a
                              href={c.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={pdfBtn}
                            >
                              Pdf bax
                            </a>
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

            {/* MOBILE CARDS */}
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
                          <span style={mobileCompanyName}>{c.company_name}</span>

                          <h3 style={mobileContractTitle}>{c.counterparty}</h3>
                        </div>
                      </div>

                      {expiryBadge(days)}
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

                      {c.file_url && (
                        <a
                          href={c.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={pdfBtn}
                        >
                          Pdf bax
                        </a>
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
              {/* COMPANY */}
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

              {/* COUNTERPARTY */}
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

              {/* START DATE */}
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

              {/* END DATE */}
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

              {/* FILE */}
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

            {/* BUTTONS */}
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

// Sənin köhnə funksiyaların və nişanların (status badge)
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

/* STATS */

const statsGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
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
  display: "flex",
  alignItems: "center",
  gap: 10,
  flex: "1 1 420px",
};

const searchWrap: CSSProperties = {
  flex: 1,
  minWidth: 260,
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

/* CONTENT / TABLE */

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
  minWidth: 1080,
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

const thInner: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
};

const sortMark: CSSProperties = {
  color: "#94a3b8",
  fontSize: 13,
  fontWeight: 900,
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

/* BADGES */

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

/* BUTTONS */

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

/* EMPTY */

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

/* MOBILE */

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

/* MODAL */

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

/* LOADING */

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