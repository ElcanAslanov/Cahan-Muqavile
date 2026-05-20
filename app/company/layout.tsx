"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function checkScreen() {
      setIsMobile(window.innerWidth < 768);
    }

    checkScreen();
    window.addEventListener("resize", checkScreen);

    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  useEffect(() => {
    async function checkAccess() {
      const { data: userData } = await supabase.auth.getUser();

      const userId = userData.user?.id;

      if (!userId) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (!profile) {
        router.push("/login");
        return;
      }

      if (profile.role !== "COMPANY_MANAGER") {
        router.push("/login");
        return;
      }

      setLoading(false);
    }

    checkAccess();
  }, []);

  if (loading) {
    return (
      <div style={loadingPage}>
        <div style={loadingCard}>
          <div style={loadingLogo}>🏢</div>

          <div style={spinner} />

          <h1 style={loadingTitle}>Panel yüklənir</h1>

          <p style={loadingText}>
            Şirkət rəhbəri icazələri yoxlanılır, zəhmət olmasa gözləyin...
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

  function linkStyle(href: string): CSSProperties {
    const active =
      href === "/company/settings"
        ? pathname.startsWith("/company/settings")
        : pathname === href;

    return {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      color: active ? "#ffffff" : "#cbd5e1",
      textDecoration: "none",
      padding: "10px 14px",
      borderRadius: 14,
      background: active
        ? "linear-gradient(135deg, #2563eb, #1d4ed8)"
        : "rgba(255,255,255,0.06)",
      border: active
        ? "1px solid rgba(255,255,255,0.20)"
        : "1px solid rgba(255,255,255,0.08)",
      fontSize: 14,
      fontWeight: 800,
      boxShadow: active ? "0 12px 28px rgba(37,99,235,0.28)" : "none",
      transition:
        "background 0.18s ease, transform 0.18s ease, border-color 0.18s ease",
      whiteSpace: "nowrap",
    };
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div style={pageShell}>
      {/* NAVBAR */}
      <nav style={navStyle}>
        <div style={navInner}>
          {/* LEFT */}
          <div style={brandArea}>
            {isMobile && (
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                style={menuButton}
                type="button"
                aria-label="Menyu"
              >
                {menuOpen ? "×" : "☰"}
              </button>
            )}

            <Link href="/company" style={brandLink}>
              <span style={brandIcon}>🏢</span>

              <span style={brandTextWrap}>
                <span style={brandTitle}>Şirkət Paneli</span>
                <span style={brandSubtitle}>Müqavilə idarəetməsi</span>
              </span>
            </Link>
          </div>

          {/* DESKTOP MENU */}
          {!isMobile && (
            <div style={desktopMenu}>
              <Link href="/company" style={linkStyle("/company")}>
                <span>📊</span>
                İdarəetmə paneli
              </Link>

              <Link
                href="/company/create-contract"
                style={linkStyle("/company/create-contract")}
              >
                <span>➕</span>
                Müqavilə yarat
              </Link>

              <Link href="/company/archived" style={linkStyle("/company/archived")}>
                <span>🗄️</span>
                Arxiv
              </Link>
            </div>
          )}

          {/* RIGHT */}
          <div style={rightActions}>
            <Link
              href="/company/settings"
              style={settingsButton}
              onClick={() => setMenuOpen(false)}
            >
              <span style={settingsIcon}>⚙️</span>
              {!isMobile && <span>Tənzimləmələr</span>}
            </Link>

            <button onClick={logout} style={logoutButton} type="button">
              <span>⎋</span>
              {!isMobile && <span>Çıxış</span>}
            </button>
          </div>
        </div>
      </nav>

      {/* MOBILE MENU */}
      {menuOpen && isMobile && (
        <div style={mobileMenuWrap}>
          <div style={mobileMenu}>
            <Link
              href="/company"
              style={linkStyle("/company")}
              onClick={() => setMenuOpen(false)}
            >
              <span>📊</span>
              İdarəetmə paneli
            </Link>

            <Link
              href="/company/create-contract"
              style={linkStyle("/company/create-contract")}
              onClick={() => setMenuOpen(false)}
            >
              <span>➕</span>
              Müqavilə yarat
            </Link>

            <Link
              href="/company/archived"
              style={linkStyle("/company/archived")}
              onClick={() => setMenuOpen(false)}
            >
              <span>🗄️</span>
              Arxiv
            </Link>

            <Link
              href="/company/settings"
              style={linkStyle("/company/settings")}
              onClick={() => setMenuOpen(false)}
            >
              <span>⚙️</span>
              Tənzimləmələr
            </Link>
          </div>
        </div>
      )}

      {/* CONTENT */}
      <main style={mainStyle}>{children}</main>
    </div>
  );
}

/* ====== STYLES ====== */

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
  background: "rgba(15,23,42,0.90)",
  borderBottom: "1px solid rgba(148,163,184,0.18)",
  boxShadow: "0 16px 44px rgba(15,23,42,0.18)",
  backdropFilter: "blur(18px)",
};

const navInner: CSSProperties = {
  width: "100%",
  maxWidth: 1280,
  margin: "0 auto",
  padding: "12px clamp(14px, 3vw, 28px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
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
  color: "#ffffff",
  fontSize: 22,
  lineHeight: 1,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const brandLink: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 11,
  color: "#ffffff",
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
  color: "#ffffff",
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
  justifyContent: "center",
  gap: 9,
  flex: 1,
};

const rightActions: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 9,
  flexShrink: 0,
};

const settingsButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  color: "#e2e8f0",
  textDecoration: "none",
  padding: "10px 13px",
  borderRadius: 14,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.10)",
  fontSize: 14,
  fontWeight: 850,
  whiteSpace: "nowrap",
};

const settingsIcon: CSSProperties = {
  fontSize: 16,
  lineHeight: 1,
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
};

const mobileMenuWrap: CSSProperties = {
  position: "sticky",
  top: 70,
  zIndex: 70,
  padding: "0 14px 12px",
  background: "rgba(15,23,42,0.90)",
  borderBottom: "1px solid rgba(148,163,184,0.16)",
  backdropFilter: "blur(18px)",
};

const mobileMenu: CSSProperties = {
  width: "100%",
  maxWidth: 1280,
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
  maxWidth: 1280,
  margin: "0 auto",
  padding: "26px clamp(14px, 3vw, 32px) 38px",
  background: "transparent",
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