"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Company = {
  id: string;
  name: string;
};

export default function CreateContract() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [startDate, setStartDate] = useState("");
  const [duration, setDuration] = useState("12");
  const [autoRenew, setAutoRenew] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  async function loadCompanies(userId: string, perms: any[]) {
    // 🔥 yalnız create icazəsi olan company-lər
    const ids = perms
      .filter((p) => p.can_create)
      .map((p) => p.company_id);

    if (ids.length === 0) return;

    const { data } = await supabase
      .from("companies")
      .select("*")
      .in("id", ids);

    if (data) {
      setCompanies(data);
      if (data.length > 0) setCompanyId(data[0].id);
    }
  }

  useEffect(() => {
    async function init() {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;

      // 🔥 permissionləri götür
      const { data: perms } = await supabase
        .from("user_company_permissions")
        .select("*")
        .eq("user_id", userId);

      const safePerms = perms || [];
      setPermissions(safePerms);

      // 🔥 heç bir create icazəsi yoxdursa BLOCK
      const canCreate = safePerms.some((p) => p.can_create);

      if (!canCreate) {
        alert("Bu səhifəyə giriş icazən yoxdur");
        window.location.href = "/accountant";
        return;
      }

      await loadCompanies(userId, safePerms);
    }

    init();
  }, []);

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
    if (error) return null;

    const { data } = supabase.storage.from("contracts").getPublicUrl(fileName);
    return data.publicUrl;
  }

  async function createContract() {
    const monthCount = parseInt(duration);

    if (!counterparty || !companyId || !startDate || isNaN(monthCount) || monthCount <= 0) {
      alert("Zəhmət olmasa bütün xanaları düzgün doldurun");
      return;
    }

    // 🔥 COMPANY üzrə permission check
    const perm = permissions.find((p) => p.company_id === companyId);

    if (!perm || !perm.can_create) {
      alert("Bu şirkət üçün müqavilə yaratmaq icazən yoxdur");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

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
      alert("Xəta baş verdi");
      return;
    }

    alert("Müqavilə yaradıldı");
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Create Contract</h1>

        <input
          placeholder="Counterparty"
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

        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />

        <input
          type="number"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          style={inputStyle}
        />

        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />

        <button onClick={createContract} style={buttonStyle}>
          Create Contract
        </button>
      </div>
    </div>
  );
}

/* styles untouched */
const pageStyle = { minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "linear-gradient(180deg,#234C6A,#456882)" };
const cardStyle = { width: "100%", maxWidth: "520px", background: "#1e293b", padding: "30px", borderRadius: "16px" };
const titleStyle = { fontSize: "24px", color: "white" };
const inputStyle = { width: "100%", padding: "10px", marginBottom: "10px" };
const buttonStyle = { background: "#3b82f6", color: "white", padding: "12px" };