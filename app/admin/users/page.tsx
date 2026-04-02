"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { validatePassword } from "@/lib/password";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);

  const [permissions, setPermissions] = useState<any[]>([]);

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

    if (data) {
      setCompanies(data);

      const initial = data.map((c) => ({
        company_id: c.id,
        can_read: false,
        can_create: false,
        can_delete: false,
        can_archive: false,
      }));

      setPermissions(initial);
    }
  }

  function toggleCompany(id: string) {
    setSelectedCompanies((prev) => {
      const exists = prev.includes(id);

      const updated = exists
        ? prev.filter((c) => c !== id)
        : [...prev, id];

      // 🔥 deselect edəndə permission sıfırla
      if (exists) {
        setPermissions((perms) =>
          perms.map((p) =>
            p.company_id === id
              ? {
                  ...p,
                  can_read: false,
                  can_create: false,
                  can_delete: false,
                  can_archive: false,
                }
              : p
          )
        );
      }

      return updated;
    });
  }

  function updatePermission(index: number, key: string, value: boolean) {
    const updated = [...permissions];
    updated[index][key] = value;
    setPermissions(updated);
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
        permissions,
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
    <div  className="min-h-screen  text-black p-6">
      <h1 className="text-2xl font-bold mb-6">Users</h1>

      <div className="bg-white/5 p-4 rounded-xl mb-6 space-y-3 max-w-xl">
        <input
          placeholder="Tam ad"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 rounded text-white bg-gray-800"
        />

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 text-white rounded bg-gray-800"
        />

        <input
          placeholder="Parol"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full text-white p-2 rounded bg-gray-800"
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
          className="w-full text-white p-2 rounded bg-gray-800"
        >
          <option value="ADMIN">ADMIN</option>
          <option value="COMPANY_MANAGER">Şirkət Meneceri</option>
          <option value="HOLDING_MANAGER">Holding Rəhbəri</option>
          <option value="ACCOUNTANT">Mühasib</option>
        </select>

        {(role === "COMPANY_MANAGER" || role === "ACCOUNTANT") && (
          <div>
            <div className="text-sm mb-1">Şirkət seçin</div>
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

        <div className="mt-4">
          <div className="text-sm mb-1">İcazələr</div>

          <table className="w-full text-sm border border-gray-700">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="p-2 text-left">Şirkət</th>
                <th className="text-left">Baxmaq</th>
                <th className="text-left">Yaratmaq</th>
                <th className="text-left">Silmək</th>
                <th className="text-left">Arxivləşdirmək</th>
              </tr>
            </thead>

            <tbody>
              {companies.map((c, i) => (
                <tr key={c.id} className="border-t border-gray-700">
                  <td className="p-2">{c.name}</td>

                  <td>
                    <input
                      type="checkbox"
                      disabled={!selectedCompanies.includes(c.id)}
                      checked={
                        selectedCompanies.includes(c.id) &&
                        permissions[i]?.can_read
                      }
                      onChange={(e) =>
                        updatePermission(i, "can_read", e.target.checked)
                      }
                    />
                  </td>

                  <td>
                    <input
                      type="checkbox"
                      disabled={!selectedCompanies.includes(c.id)}
                      checked={
                        selectedCompanies.includes(c.id) &&
                        permissions[i]?.can_create
                      }
                      onChange={(e) =>
                        updatePermission(i, "can_create", e.target.checked)
                      }
                    />
                  </td>

                  <td>
                    <input
                      type="checkbox"
                      disabled={!selectedCompanies.includes(c.id)}
                      checked={
                        selectedCompanies.includes(c.id) &&
                        permissions[i]?.can_delete
                      }
                      onChange={(e) =>
                        updatePermission(i, "can_delete", e.target.checked)
                      }
                    />
                  </td>

                  <td>
                    <input
                      type="checkbox"
                      disabled={!selectedCompanies.includes(c.id)}
                      checked={
                        selectedCompanies.includes(c.id) &&
                        permissions[i]?.can_archive
                      }
                      onChange={(e) =>
                        updatePermission(i, "can_archive", e.target.checked)
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          onClick={addUser}
          className="bg-blue-600 text-white px-4 py-2 rounded w-full"
        >
        Əlavə et
        </button>
      </div>

      <div className="bg-white/5 p-4 rounded-xl mb-6 max-w-xl space-y-3">
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="w-full p-2 rounded bg-gray-800 text-white"
        >
          <option value="">İstifadəçi seçin</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name} ({u.email})
            </option>
          ))}
        </select>

        <input
          placeholder="Yeni parol"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full text-white p-2 rounded bg-gray-800"
        />

        <button
          onClick={changePassword}
          className="bg-green-600 text-white px-4 py-2 rounded w-full"
        >
         Parolu dəyiş
        </button>
      </div>

      <div className="grid gap-3">
        {users.map((user) => (
          <div
            key={user.id}
            className="bg-gray-800 text-white p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center"
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
              Sil
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}