"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function HoldingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

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

    if (profile.role !== "HOLDING_MANAGER") {
      router.replace("/login");
      return;
    }

    setLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <div style={loadingPage}>
        <div style={loadingCard}>
          <div style={spinner} />
          <h1 style={loadingTitle}>Holding panel yoxlanılır</h1>
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
        <Link href="/holding" style={brandLink}>
          <span style={logoBox}>
            <img
              src="https://cahan.az/wp-content/uploads/2026/02/HEADER-1200x602.png"
              alt="Logo"
              style={logoImg}
            />
          </span>

          <span style={brandTextWrap}>
            <span style={brandTitle}>Holding Paneli</span>
            <span style={brandSubtitle}>Şirkət müqavilələri</span>
          </span>
        </Link>

        <div style={centerBadge}>
          <span style={activeDot} />
          Aktiv giriş
        </div>

        <button onClick={logout} style={logoutButton} type="button">
          Çıxış
        </button>
      </nav>

      <main style={mainStyle}>{children}</main>
    </div>
  );
}

const pageShell: CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  background:
    "radial-gradient(circle at top left, rgba(56,189,248,0.18), transparent 28%), radial-gradient(circle at top right, rgba(99,102,241,0.16), transparent 28%), linear-gradient(135deg, #f3f7fb 0%, #eaf2fb 48%, #f8fafc 100%)",
};

const navStyle: CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 80,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  padding: "12px clamp(14px, 3vw, 28px)",
  background: "rgba(15,23,42,0.92)",
  color: "white",
  borderBottom: "1px solid rgba(148,163,184,0.18)",
  boxShadow: "0 16px 44px rgba(15,23,42,0.18)",
  backdropFilter: "blur(18px)",
};

const brandLink: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 11,
  color: "#fff",
  textDecoration: "none",
  minWidth: 0,
};

const logoBox: CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 16,
  background: "rgba(255,255,255,0.96)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 12px 30px rgba(0,0,0,0.16)",
  overflow: "hidden",
  flexShrink: 0,
};

const logoImg: CSSProperties = {
  width: 42,
  height: "auto",
  display: "block",
};

const brandTextWrap: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
};

const brandTitle: CSSProperties = {
  fontSize: 15,
  fontWeight: 950,
  letterSpacing: "-0.025em",
  whiteSpace: "nowrap",
};

const brandSubtitle: CSSProperties = {
  fontSize: 12,
  color: "#cbd5e1",
  marginTop: 2,
  whiteSpace: "nowrap",
};

const centerBadge: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 14px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#e2e8f0",
  fontSize: 13,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const activeDot: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "#22c55e",
  boxShadow: "0 0 0 5px rgba(34,197,94,0.14)",
};

const logoutButton: CSSProperties = {
  background: "linear-gradient(135deg, #ef4444, #dc2626)",
  color: "white",
  border: "1px solid rgba(255,255,255,0.16)",
  padding: "10px 14px",
  borderRadius: 14,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 900,
  boxShadow: "0 12px 28px rgba(239,68,68,0.24)",
  whiteSpace: "nowrap",
};

const mainStyle: CSSProperties = {
  flex: 1,
  width: "100%",
  maxWidth: 1280,
  margin: "0 auto",
  padding: "26px clamp(14px, 3vw, 32px) 38px",
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
};

const loadingText: CSSProperties = {
  margin: "10px 0 0",
  color: "#cbd5e1",
  fontSize: 14,
};