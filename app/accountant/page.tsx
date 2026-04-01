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
  company_id: string;
};

export default function AccountantDashboard() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [sortConfig, setSortConfig] = useState<{
    key: keyof Contract | null;
    direction: "asc" | "desc";
  }>({ key: null, direction: "asc" });

  // 🔥 ACCOUNTANT FILTER (UI-ya toxunmur)
  async function loadContracts() {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    const { data: userCompanies } = await supabase
      .from("user_companies")
      .select("company_id")
      .eq("user_id", userId);

    const companyIds = userCompanies?.map((c) => c.company_id) || [];

    const { data } = await supabase
      .from("contracts")
      .select("*")
      .in("company_id", companyIds)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (data) setContracts(data);
  }

  useEffect(() => {
    loadContracts();
  }, []);

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, "0")}.${String(
      d.getMonth() + 1
    ).padStart(2, "0")}.${d.getFullYear()}`;
  }

  const companies = [...new Set(contracts.map((c) => c.company_name))];
  const isSingleCompany = companies.length === 1;

  const filtered = useMemo(() => {
    let result = contracts
      .filter((c) => {
        if (isSingleCompany) return true;
        return !selectedCompany || c.company_name === selectedCompany;
      })
      .filter(
        (c) =>
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
  }, [contracts, selectedCompany, search, sortConfig, isSingleCompany]);

  function requestSort(key: keyof Contract) {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  }

  function daysLeft(end: string) {
    return Math.floor(
      (new Date(end).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    );
  }

  function badge(days: number) {
    if (days <= 7) return <span style={danger}>7 DAYS</span>;
    if (days <= 30) return <span style={warn}>30 DAYS</span>;
    return <span style={ok}>ACTIVE</span>;
  }

  function toggleCompany(company: string) {
    if (selectedCompany === company) {
      setSelectedCompany(null); // deselect → hamısı
    } else {
      setSelectedCompany(company); // seç → filtr
    }
  }

  function exportExcel() {
    const data = filtered.map((c) => ({
      Company: c.company_name,
      Counterparty: c.counterparty,
      Start: formatDate(c.start_date),
      End: formatDate(c.end_date),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contracts");
    XLSX.writeFile(wb, "contracts.xlsx");
  }

  function exportPDF() {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [["Company", "Counterparty", "Start", "End"]],
      body: filtered.map((c) => [
        c.company_name,
        c.counterparty,
        formatDate(c.start_date),
        formatDate(c.end_date),
      ]),
    });
    doc.save("contracts.pdf");
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
      {/* TOP */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 25,
        }}
      >
        <p style={{ color: "#f1f1f1", fontSize: 15, margin: 0 }}>
          Select company to filter contracts
        </p>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              exportExcel();
            }}
            style={exportBtn}
          >
            Excel
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              exportPDF();
            }}
            style={exportBtn}
          >
            PDF
          </button>
        </div>
      </div>

      {/* SEARCH */}
      <div style={{ marginBottom: 30 }}>
        <input
          placeholder="Search contracts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          style={searchInputStyle}
        />
      </div>

      {/* 🔥 CARDLAR (YALNIZ 2+ ŞİRKƏT OLANDA) */}
      {!isSingleCompany && (
        <div style={companyGridStyle}>
          {companies.map((company) => {
            const count = contracts.filter(
              (c) => c.company_name === company
            ).length;

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
                  background: active
                    ? "linear-gradient(135deg,#6366f1,#4f46e5)"
                    : "#1e293b",
                  border: active
                    ? "2px solid #818cf8"
                    : "1px solid #334155",
                  boxShadow: active
                    ? "0 15px 35px rgba(99,102,241,0.35)"
                    : "0 5px 15px rgba(0,0,0,0.25)",
                  transform: active ? "scale(1.03)" : "scale(1)",
                }}
              >
                <h3
                  style={{
                    fontSize: 16,
                    marginBottom: 8,
                    color: "#e6e6e6",
                    margin: 0,
                  }}
                >
                  {company}
                </h3>

                <p
                  style={{
                    color: "#cbd5e1",
                    fontSize: 14,
                    margin: "8px 0 0 0",
                  }}
                >
                  {count} contracts
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* TABLE */}
      <div style={contentContainerStyle}>
        <h2
          style={{
            marginBottom: 20,
            color: "#e6e6e6",
            fontSize: 20,
          }}
        >
          {isSingleCompany
            ? `${companies[0]} Contracts`
            : selectedCompany
            ? `${selectedCompany} Contracts`
            : "All Contracts"}
        </h2>

        <table style={tableStyle}>
          <thead>
            <tr style={{ borderBottom: "1px solid #c4c4c4" }}>
              <th
                style={{ ...thStyle, cursor: "pointer" }}
                onClick={() => requestSort("company_name")}
              >
                Company
              </th>
              <th
                style={{ ...thStyle, cursor: "pointer" }}
                onClick={() => requestSort("counterparty")}
              >
                Counterparty
              </th>
              <th
                style={{ ...thStyle, cursor: "pointer" }}
                onClick={() => requestSort("start_date")}
              >
                Start
              </th>
              <th
                style={{ ...thStyle, cursor: "pointer" }}
                onClick={() => requestSort("end_date")}
              >
                End
              </th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>PDF</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((c) => {
              const days = daysLeft(c.end_date);

              return (
                <tr key={c.id}>
                  <td style={tdStyle}>{c.company_name}</td>
                  <td style={tdStyle}>{c.counterparty}</td>
                  <td style={tdStyle}>{formatDate(c.start_date)}</td>
                  <td style={tdStyle}>{formatDate(c.end_date)}</td>
                  <td style={tdStyle}>{badge(days)}</td>
                  <td style={tdStyle}>
                    {c.file_url ? (
                      <a href={c.file_url} target="_blank" style={pdfBtn}>
                        Open
                      </a>
                    ) : (
                      <span>No PDF</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ====== STYLES (SAXLANILDI) ====== */

const searchInputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 8,
  border: "1px solid #334155",
  background: "#1e293b",
  color: "white",
  fontSize: 14,
};

const companyGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
  gap: 16,
  marginBottom: 40,
};

const companyCardBase = {
  cursor: "pointer",
  padding: 18,
  borderRadius: 14,
  transition: "all 0.25s ease",
};

const contentContainerStyle = {
  background: "#1e293b",
  border: "1px solid #334155",
  boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
  padding: 20,
  borderRadius: 14,
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse" as const,
  minWidth: 650,
};

const thStyle = {
  textAlign: "left" as const,
  padding: "12px",
  color: "#e6e6e6",
  fontSize: 14,
};

const tdStyle = {
  padding: "12px",
  color: "#e6e6e6",
  fontSize: 14,
};

const ok = {
  background: "#2563eb",
  padding: "4px 10px",
  borderRadius: 20,
  fontSize: 12,
  color: "white",
};

const warn = {
  background: "#f59e0b",
  padding: "4px 10px",
  borderRadius: 20,
  fontSize: 12,
  color: "white",
};

const danger = {
  background: "#ef4444",
  padding: "4px 10px",
  borderRadius: 20,
  fontSize: 12,
  color: "white",
};

const pdfBtn = {
  background: "linear-gradient(135deg,#3b82f6,#2563eb)",
  color: "white",
  padding: "6px 10px",
  borderRadius: 6,
  textDecoration: "none",
};

const exportBtn = {
  background: "#06ada5",
  color: "white",
  border: "1px solid #475569",
  padding: "6px 12px",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "13px",
};