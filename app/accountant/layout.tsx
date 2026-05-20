"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AccountantLayout({
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

    if (profile.role !== "ACCOUNTANT") {
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
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at top left, rgba(14,165,233,0.25), transparent 30%), linear-gradient(135deg, #0f172a 0%, #1e3a5f 48%, #0f172a 100%)",
          color: "#fff",
          padding: 24,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 360,
            borderRadius: 24,
            padding: "30px 26px",
            background: "rgba(15, 23, 42, 0.72)",
            border: "1px solid rgba(148, 163, 184, 0.22)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
            backdropFilter: "blur(16px)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: "50%",
              margin: "0 auto 18px",
              border: "4px solid rgba(255,255,255,0.18)",
              borderTopColor: "#38bdf8",
              animation: "spin 0.9s linear infinite",
            }}
          />

          <h2
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: "-0.03em",
            }}
          >
            Panel yoxlanılır
          </h2>

          <p
            style={{
              margin: "10px 0 0",
              color: "#cbd5e1",
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            Zəhmət olmasa gözləyin, mühasib icazələri yoxlanılır...
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
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background:
          "radial-gradient(circle at top left, rgba(56,189,248,0.18), transparent 28%), radial-gradient(circle at top right, rgba(99,102,241,0.16), transparent 28%), #f3f7fb",
      }}
    >
      {/* NAVBAR */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px clamp(16px, 3vw, 34px)",
          background: "rgba(15, 23, 42, 0.88)",
          color: "white",
          gap: 14,
          borderBottom: "1px solid rgba(148, 163, 184, 0.18)",
          boxShadow: "0 16px 40px rgba(15, 23, 42, 0.18)",
          backdropFilter: "blur(18px)",
        }}
      >
        {/* LOGO */}
        <Link
          href="/accountant"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            textDecoration: "none",
            color: "inherit",
            minWidth: 0,
          }}
        >
          <span
            style={{
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
            }}
          >
            <img
              src="https://cahan.az/wp-content/uploads/2026/02/HEADER-1200x602.png"
              alt="Logo"
              style={{
                width: 42,
                height: "auto",
                display: "block",
              }}
            />
          </span>

          <span
            style={{
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                whiteSpace: "nowrap",
              }}
            >
              Mühasib Paneli
            </span>
            <span
              style={{
                fontSize: 12,
                color: "#cbd5e1",
                whiteSpace: "nowrap",
              }}
            >
              Müqavilə izləmə sistemi
            </span>
          </span>
        </Link>

        {/* TITLE */}
        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#e2e8f0",
              fontSize: 13,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#22c55e",
                boxShadow: "0 0 0 5px rgba(34,197,94,0.14)",
              }}
            />
            Aktiv giriş
          </div>
        </div>

        {/* LOGOUT */}
        <button
          onClick={logout}
          type="button"
          style={{
            background: "linear-gradient(135deg, #ef4444, #dc2626)",
            color: "white",
            border: "1px solid rgba(255,255,255,0.16)",
            padding: "10px 15px",
            borderRadius: 14,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 800,
            boxShadow: "0 12px 28px rgba(239,68,68,0.25)",
            transition: "transform 0.18s ease, box-shadow 0.18s ease",
            whiteSpace: "nowrap",
          }}
        >
          Çıxış
        </button>
      </nav>

      {/* CONTENT */}
      <main
        style={{
          flex: 1,
          width: "100%",
          maxWidth: 1280,
          margin: "0 auto",
          padding: "26px clamp(14px, 3vw, 32px) 36px",
        }}
      >
        {children}
      </main>
    </div>
  );
}