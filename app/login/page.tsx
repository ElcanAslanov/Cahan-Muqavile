"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e?: React.FormEvent) {
    if (e) e.preventDefault();

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
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
      setLoading(false);
      return;
    }

    if (profile.role === "ADMIN") {
      router.push("/admin/dashboard");
      return;
    }

    if (profile.role === "HOLDING_MANAGER") {
      router.push("/holding");
      return;
    }

    if (profile.role === "COMPANY_MANAGER") {
      router.push("/company");
      return;
    }

    setLoading(false);
  }

  async function handleForgotPassword() {
    if (!email) {
      alert("Please enter your email first");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Password reset link sent to your email");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8"
      >
        <h2 className="text-2xl font-semibold text-white text-center mb-6">
          Welcome Back
        </h2>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 transition"
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 transition pr-12"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showPassword ? "🙈" : "👁"}
            </button>
          </div>
        </div>

        <div className="flex justify-end mt-2">
          <button
            type="button"
            onClick={handleForgotPassword}
            className="text-sm text-blue-400 hover:underline"
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all duration-200 shadow-lg"
        >
          {loading ? "Signing in..." : "Login"}
        </button>

        <p className="text-center text-gray-400 text-sm mt-6">
          Secure access to your dashboard
        </p>
      </form>
    </div>
  );
}
