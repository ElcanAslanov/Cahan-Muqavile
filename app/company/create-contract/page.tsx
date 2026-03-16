"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Company = {
  id: string;
  name: string;
};

export default function CreateContract() {

  const [companies,setCompanies] = useState<Company[]>([])
  const [companyId,setCompanyId] = useState("")

  const [counterparty,setCounterparty] = useState("")
  const [startDate,setStartDate] = useState("")
  const [duration,setDuration] = useState("12")

  const [autoRenew,setAutoRenew] = useState(false)

  const [file,setFile] = useState<File | null>(null)

  async function loadCompanies(){

    const {data:userData} = await supabase.auth.getUser()
    const userId = userData.user?.id

    if(!userId) return

    const {data:userCompanies} = await supabase
      .from("user_companies")
      .select("company_id")
      .eq("user_id",userId)

    if(!userCompanies) return

    const ids = userCompanies.map(c=>c.company_id)

    const {data} = await supabase
      .from("companies")
      .select("*")
      .in("id",ids)

    if(data){
      setCompanies(data)

      if(data.length > 0){
        setCompanyId(data[0].id)
      }
    }

  }

  function calculateEndDate(start:string,months:number){

    if(!start) return null

    const date = new Date(start)

    if(isNaN(date.getTime())) return null

    date.setMonth(date.getMonth()+months)

    return date.toISOString().split("T")[0]

  }

  async function uploadFile(){

    if(!file) return null

    const fileName = `${Date.now()}-${file.name}`

    const { error } = await supabase.storage
      .from("contracts")
      .upload(fileName, file)

    if(error){
      console.log("UPLOAD ERROR:", error)
      return null
    }

    const { data } = supabase.storage
      .from("contracts")
      .getPublicUrl(fileName)

    return data.publicUrl

  }

  async function createContract(){

    if(!counterparty || !companyId || !startDate){
      alert("Fill all fields")
      return
    }

    const { data:userData } = await supabase.auth.getUser()
    const userId = userData.user?.id

    if(!userId){
      alert("User not found")
      return
    }

    const company = companies.find(c=>c.id===companyId)

    const endDate = calculateEndDate(startDate,parseInt(duration))

    const fileUrl = await uploadFile()

    const { error } = await supabase
      .from("contracts")
      .insert({
        counterparty,
        company_id: companyId,
        company_name: company?.name,
        start_date: startDate,
        end_date: endDate,
        duration_month: parseInt(duration),
        file_url: fileUrl,
        status:"active",
        auto_renew:autoRenew,
        created_by:userId
      })

    if(error){
      console.log(error)
      alert("Error creating contract")
      return
    }

    alert("Contract created")

    setCounterparty("")
    setStartDate("")
    setFile(null)
    setAutoRenew(false)

  }

  useEffect(()=>{
    loadCompanies()
  },[])

  return(

    <div style={pageStyle}>

      <div style={cardStyle}>

        <h1 style={titleStyle}>
          Create Contract
        </h1>

        <p style={subtitleStyle}>
          Add a new contract for your company
        </p>

        <div style={formGrid}>

          <input
            placeholder="Counterparty (Azersun)"
            value={counterparty}
            onChange={(e)=>setCounterparty(e.target.value)}
            style={inputStyle}
          />

          <select
            value={companyId}
            onChange={(e)=>setCompanyId(e.target.value)}
            style={inputStyle}
          >
            {companies.map(c=>(
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e)=>setStartDate(e.target.value)}
            style={inputStyle}
          />

          <select
            value={duration}
            onChange={(e)=>setDuration(e.target.value)}
            style={inputStyle}
          >
            <option value="1">1 month</option>
            <option value="3">3 months</option>
            <option value="6">6 months</option>
            <option value="12">1 year</option>
            <option value="24">2 years</option>
            <option value="36">3 years</option>
          </select>

          <label style={checkboxStyle}>
            <input
              type="checkbox"
              checked={autoRenew}
              onChange={(e)=>setAutoRenew(e.target.checked)}
            />
            Auto Renew
          </label>

          <input
            type="file"
            accept="application/pdf"
            onChange={(e)=>setFile(e.target.files?.[0] || null)}
            style={fileStyle}
          />

        </div>

        <button
          onClick={createContract}
          style={buttonStyle}
        >
          Create Contract
        </button>

      </div>

    </div>

  )

}

const pageStyle = {
  minHeight:"100vh",
  display:"flex",
  justifyContent:"center",
  alignItems:"center",
  padding:"20px",
  background:"linear-gradient(180deg,#234C6A,#456882)"
}

const cardStyle = {
  width:"100%",
  maxWidth:"520px",
  background:"#1e293b",
  padding:"30px",
  borderRadius:"16px",
  boxShadow:"0 25px 50px rgba(0,0,0,0.35)",
  display:"flex",
  flexDirection:"column" as const,
  gap:"20px"
}

const titleStyle = {
  fontSize:"24px",
  fontWeight:600,
  color:"white",
  margin:0,
  textAlign:"center" as const
}

const subtitleStyle = {
  fontSize:"14px",
  color:"#cbd5e1",
  textAlign:"center" as const
}

const formGrid = {
  display:"flex",
  flexDirection:"column" as const,
  gap:"14px"
}

const inputStyle = {
  width:"100%",
  padding:"12px",
  borderRadius:"8px",
  border:"1px solid #334155",
  background:"#0f172a",
  color:"white",
  fontSize:"14px"
}

const checkboxStyle = {
  display:"flex",
  alignItems:"center",
  gap:"10px",
  color:"#e2e8f0",
  fontSize:"14px"
}

const fileStyle = {
  color:"#e2e8f0"
}

const buttonStyle = {
  marginTop:"10px",
  background:"linear-gradient(135deg,#3b82f6,#2563eb)",
  color:"white",
  padding:"14px",
  border:"none",
  borderRadius:"10px",
  fontSize:"15px",
  fontWeight:500,
  cursor:"pointer",
  boxShadow:"0 8px 20px rgba(59,130,246,0.35)"
}