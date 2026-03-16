"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {

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

    // 🔴 Əsas hissə — yalnız ADMIN daxil ola bilər
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

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div>

      <nav
        style={{
          display: "flex",
          gap: 20,
          padding: 20,
          background: "#9e4646",
          color: "white"
        }}
      >

        <Link href="/admin/dashboard">Dashboard</Link>
        <Link href="/admin/contracts">Contracts</Link>
        <Link href="/admin/users">Users</Link>
        <Link href="/admin/companies">Companies</Link>

        <button
          onClick={logout}
          style={{
            marginLeft: "auto",
            background: "red",
            color: "white",
            border: "none",
            padding: "6px 10px",
            cursor: "pointer"
          }}
        >
          Logout
        </button>

      </nav>

      <div style={{ padding: 40 }}>
        {children}
      </div>

    </div>
  );
}