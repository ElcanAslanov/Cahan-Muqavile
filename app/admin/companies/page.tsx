"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [name, setName] = useState("");

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
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-2xl font-bold mb-6">Companies</h1>

      {/* Add Company */}
      <div className="bg-white/5 p-4 rounded-xl mb-6 flex flex-col sm:flex-row gap-3 max-w-xl">
        <input
          placeholder="Company name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 p-2 rounded bg-gray-800"
        />

        <button
          onClick={addCompany}
          className="bg-blue-600 px-4 py-2 rounded w-full sm:w-auto"
        >
          Add
        </button>
      </div>

      {/* List */}
      <div className="grid gap-3 max-w-xl">
        {companies.map((c) => (
          <div
            key={c.id}
            className="bg-white/5 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center"
          >
            <div className="font-medium">{c.name}</div>

            <button
              onClick={() => deleteCompany(c.id)}
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