"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Contract = {
  id: string;
  company_name: string;
  company_id: string;
  counterparty: string;
  start_date: string;
  end_date: string;
  file_url: string | null;
  auto_renew: boolean;
};

export default function CompanyDashboard() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [permissions, setPermissions] = useState<any[]>([]);
  const [editingContract, setEditingContract] = useState<any>(null);

  // SIRALAMA UCUN STATE
  const [sortConfig, setSortConfig] = useState<{ key: keyof Contract | null, direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

  async function loadContracts() {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    const { data: perms } = await supabase
      .from("user_company_permissions")
      .select("*")
      .eq("user_id", userId);

    setPermissions(perms || []);

    if (!userId) {
      setLoading(false);
      return;
    }

    const { data: userCompanies } = await supabase
      .from("user_companies")
      .select("company_id")
      .eq("user_id", userId);

    if (!userCompanies || userCompanies.length === 0) {
      setLoading(false);
      return;
    }

    const companyIds = userCompanies.map((c) => c.company_id);

    const { data } = await supabase
      .from("contracts")
      .select("*")
      .in("company_id", companyIds)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (data) {
      const now = new Date().getTime();

      const expiredContracts = data.filter((c) => {
        const end = new Date(c.end_date).getTime();
        return end < now && !c.auto_renew;
      });

      if (expiredContracts.length > 0) {
        await supabase
          .from("contracts")
          .update({ status: "archived" })
          .in("id", expiredContracts.map((c) => c.id));
      }

      const activeContracts = data.filter((c) => {
        const end = new Date(c.end_date).getTime();
        return !(end < now && !c.auto_renew);
      });

      setContracts(activeContracts);
    }
    setLoading(false);
  }
  async function updateContract() {
    if (!editingContract) return;

    let fileUrl = editingContract.file_url;

    // yeni file varsa upload et
    if (editingContract.newFile) {
      const fileName = `${Date.now()}-${editingContract.newFile.name}`;

      const { error } = await supabase.storage
        .from("contracts")
        .upload(fileName, editingContract.newFile);

      if (!error) {
        const { data } = supabase.storage
          .from("contracts")
          .getPublicUrl(fileName);

        fileUrl = data.publicUrl;
      }
    }

    const { error } = await supabase
      .from("contracts")
      .update({
        company_name: editingContract.company_name,
        counterparty: editingContract.counterparty,
        start_date: editingContract.start_date,
        end_date: editingContract.end_date,
        file_url: fileUrl,
      })
      .eq("id", editingContract.id);

    if (error) {
      alert("Xəta baş verdi");
      return;
    }

    alert("Updated");
    setEditingContract(null);
    loadContracts();
  }
  function openEditModal(contract: any) {
    setEditingContract(contract);
  }


  useEffect(() => {
    loadContracts();
  }, []);
  async function deleteContract(id: string) {
    if (!confirm("Silmək istədiyinizə əminsiniz?")) return;

    const { error } = await supabase
      .from("contracts")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Xəta baş verdi");
      return;
    }

    setContracts((prev) => prev.filter((c) => c.id !== id));
  }
  async function archiveContract(id: string) {
    if (!confirm("Arxivə göndərmək istədiyinizə əminsiniz?")) return;

    const { error } = await supabase
      .from("contracts")
      .update({ status: "archived" })
      .eq("id", id);

    if (error) {
      alert("Xəta baş verdi");
      return;
    }

    // UI-dan da sil (çünki active list-də göstərirsən)
    setContracts((prev) => prev.filter((c) => c.id !== id));
  }
  function formatDate(dateStr: string) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }

  function daysLeft(end: string) {
    const endDate = new Date(end).getTime();
    const today = new Date().getTime();
    const diff = endDate - today;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  // --- EXPORT FUNKSIYALARI ---
  const exportToExcel = () => {
    const dataToExport = sortedAndFilteredContracts.map(c => ({
      "Şirkət": c.company_name,
      "Kontragent": c.counterparty,
      "Başlama": formatDate(c.start_date),
      "Bitmə": formatDate(c.end_date),
      "Yenilənmə": c.auto_renew ? "Bəli" : "Xeyr"
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Contracts");
    XLSX.writeFile(workbook, "Sirket_Muqavileleri.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const tableColumn = ["Company", "Counterparty", "Start", "End", "Renew"];
    const tableRows = sortedAndFilteredContracts.map(c => [
      c.company_name, c.counterparty, formatDate(c.start_date), formatDate(c.end_date), c.auto_renew ? "Yes" : "No"
    ]);
    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 20 });
    doc.save("Sirket_Muqavileleri.pdf");
  };

  const companies = [...new Set(contracts.map((c) => c.company_name))];

  // FILTRLEME VE SIRALAMA MENTIQI
  const sortedAndFilteredContracts = useMemo(() => {
    let result = contracts
      .filter((c) => !selectedCompany || c.company_name === selectedCompany)
      .filter((c) =>
        c.counterparty.toLowerCase().includes(search.toLowerCase()) ||
        c.company_name.toLowerCase().includes(search.toLowerCase())
      );

    if (sortConfig.key) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key!] || "";
        const bVal = b[sortConfig.key!] || "";
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [contracts, selectedCompany, search, sortConfig]);

  const requestSort = (key: keyof Contract) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  if (loading) {
    return <div style={{ padding: 30, color: "white" }}>Loading...</div>;
  }

  return (
    <div style={pageStyle} onClick={() => setSelectedCompany(null)}>
      <div style={headerWrap}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "20px" }}>
          <div>
            <h1 style={titleStyle}>Şirkət Müqavilələri</h1>
            <p style={subtitleStyle}>Müqavilə axtar</p>
          </div>

          {/* EXPORT BUTONLARI */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={(e) => { e.stopPropagation(); exportToExcel(); }} style={excelBtnStyle}>Excel</button>
            <button onClick={(e) => { e.stopPropagation(); exportToPDF(); }} style={pdfExportBtnStyle}>PDF</button>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <input
          placeholder="Müqavilə axtar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          style={searchInputStyle}
        />
      </div>

      {companies.length > 1 && (
        <div style={companyGrid}>
          {companies.map((company) => {
            const count = contracts.filter((c) => c.company_name === company).length;
            const isActive = selectedCompany === company;
            return (
              <div
                key={company}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCompany(isActive ? null : company);
                }}
                style={{
                  ...companyCardBase,
                  background: isActive ? "linear-gradient(135deg,#3b82f6,#2563eb)" : "#1e293b",
                  border: isActive ? "2px solid #60a5fa" : "1px solid #334155",
                }}
              >
                <h3 style={{ margin: 0, fontSize: 15, color: "white" }}>{company}</h3>
                <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#cbd5e1" }}>{count} müqavilə</p>
              </div>
            );
          })}
        </div>
      )}

      {sortedAndFilteredContracts.length === 0 ? (
        <div style={emptyCard}>
          <p style={{ margin: 0, color: "#cbd5e1" }}>No contracts found</p>
        </div>
      ) : (
        <>
          <div className="desktop-table" style={tableWrap}>
            <table style={tableStyle}>
              <thead>
                <tr style={{ borderBottom: "1px solid #334155" }}>
                  <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => requestSort("company_name")}>Şirkət ↕</th>
                  <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => requestSort("counterparty")}>Müqavilə ↕</th>
                  <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => requestSort("start_date")}>Başlama ↕</th>
                  <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => requestSort("end_date")}>Bitmə ↕</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Yeniləmə</th>
                  <th style={thStyle}>Sənəd</th>
                  <th style={thStyle}>Əməliyyatlar</th>
                </tr>
              </thead>
              <tbody>
                {sortedAndFilteredContracts.map((c) => {
                  const canDelete = permissions.some(
                    (p) => p.company_id === c.company_id && p.can_delete
                  );
                  const canArchive = permissions.some(
                    (p) => p.company_id === c.company_id && p.can_archive
                  );
                  const canEdit = permissions.some(
                    (p) => p.company_id === c.company_id && p.can_edit
                  );
                  const days = daysLeft(c.end_date);
                  return (
                    <tr key={c.id} style={rowStyle}>
                      <td style={tdStyle}>{c.company_name}</td>
                      <td style={tdStyle}>{c.counterparty}</td>
                      <td style={tdStyle}>{formatDate(c.start_date)}</td>
                      <td style={tdStyle}>{formatDate(c.end_date)}</td>
                      <td style={tdStyle}>{expiryBadge(days)}</td>
                      <td style={tdStyle}>
                        {c.auto_renew ? (
                          <span style={renewBadge}>🔄 Yeniləmə</span>
                        ) : (
                          <span style={noRenewBadge}>⛔ Yeniləmə yoxdur</span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        {c.file_url ? (
                          <a href={c.file_url} target="_blank" rel="noopener noreferrer" style={pdfBtn}>Pdf bax</a>
                        ) : (
                          <span style={{ color: "#64748b" }}>N/A</span>
                        )}

                      </td>
                      <td style={tdStyle}>
                        {canArchive && (
                          <button
                            onClick={() => archiveContract(c.id)}
                            style={{
                              background: "#f59e0b",
                              color: "white",
                              padding: "6px 10px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              marginRight: "6px",
                            }}
                          >
                            Arxiv
                          </button>
                        )}

                        {canDelete && (
                          <button
                            onClick={() => deleteContract(c.id)}
                            style={{
                              background: "#dc2626",
                              color: "white",
                              padding: "6px 10px",
                              borderRadius: "6px",
                              fontSize: "12px",
                            }}
                          >
                            Sil
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => openEditModal(c)}
                            style={{
                              background: "#2563eb",
                              color: "white",
                              padding: "6px 10px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              margin: " 0 0 0 6px",
                            }}
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mobile-cards" style={mobileGrid}>
            {sortedAndFilteredContracts.map((c) => {
              const days = daysLeft(c.end_date);
              return (
                <div key={c.id} style={mobileContractCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ fontSize: 12, color: "#3b82f6", fontWeight: 700 }}>{c.company_name}</span>
                    {expiryBadge(days)}
                  </div>
                  <h3 style={{ margin: "0 0 8px 0", fontSize: 16, color: "white" }}>{c.counterparty}</h3>

                  <div style={mobileInfoRow}>
                    <div>
                      <p style={mobileLabel}>Start Date</p>
                      <p style={mobileValue}>{formatDate(c.start_date)}</p>
                    </div>
                    <div>
                      <p style={mobileLabel}>End Date</p>
                      <p style={mobileValue}>{formatDate(c.end_date)}</p>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 15, paddingTop: 15, borderTop: "1px solid #334155" }}>
                    <div>
                      {c.auto_renew ? (
                        <span style={renewBadge}>🔄Avtomatik Yeniləmə</span>
                      ) : (
                        <span style={noRenewBadge}>⛔ Manual</span>
                      )}
                    </div>
                    {c.file_url && (
                      <a href={c.file_url} target="_blank" rel="noopener noreferrer" style={pdfBtn}>Pdf bax</a>
                    )}
                  </div>
                  {permissions.some(
                    (p) => p.company_id === c.company_id && p.can_delete
                  ) && (
                      <button
                        onClick={() => deleteContract(c.id)}
                        style={{
                          background: "#dc2626",
                          color: "white",
                          padding: "6px 10px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          marginTop: "10px",
                        }}
                      >
                        Sil
                      </button>
                    )}
                  {permissions.some(
                    (p) => p.company_id === c.company_id && p.can_archive
                  ) && (
                      <button
                        onClick={() => archiveContract(c.id)}
                        style={{
                          background: "#f59e0b",
                          color: "white",
                          padding: "6px 10px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          marginTop: "10px",
                        }}
                      >
                        Arxiv
                      </button>
                    )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <style jsx>{`
        @media (max-width: 900px) {
          .desktop-table { display: none !important; }
          .mobile-cards { display: grid !important; }
        }
        @media (min-width: 901px) {
          .mobile-cards { display: none !important; }
        }
      `}</style>
      {editingContract && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 999,
          }}
        >
          <div
            style={{
              background: "white",
              padding: 25,
              borderRadius: 12,
              width: 400,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <h3>Edit Contract</h3>

            {/* COMPANY */}
            <select
              value={editingContract.company_name}
              onChange={(e) =>
                setEditingContract({
                  ...editingContract,
                  company_name: e.target.value,
                })
              }
              style={inputStyle}
            >
              {companies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* COUNTERPARTY */}
            <input
              value={editingContract.counterparty}
              onChange={(e) =>
                setEditingContract({
                  ...editingContract,
                  counterparty: e.target.value,
                })
              }
              placeholder="Counterparty"
              style={inputStyle}
            />

            {/* START DATE */}
            <input
              type="date"
              value={editingContract.start_date}
              onChange={(e) =>
                setEditingContract({
                  ...editingContract,
                  start_date: e.target.value,
                })
              }
              style={inputStyle}
            />

            {/* END DATE */}
            <input
              type="date"
              value={editingContract.end_date}
              onChange={(e) =>
                setEditingContract({
                  ...editingContract,
                  end_date: e.target.value,
                })
              }
              style={inputStyle}
            />

            {/* FILE */}
            <input
              type="file"
              onChange={(e) =>
                setEditingContract({
                  ...editingContract,
                  newFile: e.target.files?.[0],
                })
              }
            />

            {/* BUTTONS */}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={updateContract} style={saveBtn}>
                Save
              </button>
              <button onClick={() => setEditingContract(null)} style={cancelBtn}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
}

// Sənin köhnə funksiyaların və nişanların (status badge)
function expiryBadge(days: number) {
  if (days <= 7) return <span style={dangerBadge}>7 Gün</span>;
  if (days <= 30) return <span style={warningBadge}>30 GÜN</span>;
  return <span style={safeBadge}>Aktiv</span>;
}

/* STYLES */
const pageStyle = { minHeight: "100vh", padding: "30px 20px", background: "linear-gradient(180deg,#0f172a,#1e293b)", color: "white" };
const headerWrap = { marginBottom: "30px" };
const titleStyle = { margin: 0, fontSize: "28px", fontWeight: 700 };
const subtitleStyle = { marginTop: "6px", color: "#94a3b8", fontSize: "14px" };
const searchInputStyle = { width: "100%", maxWidth: "400px", padding: "12px 16px", borderRadius: "10px", border: "1px solid #334155", background: "#0f172a", color: "white", outline: "none" };
const companyGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" };
const companyCardBase = { padding: "16px", borderRadius: "14px", cursor: "pointer", transition: "0.3s" };
const tableWrap = { background: "#0f172a", border: "1px solid #334155", borderRadius: "16px", overflow: "hidden" };
const tableStyle = { width: "100%", borderCollapse: "collapse" as const };
const thStyle = { textAlign: "left" as const, padding: "16px", color: "#94a3b8", fontSize: "12px", textTransform: "uppercase" as const };
const tdStyle = { padding: "16px", fontSize: "14px", borderBottom: "1px solid #1e293b" };
const rowStyle = { transition: "0.2s" };
const mobileGrid = { gap: "16px", gridTemplateColumns: "1fr" };
const mobileContractCard = { background: "#0f172a", border: "1px solid #334155", borderRadius: "16px", padding: "16px" };
const mobileInfoRow = { display: "flex", gap: "20px", marginTop: "10px" };
const mobileLabel = { fontSize: "11px", color: "#94a3b8", margin: 0 };
const mobileValue = { fontSize: "13px", color: "white", margin: "2px 0 0 0", fontWeight: 500 };
const renewBadge = { background: "#059669", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", color: "white" };
const noRenewBadge = { background: "#475569", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", color: "#cbd5e1" };
const safeBadge = { background: "#2563eb", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600 };
const warningBadge = { background: "#d97706", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600 };
const dangerBadge = { background: "#dc2626", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600 };
const pdfBtn = { background: "#3b82f6", color: "white", padding: "8px 14px", borderRadius: "8px", textDecoration: "none", fontSize: "12px" };
const emptyCard = { background: "#1e293b", padding: "40px", borderRadius: "16px", textAlign: "center" as const };

// EXPORT DÜYMƏLƏRİ ÜÇÜN STİLLƏR (Arxa fonlu)
const excelBtnStyle = { background: "#107c41", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600, boxShadow: "0 4px 10px rgba(0,0,0,0.2)" };
const pdfExportBtnStyle = { background: "#e11d48", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600, boxShadow: "0 4px 10px rgba(0,0,0,0.2)" };
const inputStyle = {
  padding: "10px",
  border: "1px solid #ccc",
  borderRadius: "6px",
   background: "var(--bg-card)",
  color: "white"
};

const saveBtn = {
  background: "var(--bg-card)",
  color: "white",
  padding: "8px 12px",
  borderRadius: "6px",
  border: "none",
};

const cancelBtn = {
  background: "var(--bg-card)",
  color: "white",
  padding: "8px 12px",
  borderRadius: "6px",
  border: "none",
};