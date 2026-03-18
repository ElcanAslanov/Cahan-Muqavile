"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { validatePassword } from "@/lib/password";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  async function handleReset() {
    if (!password) {
      alert("Password daxil edin");
      return;
    }

    const errorMsg = validatePassword(password);
    if (errorMsg) {
      alert(errorMsg);
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Password uğurla dəyişdirildi");

    router.push("/login");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#0f172a",
        color: "white",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: "#1e293b",
          padding: 30,
          borderRadius: 12,
        }}
      >
        <h2 style={{ marginBottom: 20 }}>Reset Password</h2>

        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: 10,
            marginBottom: 15,
            borderRadius: 6,
            border: "none",
            background: "#334155",
            color: "white",
          }}
        />

        <button
          onClick={handleReset}
          disabled={loading}
          style={{
            width: "100%",
            padding: 10,
            background: "#22c55e",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          {loading ? "Updating..." : "Update Password"}
        </button>
      </div>
    </div>
  );
}