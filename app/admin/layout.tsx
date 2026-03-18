"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {

  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false); // 🔥 hamburger state

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

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div>

      {/* NAV */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          padding: 20,
          background: "#9e4646",
          color: "white",
          position: "relative"
        }}
      >

        {/* LEFT MENU (desktop) */}
        <div className="nav-links">
          <Link href="/admin/dashboard">Dashboard</Link>
          <Link href="/admin/contracts">Contracts</Link>
          <Link href="/admin/users">Users</Link>
          <Link href="/admin/companies">Companies</Link>
        </div>

        {/* HAMBURGER (mobile) */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="hamburger"
        >
          ☰
        </button>

        {/* LOGOUT */}
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

        {/* MOBILE MENU */}
        {menuOpen && (
          <div className="mobile-menu">
            <Link href="/admin/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</Link>
            <Link href="/admin/contracts" onClick={() => setMenuOpen(false)}>Contracts</Link>
            <Link href="/admin/users" onClick={() => setMenuOpen(false)}>Users</Link>
            <Link href="/admin/companies" onClick={() => setMenuOpen(false)}>Companies</Link>
          </div>
        )}

      </nav>

      <div >
        {children}
      </div>

      {/* STYLE */}
      <style jsx>{`
        .nav-links {
          display: flex;
          gap: 20px;
        }

        .hamburger {
          display: none;
          font-size: 24px;
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          margin-left: 10px;
        }

        .mobile-menu {
          position: absolute;
          top: 60px;
          left: 0;
          width: 100%;
          background: #7a3333;
          display: flex;
          flex-direction: column;
          padding: 15px;
          gap: 10px;
        }

        @media (max-width: 768px) {
          .nav-links {
            display: none;
          }

          .hamburger {
            display: block;
          }
        }
      `}</style>

    </div>
  );
}