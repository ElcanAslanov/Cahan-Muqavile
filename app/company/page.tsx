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

    if (!userCompanies) {
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

      const now = new Date().getTime()

      const expiredContracts = data.filter(c => {
        const end = new Date(c.end_date).getTime()
        return end < now && !c.auto_renew
      })

      if(expiredContracts.length > 0){
        await supabase
          .from("contracts")
          .update({status:"archived"})
          .in("id",expiredContracts.map(c=>c.id))
      }

      const activeContracts = data.filter(c=>{
        const end = new Date(c.end_date).getTime()
        return !(end < now && !c.auto_renew)
      })

      setContracts(activeContracts)
    }

    setLoading(false);
  }

  function daysLeft(end: string) {
    const endDate = new Date(end).getTime();
    const today = new Date().getTime();
    const diff = endDate - today;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  function expiryBadge(days: number) {
    if (days <= 7) {
      return <span style={dangerBadge}>7 DAYS</span>;
    }

    if (days <= 30) {
      return <span style={warningBadge}>30 DAYS</span>;
    }

    return <span style={safeBadge}>ACTIVE</span>;
  }

  useEffect(() => {
    loadContracts();
  }, []);

  const renewCount = contracts.filter((c) => c.auto_renew).length;
  const expiringSoonCount = contracts.filter((c) => daysLeft(c.end_date) <= 30).length;

  if (loading) {
    return <div style={{ padding: 30, color: "white" }}>Loading...</div>;
  }

  return (
    <div style={pageStyle}>
      <div style={headerWrap}>
        <div>
          <h1 style={titleStyle}>Company Contracts</h1>
          <p style={subtitleStyle}>Manage active contracts for your companies</p>
        </div>
      </div>

      <div style={statsGrid}>
        <div style={statCardPrimary}>
          <p style={statLabel}>Total Contracts</p>
          <h2 style={statValue}>{contracts.length}</h2>
        </div>

        <div style={statCardSecondary}>
          <p style={statLabel}>Auto Renew</p>
          <h2 style={statValue}>{renewCount}</h2>
        </div>

        <div style={statCardDark}>
          <p style={statLabel}>Expiring Soon</p>
          <h2 style={statValue}>{expiringSoonCount}</h2>
        </div>
      </div>

      {contracts.length === 0 ? (
        <div style={emptyCard}>
          <p style={{ margin: 0, color: "#cbd5e1" }}>No contracts</p>
        </div>
      ) : (
        <>
          {/* Desktop / tablet table */}
          <div style={tableWrap} className="company-table-wrap">
            <table style={tableStyle}>
              <thead>
                <tr style={{ borderBottom: "1px solid #334155" }}>
                  <th style={thStyle}>Company</th>
                  <th style={thStyle}>Counterparty</th>
                  <th style={thStyle}>Start</th>
                  <th style={thStyle}>End</th>
                  <th style={thStyle}>Expiry</th>
                  <th style={thStyle}>Renew</th>
                  <th style={thStyle}>PDF</th>
                </tr>
              </thead>

              <tbody>
                {contracts.map((c) => {
                  const days = daysLeft(c.end_date);

                  return (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: "1px solid #1e293b",
                        transition: "0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#172033";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <td style={tdStyle}>{c.company_name}</td>
                      <td style={tdStyle}>{c.counterparty}</td>
                      <td style={tdStyle}>{c.start_date}</td>
                      <td style={tdStyle}>{c.end_date}</td>
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
                          <a
                            href={c.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={pdfBtn}
                          >
                            View PDF
                          </a>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>No PDF</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div style={mobileCardsWrap} className="company-mobile-cards">
            {contracts.map((c) => {
              const days = daysLeft(c.end_date);

              return (
                <div key={c.id} style={mobileCard}>
                  <div style={mobileCardTop}>
                    <div>
                      <h3 style={mobileCompanyName}>{c.company_name}</h3>
                      <p style={mobileCounterparty}>{c.counterparty}</p>
                    </div>

                    <div>{expiryBadge(days)}</div>
                  </div>

                  <div style={mobileInfoGrid}>
                    <div>
                      <p style={mobileLabel}>Start</p>
                      <p style={mobileValue}>{c.start_date}</p>
                    </div>

                    <div>
                      <p style={mobileLabel}>End</p>
                      <p style={mobileValue}>{c.end_date}</p>
                    </div>

                    <div>
                      <p style={mobileLabel}>Renew</p>
                      <div style={{ marginTop: 6 }}>
                        {c.auto_renew ? (
                          <span style={renewBadge}>🔄 RENEW</span>
                        ) : (
                          <span style={noRenewBadge}>⛔ No renew</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={mobileActions}>
                    {c.file_url ? (
                      <a
                        href={c.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={pdfBtn}
                      >
                        View PDF
                      </a>
                    ) : (
                      <span style={{ color: "#94a3b8" }}>No PDF</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <style jsx>{`
        .company-mobile-cards {
          display: none;
        }

        @media (max-width: 900px) {
          .company-table-wrap {
            display: none;
          }

          .company-mobile-cards {
            display: flex;
          }
        }
      `}</style>
    </div>
  );
}

/* STYLES */

const pageStyle = {
  minHeight: "100vh",
  padding: "24px 16px",
  background: "linear-gradient(180deg,#203a43,#2c5364)",
};

const headerWrap = {
  marginBottom: "24px",
};

const titleStyle = {
  margin: 0,
  fontSize: "28px",
  fontWeight: 700,
  color: "white",
};

const subtitleStyle = {
  marginTop: "8px",
  color: "#dbeafe",
  fontSize: "14px",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
  gap: "16px",
  marginBottom: "24px",
};

const statCardPrimary = {
  background: "linear-gradient(135deg,#3b82f6,#2563eb)",
  borderRadius: "16px",
  padding: "20px",
};

const statCardSecondary = {
  background: "linear-gradient(135deg,#14b8a6,#0f766e)",
  borderRadius: "16px",
  padding: "20px",
};

const statCardDark = {
  background: "linear-gradient(135deg,#334155,#1e293b)",
  borderRadius: "16px",
  padding: "20px",
};

const statLabel = {
  color: "#dbeafe",
  fontSize: "13px",
};

const statValue = {
  marginTop: "6px",
  fontSize: "26px",
  fontWeight: 700,
  color: "white",
};

const tableWrap = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "18px",
  overflowX: "auto" as const,
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse" as const,
  minWidth: "980px",
};

const thStyle = {
  textAlign: "left" as const,
  padding: "14px 16px",
  color: "#cbd5e1",
};

const tdStyle = {
  padding: "14px 16px",
  color: "white",
};

const renewBadge = {
  background: "#16a34a",
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
  color: "white",
};

const noRenewBadge = {
  background: "#334155",
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
  color: "#cbd5e1",
};

const safeBadge = {
  background: "#2563eb",
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
  color: "white",
};

const warningBadge = {
  background: "#f59e0b",
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
  color: "white",
};

const dangerBadge = {
  background: "#ef4444",
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
  color: "white",
};

const pdfBtn = {
  background: "#2563eb",
  color: "white",
  padding: "8px 12px",
  borderRadius: 10,
  textDecoration: "none",
};

const emptyCard = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 16,
  padding: 24,
};

const mobileCardsWrap = {
  flexDirection: "column" as const,
  gap: "16px",
};

const mobileCard = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 16,
  padding: 16,
};

const mobileCardTop = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: 12,
};

const mobileCompanyName = {
  margin: 0,
  fontSize: 18,
  color: "white",
};

const mobileCounterparty = {
  marginTop: 4,
  color: "#cbd5e1",
};

const mobileInfoGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  marginBottom: 12,
};

const mobileLabel = {
  fontSize: 12,
  color: "#94a3b8",
};

const mobileValue = {
  fontSize: 14,
  color: "white",
};

const mobileActions = {
  display: "flex",
  justifyContent: "space-between",
};