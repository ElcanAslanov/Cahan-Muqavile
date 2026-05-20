"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { supabase } from "@/lib/supabase";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [name, setName] = useState("");

  async function loadCompanies() {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    if (data) setCompanies(data);
  }

  async function addCompany() {
    if (!name.trim()) return;

    const { error } = await supabase.from("companies").insert({
      name,
    });

    if (error) {
      console.error(error);
      return;
    }

    setName("");
    loadCompanies();
  }

  async function deleteCompany(id: string) {
    const confirmDelete = confirm("Bu şirkəti silmək istəyirsiniz?");
    if (!confirmDelete) return;

    const { error } = await supabase.from("companies").delete().eq("id", id);

    if (error) {
      console.error(error);
      return;
    }

    loadCompanies();
  }

  useEffect(() => {
    loadCompanies();
  }, []);

  return (
    <div className="admin-companies-page" style={pageStyle}>
      {/* HERO */}
      <section className="companies-hero" style={heroCard}>
        <div style={heroGlowOne} />
        <div style={heroGlowTwo} />

        <div className="companies-hero-content" style={heroContent}>
          <div className="companies-hero-left" style={heroLeft}>
            <div className="companies-eyebrow" style={eyebrow}>
              <span style={eyebrowDot} />
              Admin panel
            </div>

            <h1 className="companies-title" style={titleStyle}>
              Şirkətlər
            </h1>

            <p className="companies-subtitle" style={subtitleStyle}>
              Sistemdəki şirkətləri idarə edin, yeni şirkət əlavə edin və
              lazım olduqda mövcud şirkətləri silin.
            </p>
          </div>

          <div className="companies-hero-mini" style={heroMiniCard}>
            <span style={heroMiniLabel}>Ümumi şirkət</span>
            <strong style={heroMiniValue}>{companies.length}</strong>
            <span style={heroMiniHint}>sistemdə qeydiyyatdadır</span>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="companies-stats" style={statsGrid}>
        <div style={statCard}>
          <div style={statTop}>
            <span style={statIconBlue}>🏢</span>
            <span style={statLabel}>Şirkətlər</span>
          </div>

          <strong style={statValue}>{companies.length}</strong>
          <span style={statHint}>Sistemdə yaradılmış şirkət sayı</span>
        </div>

        <div style={statCard}>
          <div style={statTop}>
            <span style={statIconGreen}>＋</span>
            <span style={statLabel}>Yeni əlavə</span>
          </div>

          <strong style={statValue}>{name.trim() ? "1" : "0"}</strong>
          <span style={statHint}>
            Hazırda əlavə edilməyə hazır şirkət adı
          </span>
        </div>

        <div style={statCard}>
          <div style={statTop}>
            <span style={statIconPurple}>🛡️</span>
            <span style={statLabel}>Admin idarəetmə</span>
          </div>

          <strong style={statValue}>Aktiv</strong>
          <span style={statHint}>Şirkət siyahısı admin paneldən idarə olunur</span>
        </div>
      </section>

      {/* ADD COMPANY */}
      <section className="companies-add-card" style={addCard}>
        <div className="companies-add-info" style={addInfo}>
          <h2 className="companies-card-title" style={cardTitle}>
            Yeni şirkət əlavə et
          </h2>

          <p style={cardText}>
            Şirkət adını daxil edin və sistemə əlavə edin.
          </p>
        </div>

        <div className="companies-add-form" style={addForm}>
          <div className="companies-input-wrap" style={inputWrap}>
            <span style={inputIcon}>🏢</span>

            <input
              placeholder="Şirkət adı"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="companies-input"
              style={inputStyle}
            />
          </div>

          <button
            onClick={addCompany}
            className="companies-add-button"
            style={addButton}
            type="button"
          >
            <span style={buttonIcon}>＋</span>
            Əlavə et
          </button>
        </div>
      </section>

      {/* LIST */}
      <section className="companies-list-card" style={listCard}>
        <div className="companies-list-header" style={listHeader}>
          <div>
            <h2 className="companies-card-title" style={cardTitle}>
              Şirkət siyahısı
            </h2>

            <p style={cardText}>
              Göstərilən nəticə: {companies.length}
            </p>
          </div>
        </div>

        {companies.length === 0 ? (
          <div style={emptyBox}>
            <div style={emptyIcon}>📭</div>

            <h3 style={emptyTitle}>Şirkət tapılmadı</h3>

            <p style={emptyText}>
              Hələ sistemə şirkət əlavə edilməyib. Yuxarıdakı xanadan yeni
              şirkət yarada bilərsiniz.
            </p>
          </div>
        ) : (
          <div className="companies-grid" style={companiesGrid}>
            {companies.map((c, index) => (
              <div key={c.id} className="company-item" style={companyItem}>
                <div style={companyLeft}>
                  <span style={companyAvatar}>
                    {(c.name || "?").trim().slice(0, 1).toUpperCase()}
                  </span>

                  <div style={companyInfo}>
                    <div style={companyName}>{c.name}</div>

                    <div style={companyMeta}>
                      Şirkət #{companies.length - index}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => deleteCompany(c.id)}
                  className="company-delete-button"
                  style={deleteButton}
                  type="button"
                >
                  Sil
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <style jsx>{`
        .admin-companies-page,
        .admin-companies-page * {
          box-sizing: border-box;
        }

        .company-item {
          transition: transform 0.2s ease, box-shadow 0.2s ease,
            border-color 0.2s ease;
        }

        .company-item:hover {
          transform: translateY(-2px);
          border-color: rgba(59, 130, 246, 0.35) !important;
          box-shadow: 0 18px 44px rgba(15, 23, 42, 0.1) !important;
        }

        .companies-add-button {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .companies-add-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 20px 38px rgba(37, 99, 235, 0.3) !important;
        }

        .company-delete-button {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .company-delete-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 28px rgba(220, 38, 38, 0.25) !important;
        }

        @media (max-width: 900px) {
          .companies-hero {
            padding: 24px 20px !important;
            border-radius: 24px !important;
          }

          .companies-hero-content {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 18px !important;
          }

          .companies-hero-left {
            min-width: 0 !important;
            flex: 1 1 auto !important;
          }

          .companies-hero-mini {
            width: 100% !important;
            min-width: 0 !important;
          }

          .companies-stats {
            grid-template-columns: 1fr !important;
          }

          .companies-add-card {
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .companies-add-form {
            width: 100% !important;
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .companies-add-button {
            width: 100% !important;
          }

          .companies-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 560px) {
          .admin-companies-page {
            padding: 18px 12px 28px !important;
          }

          .companies-hero {
            padding: 22px 16px !important;
            margin-bottom: 14px !important;
            border-radius: 22px !important;
          }

          .companies-eyebrow {
            font-size: 12px !important;
            padding: 6px 10px !important;
          }

          .companies-title {
            font-size: 30px !important;
            letter-spacing: -0.045em !important;
          }

          .companies-subtitle {
            font-size: 14px !important;
            line-height: 1.6 !important;
            margin-top: 10px !important;
          }

          .companies-add-card,
          .companies-list-card {
            padding: 16px 14px !important;
            border-radius: 20px !important;
          }

          .companies-card-title {
            font-size: 19px !important;
          }

          .companies-input {
            padding: 13px 13px 13px 48px !important;
            font-size: 13px !important;
            border-radius: 14px !important;
          }

          .company-item {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 14px !important;
            padding: 14px !important;
            border-radius: 18px !important;
          }

          .company-delete-button {
            width: 100% !important;
            justify-content: center !important;
          }
        }
          

        @media (max-width: 380px) {
          .companies-title {
            font-size: 26px !important;
          }

          .companies-hero {
            padding: 20px 13px !important;
          }

          .companies-add-card,
          .companies-list-card {
            padding: 14px 12px !important;
          }
        }
      `}</style>
    </div>
  );
}

/* PAGE */

const pageStyle: CSSProperties = {
  width: "100%",
  minHeight: "100svh",
  overflowX: "hidden",
  padding: "26px clamp(14px, 3vw, 32px) 38px",
  background:
    "radial-gradient(circle at top left, rgba(56,189,248,0.18), transparent 28%), radial-gradient(circle at top right, rgba(99,102,241,0.16), transparent 28%), linear-gradient(135deg, #f3f7fb 0%, #eaf2fb 48%, #f8fafc 100%)",
  color: "#0f172a",
};

/* HERO */

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
  maxWidth: 720,
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
  lineHeight: 1.45,
};

/* STATS */

const statsGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
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

const statIconPurple: CSSProperties = {
  ...statIconBlue,
  background: "#ede9fe",
};

/* ADD CARD */

const addCard: CSSProperties = {
  // display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 18,
  flexWrap: "wrap",
  marginBottom: 20,
  padding: 18,
  borderRadius: 22,
  background: "rgba(255,255,255,0.9)",
  border: "1px solid rgba(203,213,225,0.88)",
  boxShadow: "0 18px 45px rgba(15,23,42,0.07)",
  backdropFilter: "blur(12px)",
};

const addInfo: CSSProperties = {
  minWidth: 240,
  flex: "1 1 320px",
};

const cardTitle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: 21,
  fontWeight: 950,
  letterSpacing: "-0.04em",
};

const cardText: CSSProperties = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: 13,
  lineHeight: 1.5,
};

const addForm: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flex: "1 1 430px",
};

const inputWrap: CSSProperties = {
  position: "relative",
  flex: 1,
  minWidth: 220,
};

const inputIcon: CSSProperties = {
  position: "absolute",
  left: 14,
  top: "50%",
  transform: "translateY(-50%)",
  width: 30,
  height: 30,
  borderRadius: 12,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f1f5f9",
  border: "1px solid #e2e8f0",
  pointerEvents: "none",
};

const inputStyle: CSSProperties = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  padding: "14px 15px 14px 52px",
  borderRadius: 16,
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#0f172a",
  fontSize: 14,
  outline: "none",
  boxShadow: "inset 0 1px 0 rgba(15,23,42,0.03)",
};

const addButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  border: "none",
  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
  color: "#fff",
  padding: "14px 17px",
  borderRadius: 16,
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 950,
  boxShadow: "0 16px 34px rgba(37,99,235,0.24)",
  whiteSpace: "nowrap",
};

const buttonIcon: CSSProperties = {
  fontSize: 18,
  lineHeight: 1,
};

/* LIST */

const listCard: CSSProperties = {
  background: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(203,213,225,0.9)",
  boxShadow: "0 24px 70px rgba(15,23,42,0.09)",
  padding: 18,
  borderRadius: 26,
  backdropFilter: "blur(14px)",
};

const listHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
  flexWrap: "wrap",
  padding: "2px 2px 16px",
};

const companiesGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: 14,
};

const companyItem: CSSProperties = {
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

const companyLeft: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  minWidth: 0,
};

const companyAvatar: CSSProperties = {
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

const companyInfo: CSSProperties = {
  minWidth: 0,
};

const companyName: CSSProperties = {
  color: "#0f172a",
  fontSize: 15,
  fontWeight: 950,
  lineHeight: 1.35,
  wordBreak: "break-word",
};

const companyMeta: CSSProperties = {
  marginTop: 4,
  color: "#64748b",
  fontSize: 12,
  fontWeight: 750,
};

const deleteButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  background: "linear-gradient(135deg, #dc2626, #b91c1c)",
  color: "#fff",
  padding: "9px 12px",
  borderRadius: 13,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 900,
  boxShadow: "0 10px 22px rgba(220,38,38,0.18)",
  whiteSpace: "nowrap",
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
  letterSpacing: "-0.03em",
};

const emptyText: CSSProperties = {
  margin: "8px auto 0",
  maxWidth: 430,
  color: "#64748b",
  fontSize: 14,
  lineHeight: 1.55,
};