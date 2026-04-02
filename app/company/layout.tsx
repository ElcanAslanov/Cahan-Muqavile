"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";


export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const router = useRouter()
  const pathname = usePathname()

  const [loading,setLoading] = useState(true)
  const [menuOpen,setMenuOpen] = useState(false)
  const [isMobile,setIsMobile] = useState(false)

  useEffect(()=>{

    function checkScreen(){
      setIsMobile(window.innerWidth < 768)
    }

    checkScreen()
    window.addEventListener("resize",checkScreen)

    return ()=> window.removeEventListener("resize",checkScreen)

  },[])

  useEffect(()=>{

    async function checkAccess(){

      const {data:userData} = await supabase.auth.getUser()

      const userId = userData.user?.id

      if(!userId){
        router.push("/login")
        return
      }

      const {data:profile} = await supabase
        .from("profiles")
        .select("role")
        .eq("id",userId)
        .single()

      if(!profile){
        router.push("/login")
        return
      }

      if(profile.role !== "COMPANY_MANAGER"){
        router.push("/login")
        return
      }

      setLoading(false)
    }

    checkAccess()

  },[])

  if(loading){
    return <p style={{padding:40}}>Loading...</p>
  }

  function linkStyle(href:string){
    const active = pathname === href

    return {
      color:"black",
      textDecoration:"none",
      padding:"8px 14px",
      borderRadius:8,
      background:active ? "#2563eb" : "transparent",
      fontSize:14
    }
  }

  async function logout(){
    await supabase.auth.signOut()
    router.push("/login")
  }

  return(

    <div style={{minHeight:"100vh",background:"#f1ecec",color:"white"}}>

      <nav
        style={{
          display:"flex",
          alignItems:"center",
          padding:"14px 18px",
          color:"white",
          background:"#485569",
          borderBottom:"1px solid #1f2937",
          gap:12
        }}
      >

        {isMobile && (

          <button
            onClick={()=>setMenuOpen(!menuOpen)}
            style={{
              background:"transparent",
              border:"none",
              color:"white",
              fontSize:22,
              cursor:"pointer"
            }}
          >
            ☰
          </button>
          

        )}
<Link href="/company/settings">⚙️ Settings</Link>
        {!isMobile && (

          <div style={{display:"flex",gap:10}}>

            <Link href="/company" style={linkStyle("/company")}>
              Dashboard
            </Link>

            <Link
              href="/company/create-contract"
              style={linkStyle("/company/create-contract")}
            >
              Create Contract
            </Link>

            <Link
              href="/company/archived"
              style={linkStyle("/company/archived")}
            >
              Archived
            </Link>

          </div>

        )}

        <button
          onClick={logout}
          style={{
            marginLeft:"auto",
            background:"#ef4444",
            border:"none",
            color:"white",
            padding:"8px 14px",
            borderRadius:8,
            cursor:"pointer",
            fontSize:14
          }}
        >
          Logout
        </button>

      </nav>

      {menuOpen && isMobile && (

        <div
          style={{
            display:"flex",
            flexDirection:"column",
            background:"#111827",
            padding:"12px 18px",
            gap:10,
            borderBottom:"1px solid #1f2937"
          }}
        >

          <Link href="/company" style={linkStyle("/company")} onClick={()=>setMenuOpen(false)}>
            Dashboard
          </Link>

          <Link
            href="/company/create-contract"
            style={linkStyle("/company/create-contract")}
            onClick={()=>setMenuOpen(false)}
          >
            Create Contract
          </Link>

          <Link
            href="/company/archived"
            style={linkStyle("/company/archived")}
            onClick={()=>setMenuOpen(false)}
          >
            Archived
          </Link>

        </div>

      )}

      <main
        style={{
          padding:"30px 20px",
          width:"100%",
          maxWidth:1200,
          margin:"0 auto",
          background:"#f1ecec",
        }}
      >
        {children}
      </main>

    </div>

  )

}