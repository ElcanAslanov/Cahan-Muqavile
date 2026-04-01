"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { validatePassword } from "@/lib/password";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("COMPANY_MANAGER");

  const [newPassword, setNewPassword] = useState("");
  const [selectedUser, setSelectedUser] = useState<string>("");

  async function loadUsers() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setUsers(data);
  }

  async function loadCompanies() {
    const { data } = await supabase.from("companies").select("*");
    if (data) setCompanies(data);
  }

  function toggleCompany(id: string) {
    setSelectedCompanies((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  async function addUser() {
    if (!name || !email || !password) {
      alert("Butun fieldleri doldurun");
      return;
    }

    const errorMsg = validatePassword(password);
    if (errorMsg) {
      alert(errorMsg);
      return;
    }

    if (
      (role === "COMPANY_MANAGER" || role === "ACCOUNTANT") &&
      selectedCompanies.length === 0
    ) {
      alert("Bu rol ucun en azi 1 sirket secin");
      return;
    }

    const res = await fetch("/api/create-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        full_name: name,
        role,
        company_ids:
          role === "COMPANY_MANAGER" || role === "ACCOUNTANT"
            ? selectedCompanies
            : [],
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      alert(data.error || "User create error");
      return;
    }

    alert("User created");

    setName("");
    setEmail("");
    setPassword("");
    setRole("COMPANY_MANAGER");
    setSelectedCompanies([]);

    loadUsers();
  }

  async function deleteUser(id: string) {
    if (!confirm("Delete user?")) return;

    await supabase.from("profiles").delete().eq("id", id);
    loadUsers();
  }

  async function changePassword() {
    if (!selectedUser || !newPassword) {
      alert("Select user and enter password");
      return;
    }

    const res = await fetch("/api/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedUser, newPassword }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error);
      return;
    }

    alert("Password updated");
    setNewPassword("");
    setSelectedUser("");
  }

  useEffect(() => {
    loadUsers();
    loadCompanies();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-2xl font-bold mb-6">Users</h1>

      {/* Add User */}
      <div className="bg-white/5 p-4 rounded-xl mb-6 space-y-3 max-w-xl">
        <input
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 rounded bg-gray-800"
        />

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 rounded bg-gray-800"
        />

        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 rounded bg-gray-800"
        />

        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            if (
              e.target.value !== "COMPANY_MANAGER" &&
              e.target.value !== "ACCOUNTANT"
            ) {
              setSelectedCompanies([]);
            }
          }}
          className="w-full p-2 rounded bg-gray-800"
        >
          <option value="ADMIN">ADMIN</option>
          <option value="COMPANY_MANAGER">COMPANY_MANAGER</option>
          <option value="HOLDING_MANAGER">HOLDING_MANAGER</option>
          <option value="ACCOUNTANT">ACCOUNTANT</option>
        </select>

        {(role === "COMPANY_MANAGER" || role === "ACCOUNTANT") && (
          <div>
            <div className="text-sm mb-1">Select Companies</div>
            {companies.map((c) => (
              <label key={c.id} className="block text-sm">
                <input
                  type="checkbox"
                  checked={selectedCompanies.includes(c.id)}
                  onChange={() => toggleCompany(c.id)}
                />{" "}
                {c.name}
              </label>
            ))}
          </div>
        )}

        <button
          onClick={addUser}
          className="bg-blue-600 px-4 py-2 rounded w-full"
        >
          Add User
        </button>
      </div>

      {/* Change Password */}
      <div className="bg-white/5 p-4 rounded-xl mb-6 max-w-xl space-y-3">
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="w-full p-2 rounded bg-gray-800"
        >
          <option value="">Select user</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name} ({u.email})
            </option>
          ))}
        </select>

        <input
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full p-2 rounded bg-gray-800"
        />

        <button
          onClick={changePassword}
          className="bg-green-600 px-4 py-2 rounded w-full"
        >
          Change Password
        </button>
      </div>

      {/* Users */}
      <div className="grid gap-3">
        {users.map((user) => (
          <div
            key={user.id}
            className="bg-white/5 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center"
          >
            <div>
              <div className="font-semibold">{user.full_name}</div>
              <div className="text-sm text-gray-400">{user.email}</div>
              <div className="text-xs text-blue-400">{user.role}</div>
            </div>

            <button
              onClick={() => deleteUser(user.id)}
              className="mt-3 sm:mt-0 bg-red-600 px-3 py-1 rounded"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}