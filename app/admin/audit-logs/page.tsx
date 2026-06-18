"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { supabase } from "@/lib/supabase";

type AuditLog = {
  id: string;
  user_id: string | null;
  user_name: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  description: string | null;
  old_data: any;
  new_data: any;
  created_at: string;
};

type ActionFilter = "ALL" | string;

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  async function loadLogs() {
    setLoading(true);

    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error(error);
      alert("Loglar yüklənmədi");
      setLoading(false);
      return;
    }

    setLogs((data || []) as AuditLog[]);
    setLoading(false);
  }

  useEffect(() => {
    loadLogs();
  }, []);

  function formatDateTime(value: string) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return `${String(date.getDate()).padStart(2, "0")}.${String(
      date.getMonth() + 1
    ).padStart(2, "0")}.${date.getFullYear()} ${String(
      date.getHours()
    ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  function getActionLabel(action: string) {
    const labels: Record<string, string> = {
      CREATE_CONTRACT: "Müqavilə yaradıldı",
      UPDATE_CONTRACT: "Müqavilə yeniləndi",
      ARCHIVE_CONTRACT: "Müqavilə arxivləndi",
      RESTORE_CONTRACT: "Müqavilə geri qaytarıldı",
      DELETE_CONTRACT: "Müqavilə silindi",
      CREATE_USER: "User yaradıldı",
      UPDATE_USER: "User yeniləndi",
      DELETE_USER: "User silindi",
      CHANGE_USER_PASSWORD: "Parol dəyişildi",
      CREATE_COMPANY: "Şirkət yaradıldı",
      UPDATE_COMPANY: "Şirkət yeniləndi",
      DELETE_COMPANY: "Şirkət silindi",
    };

    return labels[action] || action;
  }

  function getActionStyle(action: string): CSSProperties {
    if (action.includes("CREATE")) return actionCreate;
    if (action.includes("UPDATE") || action.includes("CHANGE")) return actionUpdate;
    if (action.includes("DELETE")) return actionDelete;
    if (action.includes("ARCHIVE")) return actionArchive;
    if (action.includes("RESTORE")) return actionRestore;
    return actionDefault;
  }

  function matchesDateRange(log: AuditLog) {
    if (!dateFrom && !dateTo) return true;

    const logTime = new Date(log.created_at).getTime();
    if (Number.isNaN(logTime)) return false;

    const fromTime = dateFrom
      ? new Date(`${dateFrom}T00:00:00`).getTime()
      : null;

    const toTime = dateTo
      ? new Date(`${dateTo}T23:59:59`).getTime()
      : null;

    if (fromTime !== null && logTime < fromTime) return false;
    if (toTime !== null && logTime > toTime) return false;

    return true;
  }

  const actions = useMemo(() => {
    return Array.from(new Set(logs.map((log) => log.action))).sort((a, b) =>
      a.localeCompare(b, "az")
    );
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();

    return logs
      .filter((log) => (actionFilter === "ALL" ? true : log.action === actionFilter))
      .filter(matchesDateRange)
      .filter((log) => {
        if (!q) return true;

        return (
          (log.user_name || "").toLowerCase().includes(q) ||
          (log.action || "").toLowerCase().includes(q) ||
          (log.table_name || "").toLowerCase().includes(q) ||
          (log.record_id || "").toLowerCase().includes(q) ||
          (log.description || "").toLowerCase().includes(q)
        );
      });
  }, [logs, search, actionFilter, dateFrom, dateTo]);

  const createCount = logs.filter((log) => log.action.includes("CREATE")).length;
  const updateCount = logs.filter(
    (log) => log.action.includes("UPDATE") || log.action.includes("CHANGE")
  ).length;
  const deleteCount = logs.filter((log) => log.action.includes("DELETE")).length;

  function clearFilters() {
    setSearch("");
    setActionFilter("ALL");
    setDateFrom("");
    setDateTo("");
  }

  return (
    <div className="audit-page" style={pageStyle}>
      <section className="audit-hero" style={heroCard}>
        <div style={heroGlowOne} />
        <div style={heroGlowTwo} />

        <div className="audit-hero-content" style={heroContent}>
          <div className="audit-hero-left" style={heroLeft}>
            <div className="audit-eyebrow" style={eyebrow}>
              <span style={eyebrowDot} />
              Admin logları
            </div>

            <h1 className="audit-title" style={titleStyle}>
              Audit Loglar
            </h1>

            <p className="audit-subtitle" style={subtitleStyle}>
              Sistemdə kim nə əməliyyat edibsə burada tarix, user, əməliyyat və
              detalları ilə izləyə bilərsiniz.
            </p>
          </div>

          <button onClick={loadLogs} style={refreshButton} type="button">
            🔄 Yenilə
          </button>
        </div>
      </section>

      <section className="audit-stats" style={statsGrid}>
        <div style={statCard}>
          <div style={statTop}>
            <span style={statIconBlue}>🧾</span>
            <span style={statLabel}>Ümumi log</span>
          </div>
          <strong style={statValue}>{logs.length}</strong>
          <span style={statHint}>Son 500 əməliyyat</span>
        </div>

        <div style={statCard}>
          <div style={statTop}>
            <span style={statIconGreen}>＋</span>
            <span style={statLabel}>Yaradılan</span>
          </div>
          <strong style={statValue}>{createCount}</strong>
          <span style={statHint}>CREATE tipli əməliyyatlar</span>
        </div>

        <div style={statCard}>
          <div style={statTop}>
            <span style={statIconPurple}>✎</span>
            <span style={statLabel}>Dəyişiklik</span>
          </div>
          <strong style={statValue}>{updateCount}</strong>
          <span style={statHint}>UPDATE / CHANGE əməliyyatları</span>
        </div>

        <div style={statCard}>
          <div style={statTop}>
            <span style={statIconRed}>🗑️</span>
            <span style={statLabel}>Silinən</span>
          </div>
          <strong style={statValue}>{deleteCount}</strong>
          <span style={statHint}>DELETE tipli əməliyyatlar</span>
        </div>
      </section>

      <section className="audit-toolbar" style={toolbarCard}>
        <div style={toolbarInfo}>
          <h2 style={sectionTitle}>Filter və axtarış</h2>
          <p style={sectionText}>
            User adı, əməliyyat, açıqlama və tarix aralığına görə axtarın.
          </p>
        </div>

        <div style={toolbarRight}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="User, əməliyyat və ya açıqlama üzrə axtar..."
            style={inputStyle}
          />

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            style={inputStyle}
          >
            <option value="ALL">Bütün əməliyyatlar</option>
            {actions.map((action) => (
              <option key={action} value={action}>
                {getActionLabel(action)}
              </option>
            ))}
          </select>

          <div style={dateWrap}>
            <label style={dateLabel}>
              Başlama
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={dateInput}
              />
            </label>

            <label style={dateLabel}>
              Bitmə
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={dateInput}
              />
            </label>
          </div>

          {(search || actionFilter !== "ALL" || dateFrom || dateTo) && (
            <button onClick={clearFilters} style={clearButton} type="button">
              Təmizlə
            </button>
          )}
        </div>
      </section>

      <section className="audit-list-card" style={listCard}>
        <div style={listHeader}>
          <div>
            <h2 style={sectionTitle}>Log siyahısı</h2>
            <p style={sectionText}>
              Göstərilən nəticə: {filteredLogs.length} / {logs.length}
            </p>
          </div>
        </div>

        {loading ? (
          <div style={emptyBox}>
            <div style={emptyIcon}>⏳</div>
            <h3 style={emptyTitle}>Loglar yüklənir</h3>
            <p style={emptyText}>Zəhmət olmasa gözləyin...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={emptyBox}>
            <div style={emptyIcon}>📭</div>
            <h3 style={emptyTitle}>Log tapılmadı</h3>
            <p style={emptyText}>Filterləri dəyişərək yenidən yoxlayın.</p>
          </div>
        ) : (
          <>
            <div className="desktop-table" style={tableWrap}>
              <table style={tableStyle}>
                <thead>
                  <tr style={theadRow}>
                    <th style={thStyle}>Tarix</th>
                    <th style={thStyle}>User</th>
                    <th style={thStyle}>Əməliyyat</th>
                    <th style={thStyle}>Cədvəl</th>
                    <th style={thStyle}>Açıqlama</th>
                    <th style={thStyle}>Detal</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} style={tbodyRow}>
                      <td style={tdStyle}>{formatDateTime(log.created_at)}</td>
                      <td style={tdStyle}>
                        <strong>{log.user_name || "-"}</strong>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ ...actionBadge, ...getActionStyle(log.action) }}>
                          {getActionLabel(log.action)}
                        </span>
                      </td>
                      <td style={tdStyle}>{log.table_name || "-"}</td>
                      <td style={tdStyle}>{log.description || "-"}</td>
                      <td style={tdStyle}>
                        <button
                          type="button"
                          style={detailButton}
                          onClick={() => setSelectedLog(log)}
                        >
                          Bax
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mobile-list" style={mobileList}>
              {filteredLogs.map((log) => (
                <div key={log.id} style={mobileCard}>
                  <div style={mobileTop}>
                    <span style={{ ...actionBadge, ...getActionStyle(log.action) }}>
                      {getActionLabel(log.action)}
                    </span>
                    <span style={mobileDate}>{formatDateTime(log.created_at)}</span>
                  </div>

                  <h3 style={mobileTitle}>{log.user_name || "-"}</h3>
                  <p style={mobileText}>{log.description || "-"}</p>

                  <div style={mobileMeta}>
                    <span>Cədvəl: {log.table_name || "-"}</span>
                    <span>ID: {log.record_id || "-"}</span>
                  </div>

                  <button
                    type="button"
                    style={detailButton}
                    onClick={() => setSelectedLog(log)}
                  >
                    Detala bax
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {selectedLog && (
        <div style={modalOverlay}>
          <div className="audit-modal" style={modalCard}>
            <div style={modalHeader}>
              <div>
                <div style={modalEyebrow}>
                  <span style={modalEyebrowDot} />
                  Log detalı
                </div>
                <h2 style={modalTitle}>{getActionLabel(selectedLog.action)}</h2>
                <p style={modalSubtitle}>{formatDateTime(selectedLog.created_at)}</p>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                style={modalCloseButton}
                type="button"
              >
                ×
              </button>
            </div>

            <div style={detailGrid}>
              <DetailItem label="User" value={selectedLog.user_name || "-"} />
              <DetailItem label="Cədvəl" value={selectedLog.table_name || "-"} />
              <DetailItem label="Record ID" value={selectedLog.record_id || "-"} />
              <DetailItem label="Açıqlama" value={selectedLog.description || "-"} />
            </div>

            <div style={jsonGrid}>
              <div>
                <h3 style={jsonTitle}>Köhnə məlumat</h3>
                <pre style={jsonBox}>
                  {JSON.stringify(selectedLog.old_data, null, 2) || "null"}
                </pre>
              </div>

              <div>
                <h3 style={jsonTitle}>Yeni məlumat</h3>
                <pre style={jsonBox}>
                  {JSON.stringify(selectedLog.new_data, null, 2) || "null"}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .audit-page,
        .audit-page * {
          box-sizing: border-box;
        }

        @media (max-width: 900px) {
          .audit-hero-content,
          .audit-toolbar {
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .audit-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .desktop-table {
            display: none !important;
          }

          .mobile-list {
            display: grid !important;
          }
        }

        @media (min-width: 901px) {
          .mobile-list {
            display: none !important;
          }
        }

        @media (max-width: 560px) {
          .audit-page {
            padding: 18px 12px 28px !important;
          }

          .audit-hero,
          .audit-toolbar,
          .audit-list-card {
            border-radius: 20px !important;
            padding: 16px 14px !important;
          }

          .audit-title {
            font-size: 29px !important;
          }

          .audit-stats {
            grid-template-columns: 1fr !important;
          }

          .audit-modal {
            width: 94vw !important;
            max-height: 90vh !important;
            overflow-y: auto !important;
            padding: 16px 12px !important;
          }
        }
      `}</style>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={detailItem}>
      <span style={detailLabel}>{label}</span>
      <strong style={detailValue}>{value}</strong>
    </div>
  );
}

/* STYLES */

const pageStyle: CSSProperties = {
  width: "100%",
  minHeight: "100svh",
  overflowX: "hidden",
  padding: "26px clamp(14px, 3vw, 32px) 38px",
};

const heroCard: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  borderRadius: 28,
  padding: "28px clamp(20px, 4vw, 34px)",
  marginBottom: 20,
  background:
    "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,64,105,0.96) 52%, rgba(8,47,73,0.98))",
  color: "#fff",
  boxShadow: "0 24px 80px rgba(15,23,42,0.24)",
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
  justifyContent: "space-between",
  alignItems: "center",
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

const refreshButton: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.10)",
  color: "#fff",
  padding: "12px 16px",
  borderRadius: 15,
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 950,
};

const statsGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
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
  fontWeight: 950,
  marginBottom: 8,
};

const statHint: CSSProperties = {
  color: "#64748b",
  fontSize: 12,
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

const statIconPurple: CSSProperties = {
  ...statIconBlue,
  background: "#ede9fe",
};

const statIconRed: CSSProperties = {
  ...statIconBlue,
  background: "#fee2e2",
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
  background: "rgba(255,255,255,0.9)",
  border: "1px solid rgba(203,213,225,0.88)",
  boxShadow: "0 18px 45px rgba(15,23,42,0.07)",
};

const toolbarInfo: CSSProperties = {
  minWidth: 240,
  flex: "1 1 320px",
};

const toolbarRight: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(220px, 1fr) minmax(180px, 240px) auto auto",
  alignItems: "end",
  gap: 10,
  flex: "2 1 640px",
};

const sectionTitle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: 21,
  fontWeight: 950,
};

const sectionText: CSSProperties = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: 13,
  lineHeight: 1.5,
};

const inputStyle: CSSProperties = {
  width: "100%",
  minWidth: 0,
  padding: "13px 14px",
  borderRadius: 15,
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#0f172a",
  fontSize: 14,
  outline: "none",
};

const dateWrap: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 8,
  minWidth: 240,
};

const dateLabel: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 5,
  color: "#475569",
  fontSize: 12,
  fontWeight: 900,
};

const dateInput: CSSProperties = {
  ...inputStyle,
  padding: "12px 13px",
  fontSize: 13,
};

const clearButton: CSSProperties = {
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

const listCard: CSSProperties = {
  padding: 18,
  borderRadius: 26,
  background: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(203,213,225,0.9)",
  boxShadow: "0 24px 70px rgba(15,23,42,0.09)",
};

const listHeader: CSSProperties = {
  padding: "2px 2px 16px",
};

const tableWrap: CSSProperties = {
  width: "100%",
  overflowX: "auto",
  borderRadius: 18,
  border: "1px solid #e2e8f0",
};

const tableStyle: CSSProperties = {
  width: "100%",
  minWidth: 1050,
  borderCollapse: "separate",
  borderSpacing: 0,
  background: "#fff",
};

const theadRow: CSSProperties = {
  background: "#f8fafc",
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: 14,
  color: "#475569",
  fontSize: 12,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  borderBottom: "1px solid #e2e8f0",
  whiteSpace: "nowrap",
};

const tbodyRow: CSSProperties = {};

const tdStyle: CSSProperties = {
  padding: 14,
  color: "#0f172a",
  fontSize: 14,
  borderBottom: "1px solid #eef2f7",
  verticalAlign: "middle",
};

const actionBadge: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const actionCreate: CSSProperties = {
  background: "#dcfce7",
  color: "#166534",
};

const actionUpdate: CSSProperties = {
  background: "#dbeafe",
  color: "#1d4ed8",
};

const actionDelete: CSSProperties = {
  background: "#fee2e2",
  color: "#991b1b",
};

const actionArchive: CSSProperties = {
  background: "#ffedd5",
  color: "#9a3412",
};

const actionRestore: CSSProperties = {
  background: "#ede9fe",
  color: "#5b21b6",
};

const actionDefault: CSSProperties = {
  background: "#f1f5f9",
  color: "#475569",
};

const detailButton: CSSProperties = {
  border: "none",
  borderRadius: 12,
  padding: "8px 11px",
  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
  color: "#fff",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 900,
};

const mobileList: CSSProperties = {
  display: "none",
  gridTemplateColumns: "1fr",
  gap: 12,
};

const mobileCard: CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 14,
  boxShadow: "0 12px 32px rgba(15,23,42,0.06)",
};

const mobileTop: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "center",
  marginBottom: 10,
  flexWrap: "wrap",
};

const mobileDate: CSSProperties = {
  color: "#64748b",
  fontSize: 12,
  fontWeight: 850,
};

const mobileTitle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: 16,
  fontWeight: 950,
};

const mobileText: CSSProperties = {
  margin: "7px 0 0",
  color: "#475569",
  fontSize: 13,
  lineHeight: 1.5,
};

const mobileMeta: CSSProperties = {
  margin: "10px 0 12px",
  display: "grid",
  gap: 4,
  color: "#64748b",
  fontSize: 12,
};

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

const modalOverlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.72)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 999,
  padding: 18,
  backdropFilter: "blur(10px)",
};

const modalCard: CSSProperties = {
  width: 900,
  maxWidth: "96vw",
  maxHeight: "90vh",
  overflowY: "auto",
  background: "rgba(255,255,255,0.96)",
  padding: 22,
  color: "#0f172a",
  borderRadius: 24,
  boxShadow: "0 30px 90px rgba(0,0,0,0.34)",
};

const modalHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  marginBottom: 16,
};

const modalEyebrow: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 10px",
  borderRadius: 999,
  background: "#eff6ff",
  color: "#1d4ed8",
  fontSize: 12,
  fontWeight: 900,
  marginBottom: 8,
};

const modalEyebrowDot: CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: "50%",
  background: "#2563eb",
};

const modalTitle: CSSProperties = {
  margin: 0,
  fontSize: 22,
  fontWeight: 950,
};

const modalSubtitle: CSSProperties = {
  margin: "5px 0 0",
  color: "#64748b",
  fontSize: 13,
};

const modalCloseButton: CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  cursor: "pointer",
  fontSize: 24,
};

const detailGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
  marginBottom: 16,
};

const detailItem: CSSProperties = {
  padding: 12,
  borderRadius: 15,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const detailLabel: CSSProperties = {
  display: "block",
  color: "#64748b",
  fontSize: 12,
  fontWeight: 850,
  marginBottom: 5,
};

const detailValue: CSSProperties = {
  color: "#0f172a",
  fontSize: 13,
  fontWeight: 950,
  wordBreak: "break-word",
};

const jsonGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 12,
};

const jsonTitle: CSSProperties = {
  margin: "0 0 8px",
  color: "#0f172a",
  fontSize: 14,
  fontWeight: 950,
};

const jsonBox: CSSProperties = {
  margin: 0,
  maxHeight: 360,
  overflow: "auto",
  padding: 12,
  borderRadius: 15,
  background: "#0f172a",
  color: "#dbeafe",
  fontSize: 12,
  lineHeight: 1.5,
};
