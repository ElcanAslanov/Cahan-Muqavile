import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
import { sendEmail } from "@/lib/sendEmail"

function daysLeft(end:string){

  const today = new Date()

  const endDate = new Date(end)

  today.setHours(0,0,0,0)
  endDate.setHours(0,0,0,0)

  const diff = endDate.getTime() - today.getTime()

  return Math.ceil(diff / (1000*60*60*24))

}
function monthsBetween(start:string,end:string){

  const s = new Date(start)
  const e = new Date(end)

  return (
    (e.getFullYear() - s.getFullYear()) * 12 +
    (e.getMonth() - s.getMonth())
  )
}

export async function GET(){

  const { data:contracts } = await supabase
    .from("contracts")
    .select("*")
    .eq("status","active")

   console.log("CRON RUN:", new Date());

  if(!contracts) return NextResponse.json({ok:true})

  for(const contract of contracts){

    const days = daysLeft(contract.end_date)

    const duration = monthsBetween(
      contract.start_date,
      contract.end_date
    )

    let type = null

    // if(duration > 6){

    //   if(days === 30) type = "30_days"

    //   if(days === 1) type = "1_day"

    // }else{

    //   if(days === 15) type = "15_days"

    //   if(days === 1) type = "1_day"

    // }
if(days <= 30 && days >= 28) type = "30_days"
if(days <= 15 && days >= 13) type = "15_days"
if(days <= 1 && days >= 0) type = "1_day"
console.log("CHECK:", {
  end: contract.end_date,
  days
})

    if(!type) continue

    const { data:already } = await supabase
      .from("contract_notifications")
      .select("id")
      .eq("contract_id",contract.id)
      .eq("type",type)
      .maybeSingle()

    if(already) continue

    const { data:user } = await supabase
      .from("profiles")
      .select("email")
      .eq("id",contract.created_by)
      .single()

    if(!user?.email) continue

    await sendEmail(
      user.email,
      "Contract Expiring Soon",
      `
      <h2>Contract Expiring</h2>
      <p>Counterparty: ${contract.counterparty}</p>
      <p>Company: ${contract.company_name}</p>
      <p>End Date: ${contract.end_date}</p>
      <p>Days left: ${days}</p>
      `
    )

    await supabase
      .from("contract_notifications")
      .insert({
        contract_id:contract.id,
        type
      })

  }

  return NextResponse.json({ok:true})

}