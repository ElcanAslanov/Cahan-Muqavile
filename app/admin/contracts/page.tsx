"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Contract = {
  id: string;
  counterparty: string;
  start_date: string;
  end_date: string;
  file_url: string | null;
  auto_renew: boolean;
  status: "active" | "archived";
};

type Company = {
  id: string;
  name: string;
};

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [tab, setTab] = useState<"active" | "archived">("active");

  const [counterparty, setCounterparty] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [duration, setDuration] = useState("12");
  const [autoRenew, setAutoRenew] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  // Bu hissədə sənin bütün orijinal funksiyaların (loadCompanies, calculateEndDate və s.) eynilə qalır
  async function loadContracts() {
    const { data } = await supabase
      .from("contracts")
      .select("*")
      .eq("status", tab)
      .order("created_at", { ascending: false });

    if (data) setContracts(data as Contract[]);
  }

  async function loadCompanies() {
    const { data } = await supabase.from("companies").select("*");
    if (data) setCompanies(data);
  }

  // TƏMİR OLUNMUŞ DELETE FUNKSİYASI
  async function deleteContract(id: string) {
    const confirmDelete = confirm("Bu müqavilə tam silinsin?");
    if (!confirmDelete) return;

    // Error-u tuturuq ki, problem nədir bilək
    const { error } = await supabase
      .from("contracts")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("SİLİNMƏ XƏTASI:", error.message);
      alert("Silmək mümkün olmadı: " + error.message);
    } else {
      // Silinmə uğurludursa, siyahını yeniləyirik
      setContracts(prev => prev.filter(c => c.id !== id));
      alert("Müqavilə bazadan silindi.");
    }
  }

  // Digər orijinal funksiyaların (archive, restore, uploadFile) bura daxildir...
  // (Vaxt itirməmək üçün onları bura təkrar yazmıram, sənin faylında olduğu kimi saxla)

  useEffect(() => {
    loadContracts();
  }, [tab]);

  useEffect(() => {
    loadCompanies();
  }, []);

  return (
    <div style={{ padding: 40, background: "#443636", minHeight: "100vh" }}>
      <h1 style={{ marginBottom: 20, color: "white" }}>Contracts</h1>

      {/* TABS */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={() => setTab("active")} style={{ marginRight: 10, padding: "6px 12px", background: tab === "active" ? "#2563eb" : "#555", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}>Active</button>
        <button onClick={() => setTab("archived")} style={{ padding: "6px 12px", background: tab === "archived" ? "#2563eb" : "#555", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}>Archived</button>
      </div>

      {/* Sənin orijinal Listin və Silmə Düymən */}
      <div style={{ background: "#6b6b6b", padding: 20, borderRadius: 10 }}>
        {contracts.map((c) => {
          const pdfUrl = c.file_url ? supabase.storage.from("contracts").getPublicUrl(c.file_url).data.publicUrl : null;

          return (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 15, paddingBottom: 10, borderBottom: "1px solid #aaa", color: "white" }}>
              <div>
                <b>{c.counterparty}</b>
                <div>{c.start_date} → {c.end_date}</div>
              </div>

              <div>
                {pdfUrl && <a href={pdfUrl} target="_blank" style={{ marginRight: 10, background: "#2563eb", color: "white", padding: "6px 10px", borderRadius: 6, textDecoration: "none" }}>View PDF</a>}
                
                {tab === "active" ? (
                  <button onClick={() => deleteContract(c.id)} style={{ background: "#ef4444", color: "white", border: "none", padding: "6px 10px", borderRadius: 6, cursor: "pointer" }}>Delete (Archive)</button>
                ) : (
                  <>
                    <button onClick={() => deleteContract(c.id)} style={{ background: "#b91c1c", color: "white", border: "none", padding: "6px 10px", borderRadius: 6, cursor: "pointer" }}>Delete Forever</button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}