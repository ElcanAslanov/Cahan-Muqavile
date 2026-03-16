"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  full_name: string;
  role: string;
  email: string;
};

type Company = {
  id: string;
  name: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("COMPANY_MANAGER");

  async function loadUsers() {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    if (data) {
      setUsers(data as Profile[]);
    }
  }

  async function loadCompanies() {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    if (data) {
      setCompanies(data as Company[]);
    }
  }

  function toggleCompany(id: string) {
    setSelectedCompanies((prev) =>
      prev.includes(id)
        ? prev.filter((c) => c !== id)
        : [...prev, id]
    );
  }

  async function addUser() {
    if (!name || !email || !password) {
      alert("Butun fieldleri doldurun");
      return;
    }

    if (role === "COMPANY_MANAGER" && selectedCompanies.length === 0) {
      alert("Company manager ucun en azi 1 sirket secin");
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
        company_ids: role === "COMPANY_MANAGER" ? selectedCompanies : [],
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
    const confirmDelete = confirm("User silinsin?");
    if (!confirmDelete) return;

    const { error: ucError } = await supabase
      .from("user_companies")
      .delete()
      .eq("user_id", id);

    if (ucError) {
      console.error(ucError);
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", id);

    if (profileError) {
      console.error(profileError);
      alert(profileError.message);
      return;
    }

    loadUsers();
  }

  useEffect(() => {
    loadUsers();
    loadCompanies();
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h1>Users</h1>

      <div style={{ marginBottom: 30 }}>
        <input
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ padding: 8, marginRight: 10 }}
        />

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: 8, marginRight: 10 }}
        />

        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: 8, marginRight: 10 }}
        />

        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            if (e.target.value !== "COMPANY_MANAGER") {
              setSelectedCompanies([]);
            }
          }}
          style={{ padding: 8, marginRight: 10 }}
        >
          <option value="ADMIN">ADMIN</option>
          <option value="COMPANY_MANAGER">COMPANY_MANAGER</option>
          <option value="HOLDING_MANAGER">HOLDING_MANAGER</option>
        </select>

        {role === "COMPANY_MANAGER" && (
          <div style={{ marginTop: 12 }}>
            <b>Select Companies</b>

            <div style={{ marginTop: 8 }}>
              {companies.map((c) => (
                <div key={c.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedCompanies.includes(c.id)}
                      onChange={() => toggleCompany(c.id)}
                    />
                    {c.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={addUser}
          style={{
            marginTop: 12,
            padding: "8px 16px",
            background: "#2563eb",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          Add User
        </button>
      </div>

      <ul>
        {users.map((user) => (
          <li key={user.id} style={{ marginBottom: 10 }}>
            {user.full_name} — {user.email} — {user.role}

            <button
              onClick={() => deleteUser(user.id)}
              style={{
                marginLeft: 10,
                background: "red",
                color: "white",
                border: "none",
                padding: "4px 10px",
                cursor: "pointer",
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}