"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [name, setName] = useState("");

  // Companies yüklə
  async function loadCompanies() {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    if (data) setCompanies(data);
  }

  // Company əlavə et
  async function addCompany() {
    if (!name.trim()) return;

    const { error } = await supabase.from("companies").insert({
      name,
    });

    if (error) {
      console.error(error);
      return;
    }

    setName("");
    loadCompanies();
  }

  // Company sil
  async function deleteCompany(id: string) {
    const confirmDelete = confirm("Bu şirkəti silmək istəyirsiniz?");
    if (!confirmDelete) return;

    const { error } = await supabase.from("companies").delete().eq("id", id);

    if (error) {
      console.error(error);
      return;
    }

    loadCompanies();
  }

  useEffect(() => {
    loadCompanies();
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h1>Companies</h1>

      <div style={{ marginBottom: 20 }}>
        <input
          placeholder="Company name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ padding: 8, marginRight: 10 }}
        />

        <button onClick={addCompany} style={{ padding: "8px 16px" }}>
          Add
        </button>
      </div>

      <ul>
        {companies.map((c) => (
          <li key={c.id} style={{ marginBottom: 10 }}>
            {c.name}

            <button
              style={{ marginLeft: 10 }}
              onClick={() => deleteCompany(c.id)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}