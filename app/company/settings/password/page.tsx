"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { validatePassword } from "@/lib/password";
import { useRouter } from "next/navigation";

export default function CompanyChangePasswordPage() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleChangePassword(e?: React.FormEvent) {
    if (e) e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      alert("Bütün xanaları doldurun");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Yeni şifrələr eyni deyil");
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      alert(passwordError);
      return;
    }

    if (currentPassword === newPassword) {
      alert("Yeni şifrə köhnə şifrə ilə eyni ola bilməz");
      return;
    }

    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.email) {
      setLoading(false);
      alert("İstifadəçi məlumatı tapılmadı");
      return;
    }

    const { error: checkError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (checkError) {
      setLoading(false);
      alert("Köhnə şifrə yanlışdır");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setLoading(false);

    if (updateError) {
      alert(updateError.message);
      return;
    }

    alert("Şifrə uğurla dəyişdirildi");
    router.push("/company/settings");
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <Link
            href="/company/settings"
            className="text-sm text-blue-400 hover:underline"
          >
            ← Back to Settings
          </Link>
        </div>

        <form
          onSubmit={handleChangePassword}
          className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5"
        >
          <div>
            <h1 className="text-2xl font-bold">Change Password</h1>
            <p className="text-sm text-gray-400 mt-1">
              Enter your current password and choose a new secure password.
            </p>
          </div>

          <div>
            <label className="block text-sm mb-2">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-xl bg-gray-800 px-4 py-3 pr-12 outline-none border border-transparent focus:border-blue-500"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showCurrent ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2">New Password</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl bg-gray-800 px-4 py-3 pr-12 outline-none border border-transparent focus:border-blue-500"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showNew ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2">Repeat New Password</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl bg-gray-800 px-4 py-3 pr-12 outline-none border border-transparent focus:border-blue-500"
                placeholder="Repeat new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showConfirm ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-gray-800/70 p-4 text-sm text-gray-300">
            Password qaydaları:
            <ul className="mt-2 space-y-1 list-disc pl-5">
              <li>Minimum 8 simvol</li>
              <li>Ən azı 1 böyük hərf</li>
              <li>Ən azı 1 kiçik hərf</li>
              <li>Ən azı 1 rəqəm</li>
              <li>Ən azı 1 simvol (!@#$%^&*)</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-green-600 hover:bg-green-700 transition py-3 font-medium disabled:opacity-60"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}