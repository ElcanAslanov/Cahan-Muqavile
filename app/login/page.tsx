"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {

  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

async function handleLogin() {

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert(error.message);
    return;
  }

  const user = data.user;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    alert("Profile not found");
    return;
  }

  // ADMIN
  if (profile.role === "ADMIN") {
    router.push("/admin/dashboard");
    return;
  }

  // HOLDING MANAGER
  if (profile.role === "HOLDING_MANAGER") {
    router.push("/holding");
    return;
  }

  // COMPANY MANAGER
  if (profile.role === "COMPANY_MANAGER") {
    router.push("/company");
    return;
  }

}
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#443636"
      }}
    >

      <div
        style={{
          background: "#6b6b6b",
          padding: 40,
          borderRadius: 10,
          width: 320
        }}
      >

        <h2 style={{ color: "white", marginBottom: 20 }}>
          Login
        </h2>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%",
            padding: 10,
            marginBottom: 10
          }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: 10,
            marginBottom: 20
          }}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: 10,
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer"
          }}
        >
          {loading ? "Loading..." : "Login"}
        </button>

      </div>

    </div>
  );
}