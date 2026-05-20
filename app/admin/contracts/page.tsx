"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { supabase } from "@/lib/supabase";

type Contract = {
  id: string;
  counterparty: string;
  start_date: string;
  end_date: string;
  file_url: string | null;
  auto_renew: boolean;
  status: "active" | "archived";
};

type Company = {
  id: string;
  name: string;
};

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [tab, setTab] = useState<"active" | "archived">("active");

  const [counterparty, setCounterparty] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [duration, setDuration] = useState("12");
  const [autoRenew, setAutoRenew] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [editingContract, setEditingContract] = useState<any>(null);

  async function loadContracts() {
    const { data } = await supabase
      .from("contracts")
      .select("*")
      .eq("status", tab)
      .order("created_at", { ascending: false });

    if (data) setContracts(data as Contract[]);
  }

  async function loadCompanies() {
    const { data } = await supabase.from("companies").select("*");
    if (data) setCompanies(data);
  }

  function calculateEndDate(start: string, months: number) {
    const date = new Date(start);
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split("T")[0];
  }

  async function uploadFile(): Promise<string | null> {
    if (!file) return null;

    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("contracts")
      .upload(fileName, file);

    if (error) {
      alert("Upload error: " + error.message);
      return null;
    }

    return fileName;
  }

  async function addContract() {
    if (!counterparty || !companyId || !startDate) return;

    const endDate = calculateEndDate(startDate, parseInt(duration));
    const fileName = await uploadFile();

    await supabase.from("contracts").insert({
      counterparty,
      company_id: companyId,
      start_date: startDate,
      end_date: endDate,
      duration_month: parseInt(duration),
      auto_renew: autoRenew,
      file_url: fileName,
      status: "active",
    });

    resetForm();
    loadContracts();
  }

  async function archiveContract(id: string) {
    const confirmDelete = confirm("Muqavile arxive gonderilsin?");
    if (!confirmDelete) return;

    await supabase.from("contracts").update({ status: "archived" }).eq("id", id);

    loadContracts();
  }

  async function restoreContract(id: string) {
    await supabase.from("contracts").update({ status: "active" }).eq("id", id);

    loadContracts();
  }

  async function deleteContract(id: string) {
    const confirmDelete = confirm("Bu muqavile tam silinsin?");
    if (!confirmDelete) return;

    const { error } = await supabase.from("contracts").delete().eq("id", id);

    if (error) {
      alert("Delete error: " + error.message);
      console.log("DELETE ERROR:", error);
      return;
    }

    loadContracts();
  }

  async function updateContract() {
    if (!editingContract) return;

    const selectedCompany = companies.find(
      (c) => c.id === editingContract.company_id
    );

    const { error } = await supabase
      .from("contracts")
      .update({
        counterparty: editingContract.counterparty,
        start_date: editingContract.start_date,
        end_date: editingContract.end_date,
        company_id: editingContract.company_id,
        company_name: selectedCompany?.name || null,
      })
      .eq("id", editingContract.id);

    if (!error) {
      setEditingContract(null);
      loadContracts();
    }
  }

  function resetForm() {
    setCounterparty("");
    setCompanyId("");
    setStartDate("");
    setDuration("12");
    setAutoRenew(false);
    setFile(null);
  }

  useEffect(() => {
    loadContracts();
  }, [tab]);

  useEffect(() => {
    loadCompanies();
  }, []);

  return (
    <div className="admin-contracts-page" style={pageStyle}>
      {/* HERO */}
      <section className="contracts-hero" style={heroCard}>
        <div style={heroGlowOne} />
        <div style={heroGlowTwo} />

        <div className="contracts-hero-content" style={heroContent}>
          <div className="contracts-hero-left" style={heroLeft}>
            <div className="contracts-eyebrow" style={eyebrow}>
              <span style={eyebrowDot} />
              Admin panel
            </div>

            <h1 className="contracts-title" style={titleStyle}>
              Müqavilələr
            </h1>

            <p className="contracts-subtitle" style={subtitleStyle}>
              Aktiv və arxiv müqavilələri idarə edin, yeni müqavilə yaradın,
              mövcud müqavilələri redaktə edin və statuslarını dəyişin.
            </p>
          </div>

          <div className="contracts-hero-mini" style={heroMiniCard}>
            <span style={heroMiniLabel}>
              {tab === "active" ? "Aktiv müqavilə" : "Arxiv müqavilə"}
            </span>
            <strong style={heroMiniValue}>{contracts.length}</strong>
            <span style={heroMiniHint}>hazırda göstərilir</span>
          </div>
        </div>
      </section>

      {/* TABS */}
      <section className="contracts-tabs-card" style={tabsCard}>
        <div style={tabsInfo}>
          <h2 style={sectionTitle}>Status filteri</h2>
          <p style={sectionText}>Aktiv və arxiv müqavilələr arasında keçid edin.</p>
        </div>

        <div className="contracts-tabs" style={tabsWrap}>
          <button
            onClick={() => setTab("active")}
            style={{
              ...tabButton,
              ...(tab === "active" ? activeTabButton : {}),
            }}
            type="button"
          >
            Aktiv
          </button>

          <button
            onClick={() => setTab("archived")}
            style={{
              ...tabButton,
              ...(tab === "archived" ? activeTabButton : {}),
            }}
            type="button"
          >
            Arxiv
          </button>
        </div>
      </section>

      {/* FORM */}
      {tab === "active" && (
        <section className="contracts-form-card" style={formCard}>
          <div className="contracts-form-header" style={formHeader}>
            <div>
              <h2 style={sectionTitle}>Yeni müqavilə əlavə et</h2>
              <p style={sectionText}>
                Müqavilə məlumatlarını daxil edin və PDF faylını əlavə edin.
              </p>
            </div>

            <span style={statusPill}>Yeni müqavilə</span>
          </div>

          <div className="contracts-form-grid" style={formGrid}>
            <input
              placeholder="Müqavilə / qarşı tərəf"
              value={counterparty}
              onChange={(e) => setCounterparty(e.target.value)}
              style={inputStyle}
            />

            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              style={inputStyle}
            >
              <option value="">Şirkət seçin</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={inputStyle}
            />

            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              style={inputStyle}
            >
              <option value="1">1 ay</option>
              <option value="3">3 ay</option>
              <option value="6">6 ay</option>
              <option value="12">1 il</option>
              <option value="24">2 il</option>
              <option value="36">3 il</option>
            </select>
          </div>

          <div className="contracts-form-bottom" style={formBottom}>
            <label style={checkboxLabel}>
              <span>Avtomatik yeniləmə</span>
              <input
                type="checkbox"
                checked={autoRenew}
                onChange={(e) => setAutoRenew(e.target.checked)}
              />
            </label>

            <input
              type="file"
              id="pdfUpload"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              style={{ display: "none" }}
            />

            <label htmlFor="pdfUpload" style={fileButton}>
              📎 {file ? file.name : "PDF seç"}
            </label>

            <button onClick={addContract} style={addButton} type="button">
              ＋ Əlavə et
            </button>
          </div>
        </section>
      )}

      {/* LIST */}
      <section className="contracts-list-card" style={listCard}>
        <div className="contracts-list-header" style={listHeader}>
          <div>
            <h2 style={sectionTitle}>
              {tab === "active" ? "Aktiv müqavilələr" : "Arxiv müqavilələr"}
            </h2>
            <p style={sectionText}>Göstərilən nəticə: {contracts.length}</p>
          </div>
        </div>

        {contracts.length === 0 ? (
          <div style={emptyBox}>
            <div style={emptyIcon}>📭</div>
            <h3 style={emptyTitle}>Müqavilə tapılmadı</h3>
            <p style={emptyText}>Bu status üzrə hələ müqavilə yoxdur.</p>
          </div>
        ) : (
          <div className="contracts-list" style={contractsList}>
            {contracts.map((c) => {
              const pdfUrl = c.file_url
                ? supabase.storage.from("contracts").getPublicUrl(c.file_url).data
                    .publicUrl
                : null;

              return (
                <div key={c.id} className="contract-item" style={contractItem}>
                  <div style={contractLeft}>
                    <span style={contractAvatar}>
                      {c.counterparty?.trim().slice(0, 1).toUpperCase() || "M"}
                    </span>

                    <div style={contractInfo}>
                      <b style={contractTitle}>{c.counterparty}</b>
                      <div style={contractDate}>
                        {c.start_date} → {c.end_date}
                      </div>
                    </div>
                  </div>

                  <div className="contract-actions" style={contractActions}>
                    {pdfUrl && (
                      <a
                        href={pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={pdfButton}
                      >
                        PDF
                      </a>
                    )}

                    {tab === "active" ? (
                      <>
                        <button
                          onClick={() => setEditingContract(c)}
                          style={editButton}
                          type="button"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => archiveContract(c.id)}
                          style={archiveButton}
                          type="button"
                        >
                          Arxivə at
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => restoreContract(c.id)}
                          style={restoreButton}
                          type="button"
                        >
                          Geri qaytar
                        </button>

                        <button
                          onClick={() => deleteContract(c.id)}
                          style={deleteButton}
                          type="button"
                        >
                          Sil
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* EDIT MODAL */}
      {editingContract && (
        <div style={modalOverlay}>
          <div className="contracts-modal" style={modalCard}>
            <div style={modalHeader}>
              <div>
                <div style={modalEyebrow}>
                  <span style={modalEyebrowDot} />
                  Redaktə
                </div>
                <h3 style={modalTitle}>Edit Müqavilə</h3>
              </div>

              <button
                onClick={() => setEditingContract(null)}
                style={modalCloseButton}
                type="button"
              >
                ×
              </button>
            </div>

            <div style={modalForm}>
              <input
                value={editingContract.counterparty}
                onChange={(e) =>
                  setEditingContract({
                    ...editingContract,
                    counterparty: e.target.value,
                  })
                }
                style={modalInput}
              />

              <select
                value={editingContract.company_id || ""}
                onChange={(e) =>
                  setEditingContract({
                    ...editingContract,
                    company_id: e.target.value,
                  })
                }
                style={modalInput}
              >
                <option value="">Şirkət seç</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={editingContract.start_date}
                onChange={(e) =>
                  setEditingContract({
                    ...editingContract,
                    start_date: e.target.value,
                  })
                }
                style={modalInput}
              />

              <input
                type="date"
                value={editingContract.end_date}
                onChange={(e) =>
                  setEditingContract({
                    ...editingContract,
                    end_date: e.target.value,
                  })
                }
                style={modalInput}
              />
            </div>

            <div style={modalActions}>
              <button onClick={updateContract} style={saveButton} type="button">
                Save
              </button>

              <button
                onClick={() => setEditingContract(null)}
                style={cancelButton}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .admin-contracts-page,
        .admin-contracts-page * {
          box-sizing: border-box;
        }

        .contract-item {
          transition: transform 0.2s ease, box-shadow 0.2s ease,
            border-color 0.2s ease;
        }

        .contract-item:hover {
          transform: translateY(-2px);
          border-color: rgba(59, 130, 246, 0.35) !important;
          box-shadow: 0 18px 44px rgba(15, 23, 42, 0.1) !important;
        }

        @media (max-width: 900px) {
          .contracts-hero-content,
          .contracts-tabs-card,
          .contracts-form-header,
          .contract-item {
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .contracts-hero-left,
          .contracts-hero-mini {
            min-width: 0 !important;
            width: 100% !important;
          }

          .contracts-form-grid {
            grid-template-columns: 1fr !important;
          }

          .contracts-form-bottom,
          .contract-actions {
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .contract-actions a,
          .contract-actions button,
          .contracts-form-bottom label,
          .contracts-form-bottom button {
            width: 100% !important;
            justify-content: center !important;
          }
        }

        @media (max-width: 560px) {
          .admin-contracts-page {
            padding: 18px 12px 28px !important;
          }

          .contracts-hero,
          .contracts-form-card,
          .contracts-list-card,
          .contracts-tabs-card {
            border-radius: 20px !important;
            padding: 16px 14px !important;
          }

          .contracts-title {
            font-size: 29px !important;
          }

          .contracts-subtitle {
            font-size: 14px !important;
            line-height: 1.6 !important;
          }

          .contracts-tabs {
            width: 100% !important;
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
          }

          .contract-left {
            align-items: flex-start !important;
          }

          .contracts-modal {
            width: 94vw !important;
            max-height: 90vh !important;
            overflow-y: auto !important;
          }
        }
      `}</style>
    </div>
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
  // flex: "1 1 520px",
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

const heroMiniCard: CSSProperties = {
  minWidth: 190,
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

/* COMMON */

const sectionTitle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: 21,
  fontWeight: 950,
  letterSpacing: "-0.04em",
};

const sectionText: CSSProperties = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: 13,
  lineHeight: 1.5,
};

/* TABS */

const tabsCard: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 18,
  marginBottom: 20,
  padding: 18,
  borderRadius: 22,
  background: "rgba(255,255,255,0.9)",
  border: "1px solid rgba(203,213,225,0.88)",
  boxShadow: "0 18px 45px rgba(15,23,42,0.07)",
};

const tabsInfo: CSSProperties = {
  minWidth: 220,
};

const tabsWrap: CSSProperties = {
  display: "flex",
  gap: 10,
};

const tabButton: CSSProperties = {
  padding: "11px 16px",
  background: "#f1f5f9",
  color: "#334155",
  border: "1px solid #cbd5e1",
  borderRadius: 14,
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 900,
};

const activeTabButton: CSSProperties = {
  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.18)",
  boxShadow: "0 14px 30px rgba(37,99,235,0.24)",
};

/* FORM */

const formCard: CSSProperties = {
  marginBottom: 20,
  padding: 20,
  borderRadius: 24,
  background: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(203,213,225,0.9)",
  boxShadow: "0 24px 70px rgba(15,23,42,0.09)",
};

const formHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  flexWrap: "wrap",
  marginBottom: 18,
};

const statusPill: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "7px 11px",
  borderRadius: 999,
  background: "#dcfce7",
  border: "1px solid #bbf7d0",
  color: "#166534",
  fontSize: 12,
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const formGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 12,
};

const inputStyle: CSSProperties = {
  width: "100%",
  minWidth: 0,
  padding: "13px 14px",
  background: "#fff",
  border: "1px solid #cbd5e1",
  borderRadius: 15,
  color: "#0f172a",
  fontSize: 14,
  outline: "none",
};

const formBottom: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  marginTop: 14,
};

const checkboxLabel: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "11px 13px",
  borderRadius: 14,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#334155",
  fontSize: 13,
  fontWeight: 850,
};

const fileButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "11px 14px",
  borderRadius: 14,
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1d4ed8",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 900,
  maxWidth: 260,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const addButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
  color: "#fff",
  padding: "12px 16px",
  borderRadius: 14,
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 950,
  boxShadow: "0 16px 34px rgba(37,99,235,0.22)",
};

/* LIST */

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

const contractsList: CSSProperties = {
  display: "grid",
  gap: 12,
};

const contractItem: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  padding: 16,
  borderRadius: 20,
  background: "#fff",
  border: "1px solid #e2e8f0",
  boxShadow: "0 12px 32px rgba(15,23,42,0.06)",
};

const contractLeft: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  minWidth: 0,
};

const contractAvatar: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 16,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#e0f2fe",
  color: "#0369a1",
  fontWeight: 950,
  flexShrink: 0,
};

const contractInfo: CSSProperties = {
  minWidth: 0,
};

const contractTitle: CSSProperties = {
  display: "block",
  color: "#0f172a",
  fontSize: 15,
  fontWeight: 950,
  lineHeight: 1.35,
  wordBreak: "break-word",
};

const contractDate: CSSProperties = {
  marginTop: 4,
  color: "#64748b",
  fontSize: 12,
  fontWeight: 750,
};

const contractActions: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 8,
  flexWrap: "wrap",
};

const pdfButton: CSSProperties = {
  display: "inline-flex",
  justifyContent: "center",
  color: "#fff",
  background: "linear-gradient(135deg, #3b82f6, #2563eb)",
  padding: "8px 12px",
  borderRadius: 12,
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 900,
};

const editButton: CSSProperties = {
  ...pdfButton,
  border: "none",
  cursor: "pointer",
};

const archiveButton: CSSProperties = {
  ...pdfButton,
  background: "linear-gradient(135deg, #f59e0b, #d97706)",
  border: "none",
  cursor: "pointer",
};

const restoreButton: CSSProperties = {
  ...pdfButton,
  background: "linear-gradient(135deg, #16a34a, #15803d)",
  border: "none",
  cursor: "pointer",
};

const deleteButton: CSSProperties = {
  ...pdfButton,
  background: "linear-gradient(135deg, #dc2626, #b91c1c)",
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

/* MODAL */

const modalOverlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.72)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
  padding: 18,
  backdropFilter: "blur(10px)",
};

const modalCard: CSSProperties = {
  width: 430,
  background: "rgba(255,255,255,0.96)",
  padding: 22,
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
  color: "#0f172a",
  fontSize: 22,
  fontWeight: 950,
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

const modalForm: CSSProperties = {
  display: "grid",
  gap: 10,
};

const modalInput: CSSProperties = {
  width: "100%",
  padding: "12px 13px",
  border: "1px solid #cbd5e1",
  borderRadius: 15,
  background: "#fff",
  color: "#0f172a",
  fontSize: 14,
  outline: "none",
};

const modalActions: CSSProperties = {
  display: "flex",
  gap: 10,
  marginTop: 16,
};

const saveButton: CSSProperties = {
  flex: 1,
  background: "linear-gradient(135deg, #16a34a, #15803d)",
  color: "#fff",
  padding: "12px 14px",
  borderRadius: 15,
  border: "none",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 950,
};

const cancelButton: CSSProperties = {
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