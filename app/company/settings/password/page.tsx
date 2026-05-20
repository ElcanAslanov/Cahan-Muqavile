"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { validatePassword } from "@/lib/password";
import { useRouter } from "next/navigation";

export default function CompanyChangePasswordPage() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleChangePassword(e?: FormEvent) {
    if (e) e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      alert("Bütün xanaları doldurun");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Yeni şifrələr eyni deyil");
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      alert(passwordError);
      return;
    }

    if (currentPassword === newPassword) {
      alert("Yeni şifrə köhnə şifrə ilə eyni ola bilməz");
      return;
    }

    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.email) {
      setLoading(false);
      alert("İstifadəçi məlumatı tapılmadı");
      return;
    }

    const { error: checkError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (checkError) {
      setLoading(false);
      alert("Köhnə şifrə yanlışdır");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setLoading(false);

    if (updateError) {
      alert(updateError.message);
      return;
    }

    alert("Şifrə uğurla dəyişdirildi");
    router.push("/company/settings");
  }

  return (
    <div className="password-page" style={pageStyle}>
      <div style={backgroundGlowOne} />
      <div style={backgroundGlowTwo} />

      <main className="password-shell" style={shellStyle}>
        <div className="password-topbar" style={topBar}>
          <Link href="/company/settings" className="password-back-link" style={backLink}>
            <span style={backIcon}>←</span>
            Parametrlərə qayıt
          </Link>

          <span className="password-secure-badge" style={secureBadge}>
            <span style={secureDot} />
            Təhlükəsizlik
          </span>
        </div>

        <section className="password-layout" style={layoutGrid}>
          {/* LEFT INFO */}
          <aside className="password-info-card" style={infoCard}>
            <div className="password-info-icon" style={infoIcon}>
              🔐
            </div>

            <h1 className="password-info-title" style={infoTitle}>
              Şifrəni dəyiş
            </h1>

            <p className="password-info-text" style={infoText}>
              Hesabınızın təhlükəsizliyi üçün hazırkı şifrənizi daxil edin və
              yeni, güclü şifrə təyin edin.
            </p>

            <div className="password-info-divider" style={infoDivider} />

            <div className="password-mini-stats" style={miniStats}>
              <div className="password-mini-stat" style={miniStat}>
                <span style={miniStatIcon}>🛡️</span>

                <div>
                  <strong style={miniStatTitle}>Təhlükəsiz yoxlama</strong>
                  <p style={miniStatText}>
                    Köhnə şifrə təsdiqləndikdən sonra yenisi aktiv olur.
                  </p>
                </div>
              </div>

              <div className="password-mini-stat" style={miniStat}>
                <span style={miniStatIcon}>⚡</span>

                <div>
                  <strong style={miniStatTitle}>Dərhal yenilənir</strong>
                  <p style={miniStatText}>
                    Şifrə uğurla dəyişdikdən sonra parametrlərə yönləndirilirsiniz.
                  </p>
                </div>
              </div>
            </div>
          </aside>

          {/* FORM */}
          <form
            onSubmit={handleChangePassword}
            className="password-form-card"
            style={formCard}
          >
            <div style={formHeader}>
              <div>
                <div className="password-eyebrow" style={eyebrow}>
                  <span style={eyebrowDot} />
                  Hesab şifrəsi
                </div>

                <h2 className="password-form-title" style={formTitle}>
                  Yeni şifrə təyin et
                </h2>

                <p style={formSubtitle}>
                  Yeni şifrə əvvəlki şifrə ilə eyni olmamalıdır.
                </p>
              </div>
            </div>

            <div style={fieldsWrap}>
              <div style={fieldGroup}>
                <label style={labelStyle}>Hazırkı şifrə</label>

                <div className="password-input-wrap" style={inputWrap}>
                  <span className="password-input-icon" style={inputIcon}>
                    🔑
                  </span>

                  <input
                    className="password-input"
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    style={inputStyle}
                    placeholder="Hazırkı şifrənizi daxil edin"
                  />

                  <button
                    className="password-eye-button"
                    type="button"
                    onClick={() => setShowCurrent((v) => !v)}
                    style={eyeButton}
                    aria-label="Hazırkı şifrəni göstər/gizlət"
                  >
                    {showCurrent ? "🙈" : "👁"}
                  </button>
                </div>
              </div>

              <div style={fieldGroup}>
                <label style={labelStyle}>Yeni şifrə</label>

                <div className="password-input-wrap" style={inputWrap}>
                  <span className="password-input-icon" style={inputIcon}>
                    ✨
                  </span>

                  <input
                    className="password-input"
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={inputStyle}
                    placeholder="Yeni şifrəni daxil edin"
                  />

                  <button
                    className="password-eye-button"
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    style={eyeButton}
                    aria-label="Yeni şifrəni göstər/gizlət"
                  >
                    {showNew ? "🙈" : "👁"}
                  </button>
                </div>
              </div>

              <div style={fieldGroup}>
                <label style={labelStyle}>Yeni şifrənin təkrarı</label>

                <div className="password-input-wrap" style={inputWrap}>
                  <span className="password-input-icon" style={inputIcon}>
                    ✅
                  </span>

                  <input
                    className="password-input"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={inputStyle}
                    placeholder="Yeni şifrəni təkrar daxil edin"
                  />

                  <button
                    className="password-eye-button"
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    style={eyeButton}
                    aria-label="Təkrar şifrəni göstər/gizlət"
                  >
                    {showConfirm ? "🙈" : "👁"}
                  </button>
                </div>
              </div>
            </div>

            <div className="password-rules-card" style={rulesCard}>
              <div className="password-rules-header" style={rulesHeader}>
                <span className="password-rules-icon" style={rulesIcon}>
                  📌
                </span>

                <div>
                  <h3 style={rulesTitle}>Şifrə qaydaları</h3>
                  <p style={rulesSubtitle}>
                    Yeni şifrəniz aşağıdakı tələblərə uyğun olmalıdır.
                  </p>
                </div>
              </div>

              <ul className="password-rules-list" style={rulesList}>
                <li style={ruleItem}>
                  <span style={ruleBullet}>✓</span>
                  Minimum 8 simvol
                </li>

                <li style={ruleItem}>
                  <span style={ruleBullet}>✓</span>
                  Ən azı 1 böyük hərf
                </li>

                <li style={ruleItem}>
                  <span style={ruleBullet}>✓</span>
                  Ən azı 1 kiçik hərf
                </li>

                <li style={ruleItem}>
                  <span style={ruleBullet}>✓</span>
                  Ən azı 1 rəqəm
                </li>

                <li style={ruleItem}>
                  <span style={ruleBullet}>✓</span>
                  Ən azı 1 simvol (!@#$%^&*)
                </li>
              </ul>
            </div>

            <button
              className="password-submit-button"
              type="submit"
              disabled={loading}
              style={{
                ...submitButton,
                ...(loading ? submitButtonDisabled : {}),
              }}
            >
              {loading ? (
                <>
                  <span style={spinner} />
                  Yenilənir...
                </>
              ) : (
                <>
                  <span style={submitIcon}>🔒</span>
                  Şifrəni yenilə
                </>
              )}
            </button>
          </form>
        </section>
      </main>

      <style jsx>{`
        .password-page,
        .password-page * {
          box-sizing: border-box;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 1024px) {
          .password-shell {
            max-width: 860px !important;
          }

          .password-layout {
            grid-template-columns: 1fr !important;
          }

          .password-form-card {
            order: 1;
          }

          .password-info-card {
            order: 2;
          }
        }

        @media (max-width: 720px) {
          .password-shell {
            padding: 18px 12px 30px !important;
          }

          .password-topbar {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px !important;
            margin-bottom: 14px !important;
          }

          .password-back-link,
          .password-secure-badge {
            width: 100% !important;
            justify-content: center !important;
          }

          .password-layout {
            gap: 14px !important;
          }

          .password-form-card,
          .password-info-card {
            border-radius: 22px !important;
            padding: 20px 16px !important;
          }

          .password-info-icon {
            width: 50px !important;
            height: 50px !important;
            border-radius: 18px !important;
            font-size: 24px !important;
            margin-bottom: 14px !important;
          }

          .password-info-title {
            font-size: 28px !important;
            letter-spacing: -0.045em !important;
          }

          .password-info-text {
            font-size: 14px !important;
            line-height: 1.6 !important;
          }

          .password-info-divider {
            margin: 18px 0 !important;
          }

          .password-form-title {
            font-size: 23px !important;
            line-height: 1.2 !important;
          }

          .password-eyebrow {
            font-size: 12px !important;
            padding: 6px 10px !important;
          }

          .password-rules-list {
            grid-template-columns: 1fr !important;
          }

          .password-rules-header {
            align-items: flex-start !important;
          }

          .password-submit-button {
            padding: 14px 16px !important;
          }
        }

        @media (max-width: 460px) {
          .password-shell {
            padding: 14px 10px 24px !important;
          }

          .password-form-card,
          .password-info-card {
            padding: 18px 13px !important;
            border-radius: 20px !important;
          }

          .password-mini-stat {
            padding: 12px !important;
            border-radius: 16px !important;
          }

          .password-input {
            padding: 14px 46px 14px 46px !important;
            font-size: 13px !important;
            border-radius: 15px !important;
          }

          .password-input-icon {
            left: 10px !important;
            width: 28px !important;
            height: 28px !important;
          }

          .password-eye-button {
            right: 8px !important;
            width: 34px !important;
            height: 34px !important;
            border-radius: 12px !important;
          }

          .password-rules-card {
            padding: 13px !important;
            border-radius: 18px !important;
          }

          .password-rules-icon {
            width: 36px !important;
            height: 36px !important;
            border-radius: 13px !important;
          }
        }

        @media (max-width: 360px) {
          .password-back-link,
          .password-secure-badge {
            font-size: 12px !important;
            padding: 9px 10px !important;
          }

          .password-form-title {
            font-size: 21px !important;
          }

          .password-info-title {
            font-size: 24px !important;
          }

          .password-input {
            padding-left: 42px !important;
            padding-right: 42px !important;
          }
        }
      `}</style>
    </div>
  );
}

/* PAGE */

const pageStyle: CSSProperties = {
  position: "relative",
  minHeight: "100svh",
  overflowX: "hidden",
  overflowY: "auto",
  background:
    "radial-gradient(circle at top left, rgba(56,189,248,0.20), transparent 30%), radial-gradient(circle at bottom right, rgba(99,102,241,0.18), transparent 30%), linear-gradient(135deg, #f3f7fb 0%, #eaf2fb 48%, #f8fafc 100%)",
  color: "#0f172a",
};

const backgroundGlowOne: CSSProperties = {
  position: "absolute",
  width: 360,
  height: 360,
  borderRadius: "50%",
  top: -150,
  right: -120,
  background: "rgba(37,99,235,0.16)",
  filter: "blur(4px)",
  pointerEvents: "none",
};

const backgroundGlowTwo: CSSProperties = {
  position: "absolute",
  width: 300,
  height: 300,
  borderRadius: "50%",
  bottom: -150,
  left: -110,
  background: "rgba(14,165,233,0.14)",
  filter: "blur(4px)",
  pointerEvents: "none",
};

const shellStyle: CSSProperties = {
  position: "relative",
  zIndex: 1,
  width: "100%",
  maxWidth: 1120,
  margin: "0 auto",
  padding: "28px clamp(16px, 3vw, 32px) 42px",
};

/* TOP */

const topBar: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
  flexWrap: "wrap",
  marginBottom: 20,
};

const backLink: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  color: "#1d4ed8",
  textDecoration: "none",
  fontSize: 14,
  fontWeight: 900,
  padding: "10px 13px",
  borderRadius: 14,
  background: "rgba(255,255,255,0.82)",
  border: "1px solid rgba(191,219,254,0.9)",
  boxShadow: "0 12px 28px rgba(15,23,42,0.06)",
};

const backIcon: CSSProperties = {
  fontSize: 17,
  lineHeight: 1,
};

const secureBadge: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 9,
  padding: "9px 13px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.82)",
  border: "1px solid rgba(203,213,225,0.86)",
  color: "#334155",
  fontSize: 13,
  fontWeight: 900,
  boxShadow: "0 12px 28px rgba(15,23,42,0.06)",
};

const secureDot: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "#22c55e",
  boxShadow: "0 0 0 5px rgba(34,197,94,0.14)",
};

/* LAYOUT */

const layoutGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(280px, 0.82fr) minmax(320px, 1.18fr)",
  gap: 22,
  alignItems: "stretch",
};

const infoCard: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  borderRadius: 30,
  padding: 28,
  background:
    "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,64,105,0.96) 52%, rgba(8,47,73,0.98))",
  color: "#fff",
  boxShadow: "0 24px 80px rgba(15,23,42,0.24)",
  border: "1px solid rgba(148,163,184,0.22)",
};

const infoIcon: CSSProperties = {
  width: 62,
  height: 62,
  borderRadius: 22,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.14)",
  fontSize: 28,
  marginBottom: 20,
};

const infoTitle: CSSProperties = {
  margin: 0,
  fontSize: "clamp(30px, 4vw, 42px)",
  lineHeight: 1.08,
  fontWeight: 950,
  letterSpacing: "-0.055em",
};

const infoText: CSSProperties = {
  margin: "14px 0 0",
  color: "#cbd5e1",
  fontSize: 15,
  lineHeight: 1.7,
};

const infoDivider: CSSProperties = {
  height: 1,
  background: "rgba(255,255,255,0.14)",
  margin: "24px 0",
};

const miniStats: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const miniStat: CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
  padding: 14,
  borderRadius: 20,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.12)",
};

const miniStatIcon: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 14,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(255,255,255,0.12)",
  flexShrink: 0,
};

const miniStatTitle: CSSProperties = {
  display: "block",
  color: "#fff",
  fontSize: 14,
  fontWeight: 950,
  marginBottom: 4,
};

const miniStatText: CSSProperties = {
  margin: 0,
  color: "#cbd5e1",
  fontSize: 13,
  lineHeight: 1.5,
};

/* FORM */

const formCard: CSSProperties = {
  borderRadius: 30,
  padding: "26px clamp(18px, 3vw, 30px)",
  background: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(203,213,225,0.9)",
  boxShadow: "0 24px 70px rgba(15,23,42,0.10)",
  backdropFilter: "blur(14px)",
};

const formHeader: CSSProperties = {
  marginBottom: 22,
};

const eyebrow: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 9,
  padding: "7px 12px",
  borderRadius: 999,
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1d4ed8",
  fontSize: 13,
  fontWeight: 900,
  marginBottom: 12,
};

const eyebrowDot: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "#2563eb",
  boxShadow: "0 0 0 5px rgba(37,99,235,0.13)",
};

const formTitle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: 26,
  fontWeight: 950,
  letterSpacing: "-0.045em",
};

const formSubtitle: CSSProperties = {
  margin: "8px 0 0",
  color: "#64748b",
  fontSize: 14,
  lineHeight: 1.55,
};

const fieldsWrap: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 15,
};

const fieldGroup: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const labelStyle: CSSProperties = {
  color: "#334155",
  fontSize: 13,
  fontWeight: 900,
};

const inputWrap: CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  width: "100%",
};

const inputIcon: CSSProperties = {
  position: "absolute",
  left: 14,
  top: "50%",
  transform: "translateY(-50%)",
  width: 28,
  height: 28,
  borderRadius: 10,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f1f5f9",
  border: "1px solid #e2e8f0",
  fontSize: 14,
  pointerEvents: "none",
};

const inputStyle: CSSProperties = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  padding: "15px 50px 15px 52px",
  borderRadius: 17,
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#0f172a",
  fontSize: 14,
  outline: "none",
  boxShadow: "inset 0 1px 0 rgba(15,23,42,0.03)",
};

const eyeButton: CSSProperties = {
  position: "absolute",
  right: 10,
  top: "50%",
  transform: "translateY(-50%)",
  width: 36,
  height: 36,
  borderRadius: 13,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 16,
};

/* RULES */

const rulesCard: CSSProperties = {
  marginTop: 18,
  padding: 16,
  borderRadius: 22,
  background:
    "linear-gradient(135deg, rgba(248,250,252,0.98), rgba(239,246,255,0.98))",
  border: "1px solid #dbeafe",
};

const rulesHeader: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 13,
};

const rulesIcon: CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 15,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#dbeafe",
  color: "#1d4ed8",
  flexShrink: 0,
};

const rulesTitle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: 15,
  fontWeight: 950,
};

const rulesSubtitle: CSSProperties = {
  margin: "4px 0 0",
  color: "#64748b",
  fontSize: 13,
  lineHeight: 1.45,
};

const rulesList: CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 9,
};

const ruleItem: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "#334155",
  fontSize: 13,
  fontWeight: 800,
  minWidth: 0,
};

const ruleBullet: CSSProperties = {
  width: 20,
  height: 20,
  borderRadius: "50%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#dcfce7",
  color: "#166534",
  fontSize: 12,
  fontWeight: 950,
  flexShrink: 0,
};

/* BUTTON */

const submitButton: CSSProperties = {
  width: "100%",
  marginTop: 18,
  border: "none",
  borderRadius: 18,
  padding: "15px 18px",
  background: "linear-gradient(135deg, #16a34a, #15803d)",
  color: "#fff",
  fontSize: 15,
  fontWeight: 950,
  cursor: "pointer",
  boxShadow: "0 18px 36px rgba(22,163,74,0.24)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 9,
};

const submitButtonDisabled: CSSProperties = {
  opacity: 0.65,
  cursor: "not-allowed",
  boxShadow: "none",
};

const submitIcon: CSSProperties = {
  fontSize: 17,
  lineHeight: 1,
};

const spinner: CSSProperties = {
  width: 18,
  height: 18,
  borderRadius: "50%",
  border: "3px solid rgba(255,255,255,0.35)",
  borderTopColor: "#fff",
  animation: "spin 0.9s linear infinite",
};