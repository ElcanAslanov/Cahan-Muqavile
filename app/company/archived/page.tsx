"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { supabase } from "@/lib/supabase";

type Contract = {
  id: string;
  company_name: string;
  counterparty: string;
  start_date: string;
  end_date: string;
  file_url: string | null;
  auto_renew?: boolean;
};

export default function ArchivedContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function loadContracts() {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
      setLoading(false);
      return;
    }

    const { data: userCompanies } = await supabase
      .from("user_companies")
      .select("company_id")
      .eq("user_id", userId);

    if (!userCompanies) {
      setLoading(false);
      return;
    }

    const companyIds = userCompanies.map((c) => c.company_id);

    const { data } = await supabase
      .from("contracts")
      .select("*")
      .in("company_id", companyIds)
      .eq("status", "archived")
      .order("created_at", { ascending: false });

    if (data) {
      setContracts(data);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadContracts();
  }, []);

  const filtered = contracts.filter(
    (c) =>
      (c.company_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.counterparty || "").toLowerCase().includes(search.toLowerCase())
  );

  function formatDate(dateStr: string) {
    if (!dateStr) return "-";

    const date = new Date(dateStr);

    if (Number.isNaN(date.getTime())) {
      return dateStr;
    }

    return `${String(date.getDate()).padStart(2, "0")}.${String(
      date.getMonth() + 1
    ).padStart(2, "0")}.${date.getFullYear()}`;
  }

  const pdfCount = contracts.filter((c) => c.file_url).length;
  const autoRenewCount = contracts.filter((c) => c.auto_renew).length;
  const companyCount = new Set(contracts.map((c) => c.company_name)).size;

  return (
    <div style={pageStyle}>
      {/* HEADER */}
      <section style={heroCard}>
        <div style={heroGlowOne} />
        <div style={heroGlowTwo} />

        <div style={heroContent}>
          <div style={heroLeft}>
            <div style={eyebrow}>
              <span style={eyebrowDot} />
              Arxiv bölməsi
            </div>

            <h1 style={titleStyle}>Arxiv Müqavilələr</h1>

            <p style={subtitleStyle}>
              Arxivə göndərilmiş müqavilələri şirkət və qarşı tərəf üzrə
              axtarın, PDF fayllarına baxın və müqavilə məlumatlarını izləyin.
            </p>
          </div>

          <div style={heroRight}>
            <div style={heroMiniCard}>
              <span style={heroMiniLabel}>Nəticə</span>
              <strong style={heroMiniValue}>{filtered.length}</strong>
              <span style={heroMiniHint}>göstərilən müqavilə</span>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={statsGrid}>
        <div style={statCard}>
          <div style={statTop}>
            <span style={statIconBlue}>🗄️</span>
            <span style={statLabel}>Arxiv müqavilələr</span>
          </div>

          <strong style={statValue}>{contracts.length}</strong>

          <span style={statHint}>
            Sizin şirkətləriniz üzrə arxivdə olan müqavilələr
          </span>
        </div>

        <div style={statCard}>
          <div style={statTop}>
            <span style={statIconGreen}>📎</span>
            <span style={statLabel}>PDF-i olanlar</span>
          </div>

          <strong style={statValue}>{pdfCount}</strong>

          <span style={statHint}>Fayl linki əlavə edilmiş müqavilələr</span>
        </div>

        <div style={statCard}>
          <div style={statTop}>
            <span style={statIconOrange}>🔁</span>
            <span style={statLabel}>Avto yenilənən</span>
          </div>

          <strong style={statValue}>{autoRenewCount}</strong>

          <span style={statHint}>Avtomatik yenilənmə seçilmiş müqavilələr</span>
        </div>

        <div style={statCard}>
          <div style={statTop}>
            <span style={statIconPurple}>🏢</span>
            <span style={statLabel}>Şirkət sayı</span>
          </div>

          <strong style={statValue}>{companyCount}</strong>

          <span style={statHint}>Arxiv müqaviləsi olan şirkətlər</span>
        </div>
      </section>

      {/* SEARCH */}
      <section style={toolbarCard}>
        <div style={toolbarInfo}>
          <h2 style={toolbarTitle}>Axtarış</h2>

          <p style={toolbarText}>
            Şirkət adı və ya müqavilə tərəfi üzrə axtarış edə bilərsiniz.
          </p>
        </div>

        <div style={searchWrap}>
          <span style={searchIcon}>⌕</span>

          <input
            placeholder="Şirkət və ya müqavilə axtar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={searchInput}
          />
        </div>
      </section>

      {/* DESKTOP TABLE */}
      <section style={tableSection}>
        <div style={tableHeader}>
          <div>
            <h2 style={tableTitle}>Arxiv siyahısı</h2>

            <p style={tableSubtitle}>
              Göstərilən nəticə: {filtered.length} / {contracts.length}
            </p>
          </div>

          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              style={clearButton}
            >
              Axtarışı təmizlə
            </button>
          )}
        </div>

        <div style={tableWrap} className="desktop-table">
          {loading ? (
            <div style={loadingBox}>
              <div style={spinner} />
              <h3 style={loadingTitle}>Məlumatlar yüklənir</h3>
              <p style={loadingText}>
                Arxiv müqavilələri yoxlanılır, zəhmət olmasa gözləyin...
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={emptyBox}>
              <div style={emptyIcon}>📭</div>
              <h3 style={emptyTitle}>Arxiv müqavilə tapılmadı</h3>
              <p style={emptyText}>
                Axtarış sözünü dəyişərək yenidən yoxlayın və ya arxivdə
                müqavilə olmadığından əmin olun.
              </p>
            </div>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr style={theadRow}>
                  <th style={thStyle}>Şirkət</th>
                  <th style={thStyle}>Müqavilə</th>
                  <th style={thStyle}>Başlama</th>
                  <th style={thStyle}>Bitmə</th>
                  <th style={thStyle}>Avtomatik yeniləmə</th>
                  <th style={thStyle}>PDF</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} style={tbodyRow}>
                    <td style={tdStyle}>
                      <div style={companyCell}>
                        <span style={companyAvatar}>
                          {(c.company_name || "?")
                            .trim()
                            .slice(0, 1)
                            .toUpperCase()}
                        </span>

                        <span style={companyName}>{c.company_name}</span>
                      </div>
                    </td>

                    <td style={tdStyle}>
                      <span style={counterpartyText}>{c.counterparty}</span>
                    </td>

                    <td style={tdStyle}>
                      <span style={datePill}>{formatDate(c.start_date)}</span>
                    </td>

                    <td style={tdStyle}>
                      <span style={datePill}>{formatDate(c.end_date)}</span>
                    </td>

                    <td style={tdStyle}>
                      {c.auto_renew ? (
                        <span style={greenBadge}>Avto yenilənir</span>
                      ) : (
                        <span style={redBadge}>Yenilənmir</span>
                      )}
                    </td>

                    <td style={tdStyle}>
                      {c.file_url ? (
                        <a
                          href={c.file_url}
                          target="_blank"
                          rel="noreferrer"
                          style={pdfBtn}
                        >
                          PDF aç
                        </a>
                      ) : (
                        <span style={noPdfBadge}>PDF yoxdur</span>
                      )}
                    </td>

                    <td style={tdStyle}>
                      <span style={archiveBadge}>Arxiv</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* MOBILE CARDS */}
        <div className="mobile-cards" style={mobileCards}>
          {loading ? (
            <div style={mobileInfoCard}>
              <div style={spinner} />
              <h3 style={loadingTitle}>Məlumatlar yüklənir</h3>
              <p style={loadingText}>Arxiv müqavilələri yoxlanılır...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={mobileInfoCard}>
              <div style={emptyIcon}>📭</div>
              <h3 style={emptyTitle}>Arxiv müqavilə tapılmadı</h3>
              <p style={emptyText}>
                Axtarış sözünü dəyişərək yenidən yoxlayın.
              </p>
            </div>
          ) : (
            filtered.map((c) => (
              <div key={c.id} style={mobileCard}>
                <div style={mobileTop}>
                  <div style={mobileTitleWrap}>
                    <span style={mobileCompanyAvatar}>
                      {(c.company_name || "?")
                        .trim()
                        .slice(0, 1)
                        .toUpperCase()}
                    </span>

                    <div>
                      <h3 style={mobileCompany}>{c.company_name}</h3>

                      <p style={mobileCounterparty}>{c.counterparty}</p>
                    </div>
                  </div>

                  <span style={archiveBadge}>Arxiv</span>
                </div>

                <div style={mobileGrid}>
                  <div style={mobileField}>
                    <p style={mobileLabel}>Başlama</p>
                    <p style={mobileValue}>{formatDate(c.start_date)}</p>
                  </div>

                  <div style={mobileField}>
                    <p style={mobileLabel}>Bitmə</p>
                    <p style={mobileValue}>{formatDate(c.end_date)}</p>
                  </div>
                </div>

                <div style={mobileActions}>
                  {c.auto_renew ? (
                    <span style={greenBadge}>Avto yenilənir</span>
                  ) : (
                    <span style={redBadge}>Yenilənmir</span>
                  )}

                  {c.file_url ? (
                    <a
                      href={c.file_url}
                      target="_blank"
                      rel="noreferrer"
                      style={pdfBtn}
                    >
                      PDF
                    </a>
                  ) : (
                    <span style={noPdfBadge}>PDF yoxdur</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <style jsx>{`
        .mobile-cards {
          display: none;
        }

        @media (max-width: 900px) {
          .desktop-table {
            display: none;
          }

          .mobile-cards {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

/* PAGE */

const pageStyle: CSSProperties = {
  width: "100%",
  minHeight: "calc(100vh - 120px)",
};

/* HERO */

const heroCard: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  borderRadius: 28,
  padding: "28px clamp(20px, 4vw, 34px)",
  marginBottom: 20,
  background:
    "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(55,65,81,0.96) 52%, rgba(30,41,59,0.98))",
  border: "1px solid rgba(148, 163, 184, 0.20)",
  boxShadow: "0 24px 80px rgba(15, 23, 42, 0.24)",
  color: "#fff",
};

const heroGlowOne: CSSProperties = {
  position: "absolute",
  width: 260,
  height: 260,
  borderRadius: "50%",
  right: -80,
  top: -100,
  background: "rgba(148,163,184,0.24)",
  filter: "blur(8px)",
};

const heroGlowTwo: CSSProperties = {
  position: "absolute",
  width: 220,
  height: 220,
  borderRadius: "50%",
  left: "34%",
  bottom: -150,
  background: "rgba(59,130,246,0.20)",
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
  flex: "1 1 460px",
};

const eyebrow: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 9,
  padding: "7px 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.09)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#e2e8f0",
  fontSize: 13,
  fontWeight: 800,
  marginBottom: 14,
};

const eyebrowDot: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "#94a3b8",
  boxShadow: "0 0 0 5px rgba(148,163,184,0.16)",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "clamp(28px, 4vw, 42px)",
  lineHeight: 1.08,
  letterSpacing: "-0.055em",
  fontWeight: 950,
  color: "#fff",
};

const subtitleStyle: CSSProperties = {
  margin: "14px 0 0",
  maxWidth: 680,
  color: "#cbd5e1",
  fontSize: 15,
  lineHeight: 1.7,
};

const heroRight: CSSProperties = {
  flex: "0 0 auto",
};

const heroMiniCard: CSSProperties = {
  minWidth: 170,
  padding: 18,
  borderRadius: 22,
  background: "rgba(255,255,255,0.10)",
  border: "1px solid rgba(255,255,255,0.14)",
  boxShadow: "0 16px 40px rgba(0,0,0,0.16)",
  backdropFilter: "blur(14px)",
};

const heroMiniLabel: CSSProperties = {
  display: "block",
  color: "#cbd5e1",
  fontSize: 12,
  fontWeight: 800,
  marginBottom: 8,
};

const heroMiniValue: CSSProperties = {
  display: "block",
  color: "#fff",
  fontSize: 38,
  lineHeight: 1,
  fontWeight: 950,
  letterSpacing: "-0.06em",
};

const heroMiniHint: CSSProperties = {
  display: "block",
  color: "#cbd5e1",
  fontSize: 12,
  marginTop: 8,
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

const statIconGreen: CSSProperties = {
  ...statIconBlue,
  background: "#dcfce7",
};

const statIconOrange: CSSProperties = {
  ...statIconBlue,
  background: "#ffedd5",
};

const statIconPurple: CSSProperties = {
  ...statIconBlue,
  background: "#ede9fe",
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
  flex: "1 1 320px",
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

const searchWrap: CSSProperties = {
  flex: "1 1 380px",
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

const searchInput: CSSProperties = {
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

/* TABLE */

const tableSection: CSSProperties = {
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

const clearButton: CSSProperties = {
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
  minWidth: 960,
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

const tbodyRow: CSSProperties = {
  borderBottom: "1px solid #eef2f7",
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

const companyAvatar: CSSProperties = {
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

const companyName: CSSProperties = {
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

const greenBadge: CSSProperties = {
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

const redBadge: CSSProperties = {
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

const archiveBadge: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f1f5f9",
  border: "1px solid #cbd5e1",
  padding: "6px 11px",
  borderRadius: 999,
  fontSize: 12,
  color: "#334155",
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

/* BUTTON */

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

/* LOADING / EMPTY */

const loadingBox: CSSProperties = {
  padding: "42px 20px",
  textAlign: "center",
  color: "#64748b",
};

const spinner: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: "50%",
  margin: "0 auto 16px",
  border: "4px solid #e2e8f0",
  borderTopColor: "#3b82f6",
  animation: "spin 0.9s linear infinite",
};

const loadingTitle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: 18,
  fontWeight: 950,
  letterSpacing: "-0.03em",
};

const loadingText: CSSProperties = {
  margin: "8px auto 0",
  maxWidth: 420,
  color: "#64748b",
  fontSize: 14,
  lineHeight: 1.55,
};

const emptyBox: CSSProperties = {
  padding: "42px 20px",
  textAlign: "center",
  color: "#64748b",
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
  maxWidth: 430,
  color: "#64748b",
  fontSize: 14,
  lineHeight: 1.55,
};

/* MOBILE */

const mobileCards: CSSProperties = {};

const mobileInfoCard: CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 20,
  padding: 22,
  textAlign: "center",
  boxShadow: "0 14px 36px rgba(15,23,42,0.07)",
};

const mobileCard: CSSProperties = {
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

const mobileTitleWrap: CSSProperties = {
  display: "flex",
  alignItems: "center",
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

const mobileCompany: CSSProperties = {
  margin: 0,
  fontSize: 16,
  lineHeight: 1.3,
  color: "#0f172a",
  fontWeight: 950,
  letterSpacing: "-0.025em",
};

const mobileCounterparty: CSSProperties = {
  margin: "4px 0 0",
  color: "#64748b",
  fontSize: 13,
  lineHeight: 1.45,
};

const mobileGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  marginBottom: 14,
};

const mobileField: CSSProperties = {
  padding: 12,
  borderRadius: 16,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const mobileLabel: CSSProperties = {
  margin: 0,
  fontSize: 12,
  color: "#64748b",
  fontWeight: 850,
};

const mobileValue: CSSProperties = {
  margin: "5px 0 0",
  fontSize: 14,
  color: "#0f172a",
  fontWeight: 900,
};

const mobileActions: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};