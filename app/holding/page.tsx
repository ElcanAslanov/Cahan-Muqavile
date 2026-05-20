"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Contract = {
  id: string;
  company_name: string;
  counterparty: string;
  start_date: string;
  end_date: string;
  file_url: string | null;
  auto_renew: boolean;
};

export default function HoldingDashboard() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const [sortConfig, setSortConfig] = useState<{
    key: keyof Contract | null;
    direction: "asc" | "desc";
  }>({ key: null, direction: "asc" });

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
      setContracts(data);
    }
  }

  useEffect(() => {
    loadContracts();
  }, []);

  function formatDate(dateStr: string) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }

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
    XLSX.writeFile(workbook, "Contracts_Export.xlsx");
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
    doc.save("Contracts_Export.pdf");
  };

  const companies = [...new Set(contracts.map((c) => c.company_name))];

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

  const requestSort = (key: keyof Contract) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  function daysLeft(end: string) {
    const endDate = new Date(end).getTime();
    const today = new Date().getTime();
    const diff = endDate - today;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  function expiryBadge(days: number) {
    if (days <= 7) return <span style={dangerBadge}>7 GÜN</span>;
    if (days <= 30) return <span style={warningBadge}>30 GÜN</span>;
    return <span style={safeBadge}>AKTİV</span>;
  }

  function toggleCompany(company: string) {
    setSelectedCompanies((prev) => {
      if (prev.includes(company)) {
        return prev.filter((c) => c !== company);
      } else {
        return [...prev, company];
      }
    });
  }

  const expiringSoonCount = contracts.filter(
    (c) => daysLeft(c.end_date) <= 30
  ).length;

  const criticalCount = contracts.filter((c) => daysLeft(c.end_date) <= 7)
    .length;

  const autoRenewCount = contracts.filter((c) => c.auto_renew).length;
  const pdfCount = contracts.filter((c) => c.file_url).length;

  function sortIcon(key: keyof Contract) {
    if (sortConfig.key !== key) return "↕";
    return sortConfig.direction === "asc" ? "↑" : "↓";
  }

  return (
    <div
      className="holding-page"
      onClick={() => setSelectedCompanies([])}
      style={pageStyle}
    >
      {/* HERO */}
      <section className="holding-hero" style={heroCard}>
        <div style={heroGlowOne} />
        <div style={heroGlowTwo} />

        <div className="holding-hero-content" style={heroContent}>
          <div className="holding-hero-left" style={heroLeft}>
            <div className="holding-eyebrow" style={eyebrow}>
              <span style={eyebrowDot} />
              Holding paneli
            </div>

            <h1 className="holding-title" style={titleStyle}>
              Şirkət müqavilələri
            </h1>

            <p className="holding-subtitle" style={subtitleStyle}>
              Holding üzrə aktiv müqavilələri izləyin, şirkətlərə görə filter
              edin, axtarın, sıralayın və hesabat kimi ixrac edin.
            </p>
          </div>

          <div className="holding-actions" style={heroActions}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                exportToExcel();
              }}
              style={excelBtnStyle}
              type="button"
            >
              📊 Excel
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                exportToPDF();
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
      <section className="holding-stats" style={statsGrid}>
        <div style={statCard}>
          <div style={statTop}>
            <span style={statIconBlue}>📁</span>
            <span style={statLabel}>Aktiv müqavilə</span>
          </div>
          <strong style={statValue}>{contracts.length}</strong>
          <span style={statHint}>Holding üzrə aktiv müqavilələr</span>
        </div>

        <div style={statCard}>
          <div style={statTop}>
            <span style={statIconGreen}>🏢</span>
            <span style={statLabel}>Şirkətlər</span>
          </div>
          <strong style={statValue}>{companies.length}</strong>
          <span style={statHint}>Müqaviləsi olan şirkətlər</span>
        </div>

        <div style={statCard}>
          <div style={statTop}>
            <span style={statIconOrange}>⏳</span>
            <span style={statLabel}>30 günə bitən</span>
          </div>
          <strong style={statValue}>{expiringSoonCount}</strong>
          <span style={statHint}>Bitmə tarixi yaxın olanlar</span>
        </div>

        <div style={statCard}>
          <div style={statTop}>
            <span style={statIconRed}>⚠️</span>
            <span style={statLabel}>Kritik</span>
          </div>
          <strong style={statValue}>{criticalCount}</strong>
          <span style={statHint}>7 gün və ya daha az qalanlar</span>
        </div>
      </section>

      {/* TOOLBAR */}
      <section className="holding-toolbar" style={toolbarCard}>
        <div style={toolbarInfo}>
          <h2 style={toolbarTitle}>Filter və axtarış</h2>
          <p style={toolbarText}>
            Şirkət kartlarını seçərək çoxlu filter tətbiq edə bilərsiniz. Boş
            sahəyə klik etdikdə filter təmizlənir.
          </p>
        </div>

        <div className="holding-search-wrap" style={searchWrap}>
          <span style={searchIcon}>⌕</span>

          <input
            placeholder="Müqavilə və ya şirkət üzrə axtar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            style={searchInputStyle}
          />
        </div>
      </section>

      {/* COMPANY CARDS */}
      <section className="holding-company-grid" style={companyGridStyle}>
        {companies.map((company) => {
          const count = contracts.filter(
            (c) => c.company_name === company
          ).length;
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
              <div style={companyTop}>
                <span style={companyAvatar}>
                  {company?.trim().slice(0, 1).toUpperCase() || "Ş"}
                </span>

                <span style={active ? selectedPill : normalPill}>
                  {active ? "Seçildi" : "Şirkət"}
                </span>
              </div>

              <h3 style={companyTitle}>{company}</h3>

              <div style={companyFooter}>
                <span style={companyCount}>{count}</span>
                <span style={companyCountLabel}>müqavilə</span>
              </div>
            </div>
          );
        })}
      </section>

      {/* CONTENT */}
      <section className="holding-content-card" style={contentContainerStyle}>
        <div style={tableHeader}>
          <div>
            <h2 style={tableTitle}>
              {selectedCompanies.length > 0
                ? `Seçilmiş şirkətlər (${selectedCompanies.length})`
                : "Bütün müqavilələr"}
            </h2>

            <p style={tableSubtitle}>
              Göstərilən nəticə: {sortedAndFilteredContracts.length} /{" "}
              {contracts.length} · PDF-i olan: {pdfCount} · Avto yenilənən:{" "}
              {autoRenewCount}
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
          <div style={emptyBox}>
            <div style={emptyIcon}>📭</div>
            <h3 style={emptyTitle}>Müqavilə tapılmadı</h3>
            <p style={emptyText}>
              Axtarış sözünü dəyişin və ya filterləri təmizləyin.
            </p>
          </div>
        ) : (
          <>
            <div className="desktop-table" style={tableWrap}>
              <table style={tableStyle}>
                <thead>
                  <tr style={theadRow}>
                    <th
                      style={thStyle}
                      onClick={() => requestSort("company_name")}
                    >
                      Şirkət {sortIcon("company_name")}
                    </th>
                    <th
                      style={thStyle}
                      onClick={() => requestSort("counterparty")}
                    >
                      Müqavilə {sortIcon("counterparty")}
                    </th>
                    <th
                      style={thStyle}
                      onClick={() => requestSort("start_date")}
                    >
                      Başlama {sortIcon("start_date")}
                    </th>
                    <th style={thStyle} onClick={() => requestSort("end_date")}>
                      Bitmə {sortIcon("end_date")}
                    </th>
                    <th style={thStyle}>Aktiv</th>
                    <th style={thStyle}>Yeniləmə</th>
                    <th style={thStyle} onClick={() => requestSort("file_url")}>
                      Sənəd {sortIcon("file_url")}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {sortedAndFilteredContracts.map((c) => {
                    const days = daysLeft(c.end_date);

                    return (
                      <tr key={c.id} style={rowStyle}>
                        <td style={tdStyle}>
                          <strong style={strongText}>{c.company_name}</strong>
                        </td>
                        <td style={tdStyle}>{c.counterparty}</td>
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
                            <span style={noRenewBadge}>⛔ Yenilənmir</span>
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
                              PDF
                            </a>
                          ) : (
                            <span style={noPdfBadge}>PDF yoxdur</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mobile-cards" style={mobileCards}>
              {sortedAndFilteredContracts.map((c) => {
                const days = daysLeft(c.end_date);

                return (
                  <div key={c.id} style={mobileCardStyle}>
                    <div style={mobileTop}>
                      <div>
                        <span style={mobileCompanyName}>{c.company_name}</span>
                        <h3 style={mobileContractTitle}>{c.counterparty}</h3>
                      </div>

                      {expiryBadge(days)}
                    </div>

                    <div style={mobileInfoRow}>
                      <div style={mobileInfoBox}>
                        <p style={mobileLabelStyle}>Başlama</p>
                        <p style={mobileValueStyle}>
                          {formatDate(c.start_date)}
                        </p>
                      </div>

                      <div style={mobileInfoBox}>
                        <p style={mobileLabelStyle}>Bitmə</p>
                        <p style={mobileValueStyle}>
                          {formatDate(c.end_date)}
                        </p>
                      </div>
                    </div>

                    <div style={mobileFooterStyle}>
                      {c.auto_renew ? (
                        <span style={renewBadge}>🔄 Yeniləmə</span>
                      ) : (
                        <span style={noRenewBadge}>⛔ Yenilənmir</span>
                      )}

                      {c.file_url ? (
                        <a
                          href={c.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={pdfBtn}
                        >
                          PDF
                        </a>
                      ) : (
                        <span style={noPdfBadge}>PDF yoxdur</span>
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
        .holding-page,
        .holding-page * {
          box-sizing: border-box;
        }

        .desktop-table {
          display: block;
        }

        .mobile-cards {
          display: none;
        }

        @media (max-width: 900px) {
          .holding-hero-content,
          .holding-toolbar {
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .holding-hero-left {
            min-width: 0 !important;
            flex: 1 1 auto !important;
          }

          .holding-actions {
            width: 100% !important;
            justify-content: stretch !important;
          }

          .holding-actions button {
            flex: 1 !important;
          }

          .holding-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .desktop-table {
            display: none !important;
          }

          .mobile-cards {
            display: grid !important;
            gap: 14px !important;
          }
        }

        @media (max-width: 560px) {
          .holding-page {
            padding: 18px 12px 28px !important;
          }

          .holding-hero,
          .holding-toolbar,
          .holding-content-card {
            border-radius: 20px !important;
            padding: 16px 14px !important;
          }

          .holding-title {
            font-size: 29px !important;
          }

          .holding-subtitle {
            font-size: 14px !important;
            line-height: 1.6 !important;
          }

          .holding-actions {
            flex-direction: column !important;
          }

          .holding-actions button {
            width: 100% !important;
          }

          .holding-stats,
          .holding-company-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

/* STYLES */
const pageStyle = {
  width: "100%",
  minHeight: "100svh",
  overflowX: "hidden" as const,
  padding: "26px clamp(14px, 3vw, 32px) 38px",
  background:
    "radial-gradient(circle at top left, rgba(56,189,248,0.18), transparent 28%), radial-gradient(circle at top right, rgba(99,102,241,0.16), transparent 28%), linear-gradient(135deg, #f3f7fb 0%, #eaf2fb 48%, #f8fafc 100%)",
  color: "#0f172a",
};

const heroCard = {
  position: "relative" as const,
  overflow: "hidden" as const,
  borderRadius: 28,
  padding: "28px clamp(20px, 4vw, 34px)",
  marginBottom: 20,
  background:
    "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,64,105,0.96) 52%, rgba(8,47,73,0.98))",
  border: "1px solid rgba(148, 163, 184, 0.18)",
  boxShadow: "0 24px 80px rgba(15, 23, 42, 0.24)",
  color: "#fff",
};

const heroGlowOne = {
  position: "absolute" as const,
  width: 260,
  height: 260,
  borderRadius: "50%",
  right: -70,
  top: -90,
  background: "rgba(56,189,248,0.28)",
  filter: "blur(8px)",
};

const heroGlowTwo = {
  position: "absolute" as const,
  width: 220,
  height: 220,
  borderRadius: "50%",
  left: "35%",
  bottom: -150,
  background: "rgba(99,102,241,0.24)",
  filter: "blur(10px)",
};

const heroContent = {
  position: "relative" as const,
  zIndex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 22,
  flexWrap: "wrap" as const,
};

const heroLeft = {
  minWidth: 260,
  flex: "1 1 520px",
};

const eyebrow = {
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

const eyebrowDot = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "#38bdf8",
  boxShadow: "0 0 0 5px rgba(56,189,248,0.15)",
};

const titleStyle = {
  margin: 0,
  fontSize: "clamp(30px, 4vw, 44px)",
  lineHeight: 1.08,
  letterSpacing: "-0.055em",
  fontWeight: 950,
};

const subtitleStyle = {
  margin: "14px 0 0",
  maxWidth: 760,
  color: "#cbd5e1",
  fontSize: 15,
  lineHeight: 1.7,
};

const heroActions = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 12,
  flexWrap: "wrap" as const,
};

const excelBtnStyle = {
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

const pdfExportBtnStyle = {
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

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 14,
  marginBottom: 20,
};

const statCard = {
  background: "rgba(255,255,255,0.88)",
  border: "1px solid rgba(203,213,225,0.86)",
  boxShadow: "0 18px 45px rgba(15,23,42,0.08)",
  borderRadius: 22,
  padding: 18,
};

const statTop = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 14,
};

const statLabel = {
  color: "#475569",
  fontSize: 13,
  fontWeight: 850,
};

const statValue = {
  display: "block",
  color: "#0f172a",
  fontSize: 32,
  lineHeight: 1,
  fontWeight: 950,
  marginBottom: 8,
};

const statHint = {
  color: "#64748b",
  fontSize: 12,
};

const statIconBlue = {
  width: 36,
  height: 36,
  borderRadius: 14,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#dbeafe",
};

const statIconGreen = {
  ...statIconBlue,
  background: "#dcfce7",
};

const statIconOrange = {
  ...statIconBlue,
  background: "#ffedd5",
};

const statIconRed = {
  ...statIconBlue,
  background: "#fee2e2",
};

const toolbarCard = {
  // display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 18,
  flexWrap: "wrap" as const,
  marginBottom: 18,
  padding: 18,
  borderRadius: 22,
  background: "rgba(255,255,255,0.9)",
  border: "1px solid rgba(203,213,225,0.88)",
  boxShadow: "0 18px 45px rgba(15,23,42,0.07)",
};

const toolbarInfo = {
  minWidth: 240,
  flex: "1 1 340px",
};

const toolbarTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: 18,
  fontWeight: 950,
};

const toolbarText = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: 13,
};

const searchWrap = {
  flex: "1 1 420px",
  minWidth: 260,
  position: "relative" as const,
};

const searchIcon = {
  position: "absolute" as const,
  left: 15,
  top: "50%",
  transform: "translateY(-50%)",
  color: "#64748b",
  fontSize: 19,
};

const searchInputStyle = {
  width: "100%",
  padding: "14px 16px 14px 44px",
  borderRadius: 16,
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#0f172a",
  fontSize: 14,
  outline: "none",
};

const companyGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: 16,
  marginBottom: 20,
};

const companyCardBase = {
  cursor: "pointer",
  padding: 18,
  borderRadius: 22,
  transition: "all 0.25s ease",
  minHeight: 150,
  display: "flex",
  flexDirection: "column" as const,
  justifyContent: "space-between",
};

const companyCardActive = {
  background:
    "linear-gradient(135deg, rgba(37,99,235,0.98), rgba(79,70,229,0.98))",
  border: "1px solid rgba(255,255,255,0.35)",
  boxShadow: "0 22px 48px rgba(37,99,235,0.30)",
  transform: "translateY(-3px)",
  color: "#fff",
};

const companyCardInactive = {
  background: "rgba(255,255,255,0.88)",
  border: "1px solid rgba(203,213,225,0.92)",
  boxShadow: "0 18px 44px rgba(15,23,42,0.07)",
  color: "#0f172a",
};

const companyTop = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  marginBottom: 16,
};

const companyAvatar = {
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

const selectedPill = {
  padding: "6px 10px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.18)",
  color: "#fff",
  fontSize: 12,
  fontWeight: 900,
};

const normalPill = {
  padding: "6px 10px",
  borderRadius: 999,
  background: "#f1f5f9",
  color: "#475569",
  fontSize: 12,
  fontWeight: 900,
};

const companyTitle = {
  margin: 0,
  color: "inherit",
  fontSize: 16,
  lineHeight: 1.35,
  fontWeight: 900,
};

const companyFooter = {
  display: "flex",
  alignItems: "baseline",
  gap: 7,
  marginTop: 14,
};

const companyCount = {
  fontSize: 28,
  lineHeight: 1,
  fontWeight: 950,
};

const companyCountLabel = {
  fontSize: 13,
  opacity: 0.78,
  fontWeight: 700,
};

const contentContainerStyle = {
  background: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(203,213,225,0.9)",
  boxShadow: "0 24px 70px rgba(15,23,42,0.09)",
  padding: 18,
  borderRadius: 26,
};

const tableHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
  flexWrap: "wrap" as const,
  padding: "2px 2px 16px",
};

const tableTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: 21,
  fontWeight: 950,
};

const tableSubtitle = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: 13,
};

const clearFilterBtn = {
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#334155",
  padding: "10px 13px",
  borderRadius: 14,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 850,
};

const tableWrap = {
  width: "100%",
  overflowX: "auto" as const,
  borderRadius: 18,
  border: "1px solid #e2e8f0",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "separate" as const,
  borderSpacing: 0,
  minWidth: 900,
  background: "#fff",
};

const theadRow = {
  background: "#f8fafc",
};

const thStyle = {
  textAlign: "left" as const,
  padding: "14px",
  color: "#475569",
  fontSize: 12,
  fontWeight: 950,
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em",
  borderBottom: "1px solid #e2e8f0",
  whiteSpace: "nowrap" as const,
  cursor: "pointer",
};

const rowStyle = {
  borderBottom: "1px solid #eef2f7",
};

const tdStyle = {
  padding: "14px",
  color: "#0f172a",
  fontSize: 14,
  borderBottom: "1px solid #eef2f7",
};

const strongText = {
  fontWeight: 850,
  color: "#0f172a",
};

const datePill = {
  display: "inline-flex",
  padding: "7px 10px",
  borderRadius: 999,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#334155",
  fontSize: 13,
  fontWeight: 800,
  whiteSpace: "nowrap" as const,
};

const mobileCards = {
  display: "none",
};

const mobileCardStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  padding: "16px",
  borderRadius: "20px",
  boxShadow: "0 14px 36px rgba(15,23,42,0.07)",
};

const mobileTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 14,
};

const mobileCompanyName = {
  display: "block",
  fontSize: 12,
  color: "#2563eb",
  fontWeight: 900,
  marginBottom: 4,
};

const mobileContractTitle = {
  margin: 0,
  fontSize: 16,
  color: "#0f172a",
  fontWeight: 950,
};

const mobileInfoRow = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  marginTop: 10,
};

const mobileInfoBox = {
  padding: 12,
  borderRadius: 16,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const mobileLabelStyle = {
  fontSize: "11px",
  color: "#64748b",
  margin: 0,
  fontWeight: 850,
};

const mobileValueStyle = {
  fontSize: "13px",
  color: "#0f172a",
  margin: "4px 0 0 0",
  fontWeight: 900,
};

const mobileFooterStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  marginTop: 15,
  paddingTop: 15,
  borderTop: "1px solid #e2e8f0",
  flexWrap: "wrap" as const,
};

const renewBadge = {
  background: "#dcfce7",
  color: "#166534",
  padding: "6px 11px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 950,
  whiteSpace: "nowrap" as const,
};

const noRenewBadge = {
  background: "#f1f5f9",
  color: "#475569",
  padding: "6px 11px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 950,
  whiteSpace: "nowrap" as const,
};

const safeBadge = {
  background: "#dcfce7",
  color: "#166534",
  padding: "6px 11px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 950,
  whiteSpace: "nowrap" as const,
};

const warningBadge = {
  background: "#ffedd5",
  color: "#9a3412",
  padding: "6px 11px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 950,
  whiteSpace: "nowrap" as const,
};

const dangerBadge = {
  background: "#fee2e2",
  color: "#991b1b",
  padding: "6px 11px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 950,
  whiteSpace: "nowrap" as const,
};

const noPdfBadge = {
  display: "inline-flex",
  padding: "7px 10px",
  borderRadius: 999,
  background: "#f1f5f9",
  color: "#64748b",
  fontSize: 12,
  fontWeight: 850,
};

const pdfBtn = {
  display: "inline-flex",
  background: "linear-gradient(135deg, #3b82f6, #2563eb)",
  color: "white",
  padding: "8px 12px",
  borderRadius: 12,
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 900,
};

const emptyBox = {
  padding: "46px 20px",
  borderRadius: 20,
  background: "#f8fafc",
  border: "1px dashed #cbd5e1",
  textAlign: "center" as const,
};

const emptyIcon = {
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

const emptyTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: 18,
  fontWeight: 950,
};

const emptyText = {
  margin: "8px auto 0",
  maxWidth: 430,
  color: "#64748b",
  fontSize: 14,
};