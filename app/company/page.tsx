"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Contract = {
  id: string;
  company_name: string;
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

  async function loadContracts() {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

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

  const companies = [...new Set(contracts.map((c) => c.company_name))];

  const filteredContracts = contracts
    .filter((c) => !selectedCompany || c.company_name === selectedCompany)
    .filter(
      (c) =>
        c.counterparty.toLowerCase().includes(search.toLowerCase()) ||
        c.company_name.toLowerCase().includes(search.toLowerCase())
    );

  if (loading) {
    return <div style={{ padding: 30, color: "white" }}>Loading...</div>;
  }

  return (
    <div style={pageStyle} onClick={() => setSelectedCompany(null)}>
      <div style={headerWrap}>
        <h1 style={titleStyle}>Company Contracts</h1>
        <p style={subtitleStyle}>Manage active contracts for your companies</p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <input
          placeholder="Search contracts..."
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
                <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#cbd5e1" }}>{count} contracts</p>
              </div>
            );
          })}
        </div>
      )}

      {filteredContracts.length === 0 ? (
        <div style={emptyCard}>
          <p style={{ margin: 0, color: "#cbd5e1" }}>No contracts found</p>
        </div>
      ) : (
        <>
          {/* DESKTOP TABLE VIEW */}
          <div className="desktop-table" style={tableWrap}>
            <table style={tableStyle}>
              <thead>
                <tr style={{ borderBottom: "1px solid #334155" }}>
                  <th style={thStyle}>Company</th>
                  <th style={thStyle}>Counterparty</th>
                  <th style={thStyle}>Start Date</th>
                  <th style={thStyle}>End Date</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Renewal</th>
                  <th style={thStyle}>Document</th>
                </tr>
              </thead>
              <tbody>
                {filteredContracts.map((c) => {
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
                          <span style={renewBadge}>🔄 Auto</span>
                        ) : (
                          <span style={noRenewBadge}>⛔ Manual</span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        {c.file_url ? (
                          <a href={c.file_url} target="_blank" rel="noopener noreferrer" style={pdfBtn}>View PDF</a>
                        ) : (
                          <span style={{ color: "#64748b" }}>N/A</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARD VIEW */}
          <div className="mobile-cards" style={mobileGrid}>
            {filteredContracts.map((c) => {
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
                          <span style={renewBadge}>🔄 Auto Renew</span>
                        ) : (
                          <span style={noRenewBadge}>⛔ Manual</span>
                        )}
                    </div>
                    {c.file_url && (
                      <a href={c.file_url} target="_blank" rel="noopener noreferrer" style={pdfBtn}>View PDF</a>
                    )}
                  </div>
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
    </div>
  );
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

/* MOBILE SPECIFIC STYLES */
const mobileGrid = { gap: "16px", gridTemplateColumns: "1fr" };
const mobileContractCard = { background: "#0f172a", border: "1px solid #334155", borderRadius: "16px", padding: "16px" };
const mobileInfoRow = { display: "flex", gap: "20px", marginTop: "10px" };
const mobileLabel = { fontSize: "11px", color: "#94a3b8", margin: 0 };
const mobileValue = { fontSize: "13px", color: "white", margin: "2px 0 0 0", fontWeight: 500 };

/* BADGES & BUTTONS */
const renewBadge = { background: "#059669", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", color: "white" };
const noRenewBadge = { background: "#475569", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", color: "#cbd5e1" };
const safeBadge = { background: "#2563eb", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600 };
const warningBadge = { background: "#d97706", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600 };
const dangerBadge = { background: "#dc2626", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600 };
const pdfBtn = { background: "#3b82f6", color: "white", padding: "8px 14px", borderRadius: "8px", textDecoration: "none", fontSize: "12px" };
const emptyCard = { background: "#1e293b", padding: "40px", borderRadius: "16px", textAlign: "center" as const };