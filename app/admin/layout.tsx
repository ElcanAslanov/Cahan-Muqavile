"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data } = await supabase.auth.getSession();

    if (!data.session) {
      router.replace("/login");
      return;
    }

    const userId = data.session.user.id;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (!profile) {
      router.replace("/login");
      return;
    }

    if (profile.role !== "ADMIN") {
      router.replace("/login");
      return;
    }

    setLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function linkStyle(href: string): CSSProperties {
    const active = pathname === href || pathname.startsWith(`${href}/`);

    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      color: active ? "#fff" : "#cbd5e1",
      textDecoration: "none",
      padding: "10px 14px",
      borderRadius: 14,
      background: active
        ? "linear-gradient(135deg, #2563eb, #1d4ed8)"
        : "rgba(255,255,255,0.06)",
      border: active
        ? "1px solid rgba(255,255,255,0.22)"
        : "1px solid rgba(255,255,255,0.08)",
      fontSize: 13,
      fontWeight: 850,
      whiteSpace: "nowrap",
      flexShrink: 0,
      boxShadow: active ? "0 12px 28px rgba(37,99,235,0.28)" : "none",
    };
  }

  if (loading) {
    return (
      <div style={loadingPage}>
        <div style={loadingCard}>
          <div style={loadingLogo}>🛡️</div>
          <div style={spinner} />
          <h1 style={loadingTitle}>Admin panel yoxlanılır</h1>
          <p style={loadingText}>Zəhmət olmasa gözləyin...</p>
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
    <div style={pageShell}>
      <nav style={navStyle}>
        <div style={navInner}>
          <div style={brandArea}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={menuButton}
              type="button"
              aria-label="Menyu"
              className="hamburger"
            >
              {menuOpen ? "×" : "☰"}
            </button>

            <Link href="/admin/dashboard" style={brandLink}>
              <span style={brandIcon}>🛡️</span>

              <span style={brandTextWrap}>
                <span className="brand-title" style={brandTitle}>Admin Panel</span>

                <span className="brand-subtitle" style={brandSubtitle}>Müqavilə idarəetməsi</span>
              </span>
            </Link>
          </div>

          <div className="desktop-menu" style={desktopMenu}>
            <Link href="/admin/dashboard" style={linkStyle("/admin/dashboard")}>
              📊 İdarəetmə paneli
            </Link>

            <Link href="/admin/contracts" style={linkStyle("/admin/contracts")}>
              📄 Müqavilələr
            </Link>
            <Link href="/admin/contract-settings" style={linkStyle("/admin/contract-settings")}>
              ⚙️ Müqavilə ayarları
            </Link>

            <Link href="/admin/templates" style={linkStyle("/admin/templates")}>
              🧩 Şablonlar
            </Link>

            <Link href="/admin/users" style={linkStyle("/admin/users")}>
              👥 İstifadəçilər
            </Link>

            <Link href="/admin/companies" style={linkStyle("/admin/companies")}>
              🏢 Şirkətlər
            </Link>

            <Link href="/admin/audit-logs" style={linkStyle("/admin/audit-logs")}>
              🧾 Loglar
            </Link>
          </div>

          <button onClick={logout} style={logoutButton} type="button">
            <span>⎋</span>
            <span className="logout-text">Çıxış</span>
          </button>
        </div>

        {menuOpen && (
          <div className="mobile-menu-wrap" style={mobileMenuWrap}>
            <div style={mobileMenu}>
              <Link
                href="/admin/dashboard"
                style={linkStyle("/admin/dashboard")}
                onClick={() => setMenuOpen(false)}
              >
                📊 İdarəetmə paneli
              </Link>

              <Link
                href="/admin/contracts"
                style={linkStyle("/admin/contracts")}
                onClick={() => setMenuOpen(false)}
              >
                📄 Müqavilələr
              </Link>

              <Link
                href="/admin/contract-settings"
                style={linkStyle("/admin/contract-settings")}
                onClick={() => setMenuOpen(false)}
              >
                ⚙️ Müqavilə ayarları
              </Link>

              <Link
                href="/admin/templates"
                style={linkStyle("/admin/templates")}
                onClick={() => setMenuOpen(false)}
              >
                🧩 Şablonlar
              </Link>

              <Link
                href="/admin/users"
                style={linkStyle("/admin/users")}
                onClick={() => setMenuOpen(false)}
              >
                👥 İstifadəçilər
              </Link>

              <Link
                href="/admin/companies"
                style={linkStyle("/admin/companies")}
                onClick={() => setMenuOpen(false)}
              >
                🏢 Şirkətlər
              </Link>

              <Link
                href="/admin/audit-logs"
                style={linkStyle("/admin/audit-logs")}
                onClick={() => setMenuOpen(false)}
              >
                🧾 Loglar
              </Link>
            </div>
          </div>
        )}
      </nav>

      <main style={mainStyle}>{children}</main>

      <style jsx>{`
        .hamburger {
          display: none !important;
        }

        .desktop-menu::-webkit-scrollbar {
          display: none;
        }

        @media (max-width: 1180px) {
          .desktop-menu {
            justify-content: flex-start !important;
          }
        }

        @media (max-width: 980px) {
          .desktop-menu {
            display: none !important;
          }

          .hamburger {
            display: inline-flex !important;
          }
        }

        @media (max-width: 720px) {
          .mobile-menu-wrap a {
            width: 100% !important;
            justify-content: flex-start !important;
          }
        }

        @media (max-width: 560px) {
          .logout-text {
            display: none;
          }

          .mobile-menu-wrap {
            padding-left: 12px !important;
            padding-right: 12px !important;
          }

          .mobile-menu-wrap > div {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 420px) {
          .brand-subtitle {
            display: none !important;
          }

          .brand-title {
            font-size: 14px !important;
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

/* STYLES */

const pageShell: CSSProperties = {
  minHeight: "100vh",
  color: "#0f172a",
  background:
    "radial-gradient(circle at top left, rgba(56,189,248,0.18), transparent 28%), radial-gradient(circle at top right, rgba(99,102,241,0.16), transparent 28%), linear-gradient(135deg, #f3f7fb 0%, #eaf2fb 48%, #f8fafc 100%)",
};

const navStyle: CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 80,
  width: "100%",
  background: "rgba(15,23,42,0.92)",
  borderBottom: "1px solid rgba(148,163,184,0.18)",
  boxShadow: "0 16px 44px rgba(15,23,42,0.18)",
  backdropFilter: "blur(18px)",
};

const navInner: CSSProperties = {
  width: "100%",
  maxWidth: 1440,
  margin: "0 auto",
  padding: "12px clamp(14px, 2vw, 24px)",
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 12,
};

const brandArea: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  minWidth: 0,
};

const menuButton: CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  fontSize: 22,
  cursor: "pointer",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const brandLink: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 11,
  color: "#fff",
  textDecoration: "none",
  minWidth: 0,
};

const brandIcon: CSSProperties = {
  width: 46,
  height: 46,
  borderRadius: 16,
  background: "linear-gradient(135deg, #38bdf8, #2563eb)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 14px 30px rgba(37,99,235,0.28)",
  fontSize: 22,
  flexShrink: 0,
};

const brandTextWrap: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
};

const brandTitle: CSSProperties = {
  color: "#fff",
  fontSize: 15,
  fontWeight: 950,
  letterSpacing: "-0.025em",
  whiteSpace: "nowrap",
};

const brandSubtitle: CSSProperties = {
  color: "#cbd5e1",
  fontSize: 12,
  marginTop: 2,
  whiteSpace: "nowrap",
};

const desktopMenu: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: 8,
  flex: 1,
  minWidth: 0,
  overflowX: "auto",
  overflowY: "hidden",
  WebkitOverflowScrolling: "touch",
  scrollbarWidth: "none",
};

const logoutButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  background: "linear-gradient(135deg, #ef4444, #dc2626)",
  border: "1px solid rgba(255,255,255,0.16)",
  color: "white",
  padding: "10px 13px",
  borderRadius: 14,
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 900,
  boxShadow: "0 12px 28px rgba(239,68,68,0.24)",
  whiteSpace: "nowrap",
  flexShrink: 0,
};

const mobileMenuWrap: CSSProperties = {
  padding: "0 14px 12px",
};

const mobileMenu: CSSProperties = {
  width: "100%",
  maxWidth: 1440,
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: 9,
  padding: 12,
  borderRadius: 22,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  boxShadow: "0 18px 44px rgba(0,0,0,0.22)",
};

const mainStyle: CSSProperties = {
  width: "100%",
  maxWidth: 1440,
  margin: "0 auto",
  padding: "0 clamp(12px, 2vw, 24px) 28px",
};

const loadingPage: CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  background:
    "radial-gradient(circle at top left, rgba(56,189,248,0.25), transparent 30%), linear-gradient(135deg, #0f172a 0%, #1e3a5f 48%, #0f172a 100%)",
  color: "#ffffff",
};

const loadingCard: CSSProperties = {
  width: "100%",
  maxWidth: 390,
  borderRadius: 28,
  padding: "32px 26px",
  background: "rgba(15,23,42,0.74)",
  border: "1px solid rgba(148,163,184,0.22)",
  boxShadow: "0 24px 80px rgba(0,0,0,0.36)",
  backdropFilter: "blur(16px)",
  textAlign: "center",
};

const loadingLogo: CSSProperties = {
  width: 62,
  height: 62,
  borderRadius: 22,
  margin: "0 auto 16px",
  background: "linear-gradient(135deg, #38bdf8, #2563eb)",
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
  border: "4px solid rgba(255,255,255,0.18)",
  borderTopColor: "#38bdf8",
  animation: "spin 0.9s linear infinite",
};

const loadingTitle: CSSProperties = {
  margin: 0,
  fontSize: 21,
  fontWeight: 950,
  letterSpacing: "-0.035em",
};

const loadingText: CSSProperties = {
  margin: "10px 0 0",
  color: "#cbd5e1",
  fontSize: 14,
  lineHeight: 1.6,
};