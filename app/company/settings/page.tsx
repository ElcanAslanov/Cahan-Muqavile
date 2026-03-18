"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { validatePassword } from "@/lib/password";

export default function SettingsPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleChangePassword() {
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

    alert("Password dəyişdirildi");
    setPassword("");
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-md mx-auto bg-white/5 p-6 rounded-xl space-y-4">
        <h2 className="text-xl font-semibold">Settings</h2>

        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 rounded bg-gray-800"
        />

        <button
          onClick={handleChangePassword}
          disabled={loading}
          className="w-full bg-green-600 py-2 rounded"
        >
          {loading ? "Saving..." : "Change Password"}
        </button>
      </div>
    </div>
  );
}