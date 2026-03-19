"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Company = {
  id: string;
  name: string;
};

export default function CreateContract() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [startDate, setStartDate] = useState("");
  
  // SELECT əvəzinə artıq sərbəst rəqəm daxil edilə bilən string/number istifadə edirik
  const [duration, setDuration] = useState("12"); 

  const [autoRenew, setAutoRenew] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  async function loadCompanies() {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    const { data: userCompanies } = await supabase
      .from("user_companies")
      .select("company_id")
      .eq("user_id", userId);

    if (!userCompanies) return;
    const ids = userCompanies.map((c) => c.company_id);

    const { data } = await supabase
      .from("companies")
      .select("*")
      .in("id", ids);

    if (data) {
      setCompanies(data);
      if (data.length > 0) setCompanyId(data[0].id);
    }
  }

  function calculateEndDate(start: string, months: number) {
    if (!start || isNaN(months)) return null;
    const date = new Date(start);
    if (isNaN(date.getTime())) return null;

    date.setMonth(date.getMonth() + months);
    return date.toISOString().split("T")[0];
  }

  async function uploadFile() {
    if (!file) return null;
    const fileName = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("contracts").upload(fileName, file);
    if (error) {
      console.log("UPLOAD ERROR:", error);
      return null;
    }
    const { data } = supabase.storage.from("contracts").getPublicUrl(fileName);
    return data.publicUrl;
  }

  async function createContract() {
    const monthCount = parseInt(duration);
    
    if (!counterparty || !companyId || !startDate || isNaN(monthCount) || monthCount <= 0) {
      alert("Zəhmət olmasa bütün xanaları düzgün doldurun (Ay müsbət rəqəm olmalıdır)");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      alert("İstifadəçi tapılmadı");
      return;
    }

    const company = companies.find((c) => c.id === companyId);
    const endDate = calculateEndDate(startDate, monthCount);
    const fileUrl = await uploadFile();

    const { error } = await supabase.from("contracts").insert({
      counterparty,
      company_id: companyId,
      company_name: company?.name,
      start_date: startDate,
      end_date: endDate,
      duration_month: monthCount,
      file_url: fileUrl,
      status: "active",
      auto_renew: autoRenew,
      created_by: userId,
    });

    if (error) {
      console.log(error);
      alert("Müqavilə yaradılarkən xəta baş verdi");
      return;
    }

    alert("Müqavilə uğurla yaradıldı!");
    setCounterparty("");
    setStartDate("");
    setFile(null);
    setAutoRenew(false);
    setDuration("12");
  }

  useEffect(() => {
    loadCompanies();
  }, []);

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Create Contract</h1>
        <p style={subtitleStyle}>Add a new contract for your company</p>

        <div style={formGrid}>
          <input
            placeholder="Counterparty (məs: Azərsun)"
            value={counterparty}
            onChange={(e) => setCounterparty(e.target.value)}
            style={inputStyle}
          />

          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} style={inputStyle}>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "12px", color: "#94a3b8", marginLeft: "4px" }}>Başlama tarixi</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* DƏYİŞİKLİK BURADADIR: Artıq istənilən ay yazıla bilər */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "12px", color: "#94a3b8", marginLeft: "4px" }}>Müddət (Ay ilə)</span>
            <input
              type="number"
              min="1"
              placeholder="Məs: 9"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              style={inputStyle}
            />
          </div>

          <label style={checkboxStyle}>
            <input
              type="checkbox"
              checked={autoRenew}
              onChange={(e) => setAutoRenew(e.target.checked)}
            />
            Auto Renew
          </label>

          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={fileStyle}
          />
        </div>

        <button onClick={createContract} style={buttonStyle}>
          Create Contract
        </button>
      </div>
    </div>
  );
}

/* STYLES (Dəyişməyib, sadəcə səliqə üçün saxlanılıb) */
const pageStyle = { minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", padding: "20px", background: "linear-gradient(180deg,#234C6A,#456882)" };
const cardStyle = { width: "100%", maxWidth: "520px", background: "#1e293b", padding: "30px", borderRadius: "16px", boxShadow: "0 25px 50px rgba(0,0,0,0.35)", display: "flex", flexDirection: "column" as const, gap: "20px" };
const titleStyle = { fontSize: "24px", fontWeight: 600, color: "white", margin: 0, textAlign: "center" as const };
const subtitleStyle = { fontSize: "14px", color: "#cbd5e1", textAlign: "center" as const };
const formGrid = { display: "flex", flexDirection: "column" as const, gap: "14px" };
const inputStyle = { width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #334155", background: "#0f172a", color: "white", fontSize: "14px" };
const checkboxStyle = { display: "flex", alignItems: "center", gap: "10px", color: "#e2e8f0", fontSize: "14px" };
const fileStyle = { color: "#e2e8f0" };
const buttonStyle = { marginTop: "10px", background: "linear-gradient(135deg,#3b82f6,#2563eb)", color: "white", padding: "14px", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: 500, cursor: "pointer", boxShadow: "0 8px 20px rgba(59,130,246,0.35)" };