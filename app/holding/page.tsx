"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Contract = {
  id: string;
  company_name: string;
  counterparty: string;
  start_date: string;
  end_date: string;
  file_url: string | null;
  auto_renew: boolean;
};

export default function HoldingDashboard() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  
  // SIRALAMA UCUN STATE
  const [sortConfig, setSortConfig] = useState<{key: keyof Contract | null, direction: 'asc' | 'desc'}>({ key: null, direction: 'asc' });

  async function loadContracts() {
    const { data, error } = await supabase
      .from("contracts")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      console.log(error);
      return;
    }

    if (data) {
      setContracts(data);
    }
  }

  useEffect(() => {
    loadContracts();
  }, []);

  function formatDate(dateStr: string) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }

  // EXPORT FUNKSIYALARI
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
    XLSX.writeFile(workbook, "Contracts_Export.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const tableColumn = ["Company", "Counterparty", "Start", "End", "Renew"];
    const tableRows = sortedAndFilteredContracts.map(c => [
      c.company_name, c.counterparty, formatDate(c.start_date), formatDate(c.end_date), c.auto_renew ? "Yes" : "No"
    ]);
    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 20 });
    doc.save("Contracts_Export.pdf");
  };

  const companies = [...new Set(contracts.map((c) => c.company_name))];

  // SIRALAMA VE FILTRLEME MENTIQI (useMemo ile)
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

  function daysLeft(end: string) {
    const endDate = new Date(end).getTime();
    const today = new Date().getTime();
    const diff = endDate - today;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  function expiryBadge(days: number) {
    if (days <= 7) return <span style={dangerBadge}>7 DAYS</span>;
    if (days <= 30) return <span style={warningBadge}>30 DAYS</span>;
    return <span style={safeBadge}>ACTIVE</span>;
  }

  function toggleCompany(company: string) {
    if (selectedCompany === company) {
      setSelectedCompany(null);
    } else {
      setSelectedCompany(company);
    }
  }

  return (
    <div
      onClick={() => setSelectedCompany(null)}
      style={{
        minHeight: "100vh",
        padding: "30px 20px",
        background: "linear-gradient(180deg,#234C6A,#456882)",
        maxWidth: 1200,
        margin: "0 auto",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 25 }}>
        <p style={{ color: "#f1f1f1", fontSize: 15, margin: 0 }}>Select company to filter contracts</p>
        <div style={{ display: "flex", gap: "10px" }}>
           <button onClick={(e) => { e.stopPropagation(); exportToExcel(); }} style={exportBtn}>Excel</button>
           <button onClick={(e) => { e.stopPropagation(); exportToPDF(); }} style={exportBtn}>PDF</button>
        </div>
      </div>

      <div style={{ marginBottom: 30 }}>
        <input
          placeholder="Search contracts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          style={searchInputStyle}
        />
      </div>

      <div style={companyGridStyle}>
        {companies.map((company) => {
          const count = contracts.filter((c) => c.company_name === company).length;
          const active = selectedCompany === company;

          return (
            <div
              key={company}
              onClick={(e) => {
                e.stopPropagation();
                toggleCompany(company);
              }}
              style={{
                ...companyCardBase,
                background: active ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "#1e293b",
                border: active ? "2px solid #818cf8" : "1px solid #334155",
                boxShadow: active ? "0 15px 35px rgba(99,102,241,0.35)" : "0 5px 15px rgba(0,0,0,0.25)",
                transform: active ? "scale(1.03)" : "scale(1)",
              }}
            >
              <h3 style={{ fontSize: 16, marginBottom: 8, color: "#e6e6e6", margin: 0 }}>{company}</h3>
              <p style={{ color: "#cbd5e1", fontSize: 14, margin: "8px 0 0 0" }}>{count} contracts</p>
            </div>
          );
        })}
      </div>

      <div style={contentContainerStyle}>
        <h2 style={{ marginBottom: 20, color: "#e6e6e6", fontSize: 20 }}>
          {selectedCompany ? `${selectedCompany} Contracts` : "All Contracts"}
        </h2>

        <div className="desktop-table">
          <table style={tableStyle}>
            <thead>
              <tr style={{ borderBottom: "1px solid #c4c4c4" }}>
                <th style={{...thStyle, cursor: "pointer"}} onClick={() => requestSort("company_name")}>Company</th>
                <th style={{...thStyle, cursor: "pointer"}} onClick={() => requestSort("counterparty")}>Counterparty</th>
                <th style={{...thStyle, cursor: "pointer"}} onClick={() => requestSort("start_date")}>Start</th>
                <th style={{...thStyle, cursor: "pointer"}} onClick={() => requestSort("end_date")}>End</th>
                <th style={thStyle}>Expiry</th>
                <th style={thStyle}>Renew</th>
                <th style={thStyle}>PDF</th>
              </tr>
            </thead>
            <tbody>
              {sortedAndFilteredContracts.map((c) => {
                const days = daysLeft(c.end_date);
                return (
                  <tr
                    key={c.id}
                    style={rowStyle}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#243042")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={tdStyle}>{c.company_name}</td>
                    <td style={tdStyle}>{c.counterparty}</td>
                    <td style={tdStyle}>{formatDate(c.start_date)}</td>
                    <td style={tdStyle}>{formatDate(c.end_date)}</td>
                    <td style={tdStyle}>{expiryBadge(days)}</td>
                    <td style={tdStyle}>
                      {c.auto_renew ? (
                        <span style={renewBadge}>🔄 RENEW</span>
                      ) : (
                        <span style={noRenewBadge}>⛔ No renew</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      {c.file_url ? (
                        <a href={c.file_url} target="_blank" rel="noopener noreferrer" style={pdfBtn}>View PDF</a>
                      ) : (
                        <span style={{ color: "#e6e6e6" }}>No PDF</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mobile-cards">
          {sortedAndFilteredContracts.map((c) => {
            const days = daysLeft(c.end_date);
            return (
              <div key={c.id} style={mobileCardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ color: "#818cf8", fontWeight: 700, fontSize: 12 }}>{c.company_name}</span>
                  {expiryBadge(days)}
                </div>
                <h3 style={{ color: "white", fontSize: 16, margin: "0 0 10px 0" }}>{c.counterparty}</h3>
                
                <div style={{ display: "flex", gap: "20px", marginBottom: 12 }}>
                  <div>
                    <p style={mobileLabelStyle}>Start Date</p>
                    <p style={mobileValueStyle}>{formatDate(c.start_date)}</p>
                  </div>
                  <div>
                    <p style={mobileLabelStyle}>End Date</p>
                    <p style={mobileValueStyle}>{formatDate(c.end_date)}</p>
                  </div>
                </div>

                <div style={mobileFooterStyle}>
                  {c.auto_renew ? (
                    <span style={renewBadge}>🔄 RENEW</span>
                  ) : (
                    <span style={noRenewBadge}>⛔ No renew</span>
                  )}
                  {c.file_url && (
                    <a href={c.file_url} target="_blank" rel="noopener noreferrer" style={pdfBtn}>View PDF</a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .desktop-table { display: block; }
        .mobile-cards { display: none; }

        @media (max-width: 900px) {
          .desktop-table { display: none; }
          .mobile-cards { display: grid; gap: 16px; grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

/* STYLES (Sənin orijinal stillərin) */
const searchInputStyle = { width: "100%", padding: "12px 14px", borderRadius: 8, border: "1px solid #334155", background: "#1e293b", color: "white", fontSize: 14 };
const companyGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 16, marginBottom: 40 };
const companyCardBase = { cursor: "pointer", padding: 18, borderRadius: 14, transition: "all 0.25s ease" };
const contentContainerStyle = { background: "#1e293b", border: "1px solid #334155", boxShadow: "0 10px 30px rgba(0,0,0,0.35)", padding: 20, borderRadius: 14 };
const tableStyle = { width: "100%", borderCollapse: "collapse" as const, minWidth: 650 };
const thStyle = { textAlign: "left" as const, padding: "12px", color: "#e6e6e6", fontSize: 14 };
const tdStyle = { padding: "12px", color: "#e6e6e6", fontSize: 14 };
const rowStyle = { borderBottom: "1px solid #1f2937", transition: "0.2s" };
const mobileCardStyle = { background: "#0f172a", border: "1px solid #334155", padding: "16px", borderRadius: "14px" };
const mobileLabelStyle = { fontSize: "11px", color: "#94a3b8", margin: 0 };
const mobileValueStyle = { fontSize: "13px", color: "white", margin: "2px 0 0 0" };
const mobileFooterStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 15, paddingTop: 15, borderTop: "1px solid #1f2937" };
const renewBadge = { background: "linear-gradient(135deg,#22c55e,#16a34a)", boxShadow: "0 4px 10px rgba(34,197,94,0.35)", padding: "4px 10px", borderRadius: 20, fontSize: 12, color: "white" };
const noRenewBadge = { background: "#374151", padding: "4px 10px", borderRadius: 20, fontSize: 12, color: "#cbd5f5" };
const safeBadge = { background: "#2563eb", padding: "4px 10px", borderRadius: 20, fontSize: 12, color: "white" };
const warningBadge = { background: "#f59e0b", padding: "4px 10px", borderRadius: 20, fontSize: 12, color: "white" };
const dangerBadge = { background: "#ef4444", padding: "4px 10px", borderRadius: 20, fontSize: 12, color: "white" };
const pdfBtn = { background: "linear-gradient(135deg,#3b82f6,#2563eb)", boxShadow: "0 6px 15px rgba(59,130,246,0.4)", color: "white", padding: "6px 10px", borderRadius: 6, textDecoration: "none" };

// EXPORT BUTON STILI
const exportBtn = { background: "#06ada5", color: "white", border: "1px solid #475569", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "13px" };