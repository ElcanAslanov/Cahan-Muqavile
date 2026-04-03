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
  const [editingContract, setEditingContract] = useState<any>(null)

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

  function calculateEndDate(start: string, months: number) {
    const date = new Date(start);
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split("T")[0];
  }

  async function uploadFile(): Promise<string | null> {
    if (!file) return null;

    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("contracts")
      .upload(fileName, file);

    if (error) {
      alert("Upload error: " + error.message);
      return null;
    }

    return fileName;
  }

  async function addContract() {
    if (!counterparty || !companyId || !startDate) return;

    const endDate = calculateEndDate(startDate, parseInt(duration));
    const fileName = await uploadFile();

    await supabase.from("contracts").insert({
      counterparty,
      company_id: companyId,
      start_date: startDate,
      end_date: endDate,
      duration_month: parseInt(duration),
      auto_renew: autoRenew,
      file_url: fileName,
      status: "active",
    });

    resetForm();
    loadContracts();
  }

  async function archiveContract(id: string) {
    const confirmDelete = confirm("Muqavile arxive gonderilsin?");
    if (!confirmDelete) return;

    await supabase
      .from("contracts")
      .update({ status: "archived" })
      .eq("id", id);

    loadContracts();
  }

  async function restoreContract(id: string) {
    await supabase
      .from("contracts")
      .update({ status: "active" })
      .eq("id", id);

    loadContracts();
  }

  async function deleteContract(id: string) {
    const confirmDelete = confirm("Bu muqavile tam silinsin?");
    if (!confirmDelete) return;

    const { error } = await supabase
      .from("contracts")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Delete error: " + error.message);
      console.log("DELETE ERROR:", error);
      return;
    }

    loadContracts();
  }
  async function updateContract() {
    if (!editingContract) return;

    const selectedCompany = companies.find(
      (c) => c.id === editingContract.company_id
    );

    const { error } = await supabase
      .from("contracts")
      .update({
        counterparty: editingContract.counterparty,
        start_date: editingContract.start_date,
        end_date: editingContract.end_date,
        company_id: editingContract.company_id,
        company_name: selectedCompany?.name || null, // 🔥 ƏSAS FIX
      })
      .eq("id", editingContract.id);

    if (!error) {
      setEditingContract(null);
      loadContracts();
    }
  }
  function resetForm() {
    setCounterparty("");
    setCompanyId("");
    setStartDate("");
    setDuration("12");
    setAutoRenew(false);
    setFile(null);
  }

  useEffect(() => {
    loadContracts();
  }, [tab]);

  useEffect(() => {
    loadCompanies();
  }, []);

  return (
    <div style={{ padding: 40, background: "var(--bg-main)", minHeight: "100vh" }}>
      <h1 style={{ marginBottom: 20, color: "black" }}>Müqavilələr</h1>

      {/* Tabs */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => setTab("active")}
          style={{
            marginRight: 10,
            padding: "6px 12px",
            background: tab === "active" ? "#2563eb" : "#555",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Aktiv
        </button>

        <button
          onClick={() => setTab("archived")}
          style={{
            padding: "6px 12px",
            background: tab === "archived" ? "#2563eb" : "#555",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Arşiv
        </button>
      </div>

      {/* Form */}
      {tab === "active" && (
        <div
          style={{
            background: "var(--bg-card)",
            color: "white",
            padding: 20,
            borderRadius: 10,
            marginBottom: 30,
          }}
        >
          <input
            placeholder="Şirkət adı"
            value={counterparty}
            onChange={(e) => setCounterparty(e.target.value)}
            style={{ padding: 8, marginRight: 10 }}
          />

          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            style={{
              padding: 8,
              marginRight: 10,
              backgroundColor: "var(--bg-card)",
              color: "white",
            }}
          >
            <option value="">Şirkət seçin</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              padding: 8,
              marginRight: 10,
              backgroundColor: "var(--bg-card)",
              color: "white",
            }}
          />

          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            style={{
              padding: 8,
              marginRight: 10,
              backgroundColor: "var(--bg-card)",
              color: "white",
            }}
          >
            <option value="1">1 ay</option>
            <option value="3">3 ay</option>
            <option value="6">6 ay</option>
            <option value="12">1 il</option>
            <option value="24">2 il</option>
            <option value="36">3 il</option>
          </select>

          <label style={{ marginRight: 10, color: "white" }}>
            Avtomatik yeniləmə
            <input
              type="checkbox"
              checked={autoRenew}
              onChange={(e) => setAutoRenew(e.target.checked)}
              style={{ marginLeft: 5 }}
            />
          </label>

          <input
            type="file"
            id="pdfUpload"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={{ display: "none" }}
          />

          <label
            htmlFor="pdfUpload"
            style={{
              padding: "10px 16px",
              margin: "0 20px 0 20px",
              background: "#007bff",
              color: "white",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            PDF seç
          </label>

          <button
            onClick={addContract}
            style={{
              padding: "8px 16px",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Əlavə et
          </button>
        </div>
      )}

      {/* Contracts list */}
      <div
        style={{
          background: "var(--bg-card)",
          padding: 20,
          borderRadius: 10,
        }}
      >
        {contracts.map((c) => {
          const pdfUrl = c.file_url
            ? supabase.storage.from("contracts").getPublicUrl(c.file_url).data.publicUrl
            : null;

          return (
            <div
              key={c.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 15,
                paddingBottom: 10,
                borderBottom: "1px solid #aaa",
                color: "white",
              }}
            >
              <div>
                <b>{c.counterparty}</b>
                <div>
                  {c.start_date} → {c.end_date}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {pdfUrl && (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      marginRight: 10,
                      background: "#2563eb",
                      color: "white",
                      padding: "6px 10px",
                      borderRadius: 6,
                      textDecoration: "none",
                    }}
                  >
                    PDF-i göstər
                  </a>
                )}

                {tab === "active" ? (
                  <>
                    <button
                      onClick={() => setEditingContract(c)}
                      style={{
                        background: "#2563eb",
                        color: "white",
                        border: "none",
                        padding: "6px 10px",
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => archiveContract(c.id)}
                      style={{
                        background: "#ef4444",
                        color: "white",
                        border: "none",
                        padding: "6px 10px",
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      Arşivə at
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => restoreContract(c.id)}
                      style={{
                        background: "#16a34a",
                        color: "white",
                        border: "none",
                        padding: "6px 10px",
                        borderRadius: 6,
                        marginRight: 10,
                        cursor: "pointer",
                      }}
                    >
                      Geri qaytar
                    </button>

                    <button
                      onClick={() => deleteContract(c.id)}
                      style={{
                        background: "#b91c1c",
                        color: "white",
                        border: "none",
                        padding: "6px 10px",
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      Sil
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* EDIT MODAL */}
      {editingContract && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "var(--bg-card)",
              padding: 20,
              borderRadius: 10,
              width: 400,
              color: "white",
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 15 }}>Edit Müqavilə</h3>

            <input
              value={editingContract.counterparty}
              onChange={(e) =>
                setEditingContract({
                  ...editingContract,
                  counterparty: e.target.value,
                })
              }
              style={{
                width: "100%",
                marginBottom: 10,
                padding: 10,
                borderRadius: 6,
                border: "1px solid #475569",
                background: "#0f172a",
                color: "white",
              }}
            />

            <select
              value={editingContract.company_id || ""}
              onChange={(e) =>
                setEditingContract({
                  ...editingContract,
                  company_id: e.target.value,
                })
              }
              style={{
                width: "100%",
                marginBottom: 10,
                padding: 10,
                borderRadius: 6,
                border: "1px solid #475569",
                background: "#0f172a",
                color: "white",
              }}
            >
              <option value="">Şirkət seç</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={editingContract.start_date}
              onChange={(e) =>
                setEditingContract({
                  ...editingContract,
                  start_date: e.target.value,
                })
              }
              style={{
                width: "100%",
                marginBottom: 10,
                padding: 10,
                borderRadius: 6,
                border: "1px solid #475569",
                background: "#0f172a",
                color: "white",
              }}
            />

            <input
              type="date"
              value={editingContract.end_date}
              onChange={(e) =>
                setEditingContract({
                  ...editingContract,
                  end_date: e.target.value,
                })
              }
              style={{
                width: "100%",
                marginBottom: 15,
                padding: 10,
                borderRadius: 6,
                border: "1px solid #475569",
                background: "#0f172a",
                color: "white",
              }}
            />

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={updateContract}
                style={{
                  background: "#16a34a",
                  color: "white",
                  padding: "8px 14px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Save
              </button>

              <button
                onClick={() => setEditingContract(null)}
                style={{
                  background: "#64748b",
                  color: "white",
                  padding: "8px 14px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}