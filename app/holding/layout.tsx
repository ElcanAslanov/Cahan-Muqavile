"use client";

import { useEffect, useState } from "react";
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
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* NAVBAR */}

      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          background: "linear-gradient(rgb(35, 76, 106), rgb(69, 104, 130))",
          color: "white",
          gap: 10
        }}
      >

        {/* LOGO */}

        <Link
          href="/holding"
          style={{
            display: "flex",
            alignItems: "center"
          }}
        >
          <img
            src="https://cahan.az/wp-content/uploads/2026/02/HEADER-1200x602.png"
            style={{
              width: 70,
              height: "auto"
            }}
          />
        </Link>

        {/* TITLE */}

        <h1
          style={{
            fontSize: 16,
            fontWeight: 600,
            margin: 0,
            textAlign: "center",
            flex: 1,
            whiteSpace: "nowrap"
          }}
        >
          Şirkət müqavilələri 
        </h1>

        {/* LOGOUT BUTTON */}

        <button
          onClick={logout}
          style={{
            background: "#ef4444",
            color: "white",
            border: "none",
            padding: "6px 12px",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500
          }}
        >
          Logout
        </button>

      </nav>

      {/* PAGE CONTENT */}

      <main
        style={{
          flex: 1,
          padding: "30px 20px",
          width: "100%",
          maxWidth: 1200,
          margin: "0 auto"
        }}
      >
        {children}
      </main>

    </div>
  );
}