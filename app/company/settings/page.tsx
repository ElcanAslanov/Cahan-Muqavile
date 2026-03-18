"use client";

import Link from "next/link";

export default function CompanySettingsPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h2 className="text-lg font-semibold mb-4">Security</h2>

          <Link
            href="/company/settings/password"
            className="flex items-center justify-between rounded-xl bg-gray-800 hover:bg-gray-700 transition px-4 py-4"
          >
            <div>
              <div className="font-medium">Change Password</div>
              <div className="text-sm text-gray-400">
                Update your account password securely
              </div>
            </div>

            <span className="text-gray-300">›</span>
          </Link>
        </div>
      </div>
    </div>
  );
}