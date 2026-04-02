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

export default function DashboardPage() {

  const [contracts,setContracts] = useState<Contract[]>([])
  const [selectedCompany,setSelectedCompany] = useState<string | null>(null)
  const [search,setSearch] = useState("")

  async function loadContracts(){

    const {data,error} = await supabase
      .from("contracts")
      .select("*")
      .eq("status","active")
      .order("created_at",{ascending:false})

    if(error){
      console.log(error)
      return
    }

    if(data){
      setContracts(data)
    }
  }

  useEffect(()=>{
    loadContracts()
  },[])

  const companies = [...new Set(contracts.map(c=>c.company_name))]

  const filteredContracts = contracts
  .filter(c => !selectedCompany || c.company_name === selectedCompany)
  .filter(c =>
    c.counterparty.toLowerCase().includes(search.toLowerCase()) ||
    c.company_name.toLowerCase().includes(search.toLowerCase())
  )

  function daysLeft(end:string){
    const endDate = new Date(end).getTime()
    const today = new Date().getTime()
    const diff = endDate - today
    return Math.floor(diff / (1000*60*60*24))
  }

  function expiryBadge(days:number){

    if(days <= 7){
      return <span style={dangerBadge}>7 DAYS</span>
    }

    if(days <= 30){
      return <span style={warningBadge}>30 DAYS</span>
    }

    return <span style={safeBadge}>ACTIVE</span>
  }

  function toggleCompany(company:string){
    if(selectedCompany === company){
      setSelectedCompany(null)
    }else{
      setSelectedCompany(company)
    }
  }

  return(

    <div
      onClick={()=>setSelectedCompany(null)}
      style={{
        minHeight:"100vh",
        padding:"30px 20px",
        background: "var(--bg-main)",
        margin:"0 auto"
      }}
    >

      <div style={{marginBottom:25}}>
        <h1 style={{color:"black", fontSize:24}}>Ana səhifə</h1>
        <p style={{color:"black",fontSize:15}}>
           Müqavilələri filtr etmək üçün şirkət seçin
        </p>
      </div>

      {/* SEARCH */}
      <div style={{marginBottom:30}}>
        <input
          placeholder="Müqavilələri axtar..."
          value={search}
          onChange={(e)=>setSearch(e.target.value)}
          onClick={(e)=>e.stopPropagation()}
          style={{
            width:"100%",
            padding:"12px 14px",
            borderRadius:8,
            border:"1px solid #334155",
            background:"#485569",
            color:"white",
            fontSize:14
          }}
        />
      </div>

      {/* COMPANY CARDS */}
      <div
        style={{
          display:"grid",
          gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",
          gap:16,
          marginBottom:40
        }}
      >

        {companies.map(company=>{

          const count = contracts.filter(c=>c.company_name === company).length
          const active = selectedCompany === company

          return(

            <div
              key={company}
              onClick={(e)=>{
                e.stopPropagation()
                toggleCompany(company)
              }}
              style={{
                cursor:"pointer",
                padding:18,
                borderRadius:14,
                background:active
                  ? "linear-gradient(135deg,#6366f1,#4f46e5)"
                  : "#1e293b",
                border:active
                  ? "2px solid #818cf8"
                  : "1px solid #334155",
                boxShadow:active
                  ? "0 15px 35px rgba(99,102,241,0.35)"
                  : "0 5px 15px rgba(0,0,0,0.25)",
                transition:"all 0.25s ease",
                transform:active ? "scale(1.03)" : "scale(1)"
              }}
            >

              <h3 style={{fontSize:16,marginBottom:8,color:"#e6e6e6"}}>
                {company}
              </h3>

              <p style={{color:"#cbd5e1",fontSize:14}}>
                {count} müqavilə
              </p>

            </div>

          )
        })}

      </div>

      {/* TABLE */}
      <div
        style={{
          background:"#1e293b",
          border:"1px solid #334155",
          boxShadow:"0 10px 30px rgba(0,0,0,0.35)",
          padding:20,
          borderRadius:14,
          overflowX:"auto"
        }}
      >

        <h2 style={{marginBottom:20, color:"#e6e6e6",fontSize:20}}>
          {selectedCompany ? `${selectedCompany} Contracts` : "Bütün müqavilələr"}
        </h2>

        <table
          style={{
            width:"100%",
            borderCollapse:"collapse",
            minWidth:650
          }}
        >

          <thead>
            <tr style={{borderBottom:"1px solid #c4c4c4"}}>
              <th style={thStyle}>Şirkət</th>
              <th style={thStyle}>Müqavilə</th>
              <th style={thStyle}>Başlanma</th>
              <th style={thStyle}>Bitmə</th>
              <th style={thStyle}>Vaxtın Bitməsi</th>
              <th style={thStyle}>Yeniləmə</th>
              <th style={thStyle}>PDF</th>
            </tr>
          </thead>

          <tbody>

            {filteredContracts.map(c=>{

              const days = daysLeft(c.end_date)

              return(

                <tr key={c.id} style={{borderBottom:"1px solid #1f2937"}}>

                  <td style={tdStyle}>{c.company_name}</td>
                  <td style={tdStyle}>{c.counterparty}</td>
                  <td style={tdStyle}>{c.start_date}</td>
                  <td style={tdStyle}>{c.end_date}</td>

                  <td style={tdStyle}>
                    {expiryBadge(days)}
                  </td>

                  <td style={tdStyle}>
                    {c.auto_renew ? (
                      <span style={renewBadge}>🔄 Yeniləmə</span>
                    ) : (
                      <span style={noRenewBadge}>⛔ Yeniləmə yoxdur</span>
                    )}
                  </td>

                  <td style={tdStyle}>
                    {c.file_url ? (
                      <a href={c.file_url} target="_blank" style={pdfBtn}>
                        PDFə bax
                      </a>
                    ) : (
                      <span>PDF yoxdur</span>
                    )}
                  </td>

                </tr>

              )
            })}

          </tbody>

        </table>

      </div>

    </div>
  )
}

/* ===== STYLES ===== */

const thStyle = {
  textAlign:"left" as const,
  padding:"12px",
  color:"#e6e6e6",
  fontSize:14
}

const tdStyle = {
  padding:"12px",
  color:"#e6e6e6",
  fontSize:14
}

const renewBadge = {
  background:"linear-gradient(135deg,#22c55e,#16a34a)",
  padding:"4px 10px",
  borderRadius:20,
  fontSize:12,
  color:"white"
}

const noRenewBadge = {
  background:"#374151",
  padding:"4px 10px",
  borderRadius:20,
  fontSize:12,
  color:"#cbd5f5"
}

const safeBadge = {
  background:"#2563eb",
  padding:"4px 10px",
  borderRadius:20,
  fontSize:12,
  color:"white"
}

const warningBadge = {
  background:"#f59e0b",
  padding:"4px 10px",
  borderRadius:20,
  fontSize:12,
  color:"white"
}

const dangerBadge = {
  background:"#ef4444",
  padding:"4px 10px",
  borderRadius:20,
  fontSize:12,
  color:"white"
}

const pdfBtn = {
  background: "var(--primary)",
  color:"white",
  padding:"6px 10px",
  borderRadius:6,
  textDecoration:"none"
}