"use client";

import { useEffect, useState, useMemo, type CSSProperties } from "react";
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
  // 🔥 SADƏCƏ loadContracts dəyişdi, qalanı eyni qalıb

  async function loadContracts() {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) return;

    // 🔥 ROLE GÖTÜR
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    const role = profile?.role;

    // 🔥 CHECKBOX PERMISSIONS
    const { data: perms } = await supabase
      .from("user_company_permissions")
      .select("*")
      .eq("user_id", userId);

    let allowedCompanyIds: string[] = [];

    if (perms && perms.length > 0) {
      // ✅ checkbox varsa → onu istifadə et
      allowedCompanyIds = perms
        .filter((p) => p.can_view)
        .map((p) => p.company_id);
    } else {
      // 🔁 fallback → köhnə sistem

      if (role === "HOLDING_MANAGER") {
        // bütün company-lər
        const { data: all } = await supabase.from("companies").select("id");

        allowedCompanyIds = all?.map((c) => c.id) || [];
      }

      if (role === "COMPANY_MANAGER" || role === "ACCOUNTANT") {
        const { data: userCompanies } = await supabase
          .from("user_companies")
          .select("company_id")
          .eq("user_id", userId);

        allowedCompanyIds = userCompanies?.map((c) => c.company_id) || [];
      }
    }

    // 🔥 CONTRACT FETCH
    const { data } = await supabase
      .from("contracts")
      .select("*")
      .in("company_id", allowedCompanyIds)
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
    if (days <= 7) return <span style={danger}>7 GÜN</span>;
    if (days <= 30) return <span style={warn}>30 GÜN</span>;
    return <span style={ok}>AKTİV</span>;
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

  const expiringSoonCount = contracts.filter(
    (c) => daysLeft(c.end_date) <= 30
  ).length;

  const criticalCount = contracts.filter((c) => daysLeft(c.end_date) <= 7)
    .length;

  function sortIcon(key: keyof Contract) {
    if (sortConfig.key !== key) return "↕";
    return sortConfig.direction === "asc" ? "↑" : "↓";
  }

  return (
    <div
      onClick={() => setSelectedCompany(null)}
      style={pageShell}
    >
      {/* HEADER */}
      <section style={heroCard}>
        <div style={heroGlowOne} />
        <div style={heroGlowTwo} />

        <div style={heroContent}>
          <div style={heroLeft}>
            <div style={eyebrow}>
              <span style={eyebrowDot} />
              Mühasib paneli
            </div>

            <h1 style={pageTitle}>Müqavilələrə nəzarət</h1>

            <p style={pageSubtitle}>
              Sizə icazə verilmiş şirkətlər üzrə aktiv müqavilələri izləyin,
              axtarın, sıralayın və hesabat kimi ixrac edin.
            </p>
          </div>

          <div style={heroActions} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={exportExcel}
              type="button"
              style={excelBtn}
            >
              <span style={btnIcon}>📊</span>
              Excel
            </button>

            <button
              onClick={exportPDF}
              type="button"
              style={pdfExportBtn}
            >
              <span style={btnIcon}>📄</span>
              PDF
            </button>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={statsGrid} onClick={(e) => e.stopPropagation()}>
        <div style={statCard}>
          <div style={statTop}>
            <span style={statIconBlue}>📁</span>
            <span style={statLabel}>Ümumi müqavilə</span>
          </div>
          <strong style={statValue}>{contracts.length}</strong>
          <span style={statHint}>Sistem üzrə görünən aktiv müqavilələr</span>
        </div>

        <div style={statCard}>
          <div style={statTop}>
            <span style={statIconGreen}>🏢</span>
            <span style={statLabel}>Şirkət sayı</span>
          </div>
          <strong style={statValue}>{companies.length}</strong>
          <span style={statHint}>Sizin baxış icazəniz olan şirkətlər</span>
        </div>

        <div style={statCard}>
          <div style={statTop}>
            <span style={statIconOrange}>⏳</span>
            <span style={statLabel}>30 günə bitən</span>
          </div>
          <strong style={statValue}>{expiringSoonCount}</strong>
          <span style={statHint}>Yaxın müddətdə bitəcək müqavilələr</span>
        </div>

        <div style={statCard}>
          <div style={statTop}>
            <span style={statIconRed}>⚠️</span>
            <span style={statLabel}>Kritik</span>
          </div>
          <strong style={statValue}>{criticalCount}</strong>
          <span style={statHint}>7 gün və ya daha az qalanlar</span>
        </div>
      </section>

      {/* TOOLBAR */}
      <section style={toolbarCard}>
        <div style={toolbarInfo}>
          <h2 style={toolbarTitle}>Filter və axtarış</h2>
          <p style={toolbarText}>
            {isSingleCompany
              ? "Tək şirkət olduğu üçün şirkət filteri gizlədilib."
              : "Şirkət kartına klik edərək həmin şirkətin müqavilələrini görə bilərsiniz."}
          </p>
        </div>

        <div style={searchWrap} onClick={(e) => e.stopPropagation()}>
          <span style={searchIcon}>⌕</span>
          <input
            placeholder="Şirkət və ya qarşı tərəf üzrə axtar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={searchInputStyle}
          />
        </div>
      </section>

      {/* COMPANY CARDS */}
      {!isSingleCompany && (
        <section style={companyGridStyle}>
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
                  ...(active ? companyCardActive : companyCardInactive),
                }}
              >
                <div style={companyCardHeader}>
                  <span style={companyAvatar}>
                    {company.trim().slice(0, 1).toUpperCase()}
                  </span>

                  <span style={active ? selectedPill : normalPill}>
                    {active ? "Seçildi" : "Şirkət"}
                  </span>
                </div>

                <h3 style={companyTitle}>{company}</h3>

                <div style={companyFooter}>
                  <span style={companyCount}>{count}</span>
                  <span style={companyCountLabel}>müqavilə</span>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* TABLE */}
      <section style={contentContainerStyle}>
        <div style={tableHeader}>
          <div>
            <h2 style={tableTitle}>
              {isSingleCompany
                ? `${companies[0] || "Şirkət"} müqavilələri`
                : selectedCompany
                ? `${selectedCompany} müqavilələri`
                : "Bütün müqavilələr"}
            </h2>

            <p style={tableSubtitle}>
              Göstərilən nəticə: {filtered.length} / {contracts.length}
            </p>
          </div>

          {selectedCompany && !isSingleCompany && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCompany(null);
              }}
              style={clearFilterBtn}
            >
              Filteri təmizlə
            </button>
          )}
        </div>

        <div style={tableScroll} onClick={(e) => e.stopPropagation()}>
          <table style={tableStyle}>
            <thead>
              <tr style={theadRow}>
                <th
                  style={{ ...thStyle, cursor: "pointer" }}
                  onClick={() => requestSort("company_name")}
                >
                  <span style={thInner}>
                    Şirkət
                    <span style={sortMark}>{sortIcon("company_name")}</span>
                  </span>
                </th>

                <th
                  style={{ ...thStyle, cursor: "pointer" }}
                  onClick={() => requestSort("counterparty")}
                >
                  <span style={thInner}>
                    Qarşı tərəf
                    <span style={sortMark}>{sortIcon("counterparty")}</span>
                  </span>
                </th>

                <th
                  style={{ ...thStyle, cursor: "pointer" }}
                  onClick={() => requestSort("start_date")}
                >
                  <span style={thInner}>
                    Başlama
                    <span style={sortMark}>{sortIcon("start_date")}</span>
                  </span>
                </th>

                <th
                  style={{ ...thStyle, cursor: "pointer" }}
                  onClick={() => requestSort("end_date")}
                >
                  <span style={thInner}>
                    Bitmə
                    <span style={sortMark}>{sortIcon("end_date")}</span>
                  </span>
                </th>

                <th style={thStyle}>Status</th>
                <th style={thStyle}>Fayl</th>
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={emptyCell}>
                    <div style={emptyBox}>
                      <div style={emptyIcon}>📭</div>
                      <h3 style={emptyTitle}>Müqavilə tapılmadı</h3>
                      <p style={emptyText}>
                        Axtarış sözünü və ya şirkət filterini dəyişərək yenidən
                        yoxlayın.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const days = daysLeft(c.end_date);

                  return (
                    <tr key={c.id} style={tbodyRow}>
                      <td style={tdStyle}>
                        <div style={companyCell}>
                          <span style={miniCompanyAvatar}>
                            {c.company_name.trim().slice(0, 1).toUpperCase()}
                          </span>
                          <span style={strongText}>{c.company_name}</span>
                        </div>
                      </td>

                      <td style={tdStyle}>
                        <span style={counterpartyText}>{c.counterparty}</span>
                      </td>

                      <td style={tdStyle}>
                        <span style={datePill}>{formatDate(c.start_date)}</span>
                      </td>

                      <td style={tdStyle}>
                        <span style={datePill}>{formatDate(c.end_date)}</span>
                      </td>

                      <td style={tdStyle}>{badge(days)}</td>

                      <td style={tdStyle}>
                        {c.file_url ? (
                          <a
                            href={c.file_url}
                            target="_blank"
                            style={pdfBtn}
                          >
                            Aç
                          </a>
                        ) : (
                          <span style={noPdf}>PDF yoxdur</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ====== STYLES ====== */

const pageShell: CSSProperties = {
  width: "100%",
  minHeight: "calc(100vh - 120px)",
};

const heroCard: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  borderRadius: 28,
  padding: "28px clamp(20px, 4vw, 34px)",
  marginBottom: 20,
  background:
    "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,64,105,0.96) 52%, rgba(8,47,73,0.98))",
  border: "1px solid rgba(148, 163, 184, 0.18)",
  boxShadow: "0 24px 80px rgba(15, 23, 42, 0.24)",
  color: "#fff",
};

const heroGlowOne: CSSProperties = {
  position: "absolute",
  width: 260,
  height: 260,
  borderRadius: "50%",
  right: -70,
  top: -90,
  background: "rgba(56,189,248,0.28)",
  filter: "blur(8px)",
};

const heroGlowTwo: CSSProperties = {
  position: "absolute",
  width: 220,
  height: 220,
  borderRadius: "50%",
  left: "35%",
  bottom: -150,
  background: "rgba(99,102,241,0.24)",
  filter: "blur(10px)",
};

const heroContent: CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 22,
  flexWrap: "wrap",
};

const heroLeft: CSSProperties = {
  minWidth: 260,
  flex: "1 1 420px",
};

const eyebrow: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 9,
  padding: "7px 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.09)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#dbeafe",
  fontSize: 13,
  fontWeight: 800,
  marginBottom: 14,
};

const eyebrowDot: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "#38bdf8",
  boxShadow: "0 0 0 5px rgba(56,189,248,0.15)",
};

const pageTitle: CSSProperties = {
  margin: 0,
  fontSize: "clamp(28px, 4vw, 42px)",
  lineHeight: 1.08,
  letterSpacing: "-0.055em",
  fontWeight: 900,
};

const pageSubtitle: CSSProperties = {
  margin: "14px 0 0",
  maxWidth: 650,
  color: "#cbd5e1",
  fontSize: 15,
  lineHeight: 1.7,
};

const heroActions: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 12,
  flexWrap: "wrap",
};

const btnIcon: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 22,
  height: 22,
};

const excelBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "linear-gradient(135deg, #10b981, #059669)",
  color: "#fff",
  padding: "12px 16px",
  borderRadius: 15,
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 900,
  boxShadow: "0 16px 34px rgba(16,185,129,0.26)",
};

const pdfExportBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "linear-gradient(135deg, #3b82f6, #2563eb)",
  color: "#fff",
  padding: "12px 16px",
  borderRadius: 15,
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 900,
  boxShadow: "0 16px 34px rgba(59,130,246,0.26)",
};

const statsGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: 14,
  marginBottom: 20,
};

const statCard: CSSProperties = {
  background: "rgba(255,255,255,0.86)",
  border: "1px solid rgba(203,213,225,0.82)",
  boxShadow: "0 18px 45px rgba(15,23,42,0.08)",
  borderRadius: 22,
  padding: 18,
  backdropFilter: "blur(12px)",
};

const statTop: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 14,
};

const statLabel: CSSProperties = {
  color: "#475569",
  fontSize: 13,
  fontWeight: 800,
};

const statValue: CSSProperties = {
  display: "block",
  color: "#0f172a",
  fontSize: 34,
  lineHeight: 1,
  letterSpacing: "-0.05em",
  fontWeight: 950,
  marginBottom: 8,
};

const statHint: CSSProperties = {
  display: "block",
  color: "#64748b",
  fontSize: 12,
  lineHeight: 1.45,
};

const statIconBlue: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 14,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#dbeafe",
};

const statIconGreen: CSSProperties = {
  ...statIconBlue,
  background: "#dcfce7",
};

const statIconOrange: CSSProperties = {
  ...statIconBlue,
  background: "#ffedd5",
};

const statIconRed: CSSProperties = {
  ...statIconBlue,
  background: "#fee2e2",
};

const toolbarCard: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 18,
  flexWrap: "wrap",
  marginBottom: 18,
  padding: 18,
  borderRadius: 22,
  background: "rgba(255,255,255,0.88)",
  border: "1px solid rgba(203,213,225,0.82)",
  boxShadow: "0 18px 45px rgba(15,23,42,0.07)",
  backdropFilter: "blur(12px)",
};

const toolbarInfo: CSSProperties = {
  minWidth: 240,
  flex: "1 1 320px",
};

const toolbarTitle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: 18,
  fontWeight: 900,
  letterSpacing: "-0.03em",
};

const toolbarText: CSSProperties = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: 13,
  lineHeight: 1.5,
};

const searchWrap: CSSProperties = {
  flex: "1 1 360px",
  minWidth: 260,
  position: "relative",
};

const searchIcon: CSSProperties = {
  position: "absolute",
  left: 15,
  top: "50%",
  transform: "translateY(-50%)",
  color: "#64748b",
  fontSize: 19,
  pointerEvents: "none",
};

const searchInputStyle: CSSProperties = {
  width: "100%",
  padding: "14px 16px 14px 44px",
  borderRadius: 16,
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#0f172a",
  fontSize: 14,
  outline: "none",
  boxShadow: "inset 0 1px 0 rgba(15,23,42,0.03)",
};

const companyGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: 16,
  marginBottom: 20,
};

const companyCardBase: CSSProperties = {
  cursor: "pointer",
  padding: 18,
  borderRadius: 22,
  transition: "all 0.25s ease",
  minHeight: 150,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
};

const companyCardActive: CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(37,99,235,0.98), rgba(79,70,229,0.98))",
  border: "1px solid rgba(255,255,255,0.35)",
  boxShadow: "0 22px 48px rgba(37,99,235,0.30)",
  transform: "translateY(-3px)",
  color: "#fff",
};

const companyCardInactive: CSSProperties = {
  background: "rgba(255,255,255,0.88)",
  border: "1px solid rgba(203,213,225,0.92)",
  boxShadow: "0 18px 44px rgba(15,23,42,0.07)",
  color: "#0f172a",
};

const companyCardHeader: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  marginBottom: 16,
};

const companyAvatar: CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 16,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(15,23,42,0.08)",
  color: "inherit",
  fontWeight: 950,
};

const selectedPill: CSSProperties = {
  padding: "6px 10px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.18)",
  color: "#fff",
  fontSize: 12,
  fontWeight: 900,
};

const normalPill: CSSProperties = {
  padding: "6px 10px",
  borderRadius: 999,
  background: "#f1f5f9",
  color: "#475569",
  fontSize: 12,
  fontWeight: 900,
};

const companyTitle: CSSProperties = {
  margin: 0,
  color: "inherit",
  fontSize: 16,
  lineHeight: 1.35,
  fontWeight: 900,
  letterSpacing: "-0.02em",
};

const companyFooter: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 7,
  marginTop: 14,
};

const companyCount: CSSProperties = {
  fontSize: 28,
  lineHeight: 1,
  fontWeight: 950,
  letterSpacing: "-0.05em",
};

const companyCountLabel: CSSProperties = {
  fontSize: 13,
  opacity: 0.78,
  fontWeight: 700,
};

const contentContainerStyle: CSSProperties = {
  background: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(203,213,225,0.9)",
  boxShadow: "0 24px 70px rgba(15,23,42,0.09)",
  padding: 18,
  borderRadius: 26,
  backdropFilter: "blur(14px)",
};

const tableHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
  flexWrap: "wrap",
  padding: "2px 2px 16px",
};

const tableTitle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: 21,
  fontWeight: 950,
  letterSpacing: "-0.04em",
};

const tableSubtitle: CSSProperties = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: 13,
};

const clearFilterBtn: CSSProperties = {
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#334155",
  padding: "10px 13px",
  borderRadius: 14,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 850,
};

const tableScroll: CSSProperties = {
  width: "100%",
  overflowX: "auto",
  borderRadius: 18,
  border: "1px solid #e2e8f0",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  minWidth: 760,
  background: "#fff",
};

const theadRow: CSSProperties = {
  background: "#f8fafc",
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "14px 14px",
  color: "#475569",
  fontSize: 12,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  borderBottom: "1px solid #e2e8f0",
  whiteSpace: "nowrap",
};

const thInner: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
};

const sortMark: CSSProperties = {
  color: "#94a3b8",
  fontSize: 13,
  fontWeight: 900,
};

const tbodyRow: CSSProperties = {
  borderBottom: "1px solid #eef2f7",
};

const tdStyle: CSSProperties = {
  padding: "14px",
  color: "#0f172a",
  fontSize: 14,
  borderBottom: "1px solid #eef2f7",
  verticalAlign: "middle",
};

const companyCell: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  minWidth: 210,
};

const miniCompanyAvatar: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 13,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#e0f2fe",
  color: "#0369a1",
  fontWeight: 950,
  flexShrink: 0,
};

const strongText: CSSProperties = {
  fontWeight: 850,
  color: "#0f172a",
};

const counterpartyText: CSSProperties = {
  color: "#334155",
  fontWeight: 700,
};

const datePill: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "7px 10px",
  borderRadius: 999,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#334155",
  fontSize: 13,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const ok: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#dcfce7",
  border: "1px solid #bbf7d0",
  padding: "6px 11px",
  borderRadius: 999,
  fontSize: 12,
  color: "#166534",
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const warn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#ffedd5",
  border: "1px solid #fed7aa",
  padding: "6px 11px",
  borderRadius: 999,
  fontSize: 12,
  color: "#9a3412",
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const danger: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#fee2e2",
  border: "1px solid #fecaca",
  padding: "6px 11px",
  borderRadius: 999,
  fontSize: 12,
  color: "#991b1b",
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const pdfBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(135deg, #3b82f6, #2563eb)",
  color: "white",
  padding: "8px 12px",
  borderRadius: 12,
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 900,
  boxShadow: "0 10px 22px rgba(37,99,235,0.22)",
  whiteSpace: "nowrap",
};

const noPdf: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "7px 10px",
  borderRadius: 999,
  background: "#f1f5f9",
  color: "#64748b",
  fontSize: 12,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const emptyCell: CSSProperties = {
  padding: 0,
  borderBottom: "none",
};

const emptyBox: CSSProperties = {
  padding: "42px 20px",
  textAlign: "center",
  color: "#64748b",
};

const emptyIcon: CSSProperties = {
  width: 58,
  height: 58,
  margin: "0 auto 14px",
  borderRadius: 20,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f1f5f9",
  fontSize: 28,
};

const emptyTitle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: 18,
  fontWeight: 950,
  letterSpacing: "-0.03em",
};

const emptyText: CSSProperties = {
  margin: "8px auto 0",
  maxWidth: 420,
  color: "#64748b",
  fontSize: 14,
  lineHeight: 1.55,
};