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
  auto_renew?: boolean;
};

export default function ArchivedContractsPage() {

  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  async function loadContracts() {

    setLoading(true)

    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id

    if (!userId) {
      setLoading(false)
      return
    }

    const { data: userCompanies } = await supabase
      .from("user_companies")
      .select("company_id")
      .eq("user_id", userId)

    if (!userCompanies) {
      setLoading(false)
      return
    }

    const companyIds = userCompanies.map(c => c.company_id)

    const { data } = await supabase
      .from("contracts")
      .select("*")
      .in("company_id", companyIds)
      .eq("status", "archived")
      .order("created_at", { ascending: false })

    if (data) {
      setContracts(data)
    }

    setLoading(false)

  }

  useEffect(() => {
    loadContracts()
  }, [])

  const filtered = contracts.filter(c =>
    (c.company_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.counterparty || "").toLowerCase().includes(search.toLowerCase())
  )
  return (

    <div style={pageStyle}>

      {/* HEADER */}

      <div style={headerStyle}>

        <div>
          <h1 style={titleStyle}>Arxiv Müqavilələr</h1>
          <p style={subtitleStyle}>
            Arxivə göndərilmiş müqavilələr
          </p>
        </div>

        <input
          placeholder="Şirkət və ya müqavilə axtar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={searchInput}
        />

      </div>


      {/* STATS */}

      <div style={statsGrid}>

        <div style={statCardBlue}>
          <p style={statLabel}>Arxiv Müqavilələr</p>
          <h2 style={statValue}>{contracts.length}</h2>
        </div>

        <div style={statCardGray}>
          <p style={statLabel}>PDF'i olanlar</p>
          <h2 style={statValue}>
            {contracts.filter(c => c.file_url).length}
          </h2>
        </div>

      </div>


      {/* DESKTOP TABLE */}

      <div style={tableWrap} className="desktop-table">

        {loading ? (
          <div style={{ padding: 20 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 20, color: "#94a3b8" }}>
            Arxivə göndərilmiş müqavilə yoxdur.
          </div>
        ) : (

          <table style={tableStyle}>

            <thead>

              <tr style={{ borderBottom: "1px solid #334155" }}>

                <th style={thStyle}>Şirkət</th>
                <th style={thStyle}>Müqavilə</th>
                <th style={thStyle}>Başlama</th>
                <th style={thStyle}>Bitmə</th>
                <th style={thStyle}>Avtomatik Yeniləmə</th>
                <th style={thStyle}>PDF</th>
                <th style={thStyle}>Status</th>

              </tr>

            </thead>

            <tbody>

              {filtered.map(c => (

                <tr
                  key={c.id}
                  style={{ borderTop: "1px solid #1e293b" }}
                >

                  <td style={tdStyle}>{c.company_name}</td>
                  <td style={tdStyle}>{c.counterparty}</td>
                  <td style={tdStyle}>{c.start_date}</td>
                  <td style={tdStyle}>{c.end_date}</td>

                  <td style={tdStyle}>

                    {c.auto_renew
                      ? <span style={greenBadge}>Auto Renew</span>
                      : <span style={redBadge}>No Renew</span>
                    }

                  </td>

                  <td style={tdStyle}>

                    {c.file_url ? (
                      <a
                        href={c.file_url}
                        target="_blank"
                        style={pdfBtn}
                      >
                        View PDF
                      </a>
                    ) : (
                      <span style={{ color: "#94a3b8" }}>
                        No PDF
                      </span>
                    )}

                  </td>

                  <td style={tdStyle}>
                    <span style={archiveBadge}>
                      Arxiv
                    </span>
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        )}

      </div>


      {/* MOBILE CARDS */}

      <div className="mobile-cards" style={mobileCards}>

        {filtered.map(c => (

          <div key={c.id} style={mobileCard}>

            <div style={mobileTop}>

              <div>

                <h3 style={mobileCompany}>
                  {c.company_name}
                </h3>

                <p style={mobileCounterparty}>
                  {c.counterparty}
                </p>

              </div>

              <span style={archiveBadge}>Archived</span>

            </div>

            <div style={mobileGrid}>

              <div>
                <p style={mobileLabel}>Start</p>
                <p style={mobileValue}>{c.start_date}</p>
              </div>

              <div>
                <p style={mobileLabel}>End</p>
                <p style={mobileValue}>{c.end_date}</p>
              </div>

            </div>

            <div style={mobileActions}>

              {c.auto_renew
                ? <span style={greenBadge}>Auto Renew</span>
                : <span style={redBadge}>No Renew</span>
              }

              {c.file_url && (
                <a href={c.file_url} target="_blank" style={pdfBtn}>
                  PDF
                </a>
              )}

            </div>

          </div>

        ))}

      </div>


      <style jsx>{`

        .mobile-cards{
          display:none;
        }

        @media (max-width:900px){

          .desktop-table{
            display:none;
          }

          .mobile-cards{
            display:flex;
            flex-direction:column;
            gap:16px;
          }

        }

      `}</style>

    </div>

  )

}


/* PAGE */

const pageStyle = {
  minHeight: "100vh",
  padding: "24px 16px",
  background: "linear-gradient(180deg,#203a43,#2c5364)"
}

/* HEADER */

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 20,
  marginBottom: 24
}

const titleStyle = {
  margin: 0,
  fontSize: 28,
  fontWeight: 700,
  color: "white"
}

const subtitleStyle = {
  marginTop: 6,
  color: "#cbd5e1",
  fontSize: 14
}

const searchInput = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #334155",
  background: "#0f172a",
  color: "white",
  minWidth: 220
}

/* STATS */

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
  gap: 16,
  marginBottom: 24
}

const statCardBlue = {
  background: "linear-gradient(135deg,#3b82f6,#2563eb)",
  borderRadius: 14,
  padding: 20
}

const statCardGray = {
  background: "linear-gradient(135deg,#334155,#1e293b)",
  borderRadius: 14,
  padding: 20
}

const statLabel = {
  color: "#dbeafe",
  fontSize: 13
}

const statValue = {
  marginTop: 6,
  fontSize: 26,
  fontWeight: 700,
  color: "white"
}

/* TABLE */

const tableWrap = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 16,
  overflowX: "auto"
}

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse" as const,
  minWidth: 900
}

const thStyle = {
  textAlign: "left" as const,
  padding: "14px",
  color: "#cbd5e1"
}

const tdStyle = {
  padding: "14px",
  color: "white"
}

/* BADGES */

const greenBadge = {
  background: "#166534",
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
  color: "white"
}

const redBadge = {
  background: "#b91c1c",
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
  color: "white"
}

const archiveBadge = {
  background: "#374151",
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
  color: "white"
}

/* BUTTON */

const pdfBtn = {
  background: "#2563eb",
  color: "white",
  padding: "6px 12px",
  borderRadius: 8,
  textDecoration: "none"
}

/* MOBILE */

const mobileCards = {}

const mobileCard = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 16,
  padding: 16
}

const mobileTop = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: 12
}

const mobileCompany = {
  margin: 0,
  fontSize: 18,
  color: "white"
}

const mobileCounterparty = {
  marginTop: 4,
  color: "#cbd5e1"
}

const mobileGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  marginBottom: 12
}

const mobileLabel = {
  fontSize: 12,
  color: "#94a3b8"
}

const mobileValue = {
  fontSize: 14,
  color: "white"
}

const mobileActions = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center"
}