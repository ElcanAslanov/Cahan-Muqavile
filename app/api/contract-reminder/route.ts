import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendEmail } from "@/lib/sendEmail"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function daysLeft(end: string) {
  const today = new Date()
  const endDate = new Date(end)

  today.setHours(0, 0, 0, 0)
  endDate.setHours(0, 0, 0, 0)

  const diff = endDate.getTime() - today.getTime()
  return Math.round(diff / (1000 * 60 * 60 * 24))
}

export async function GET() {
  console.log("CRON RUN:", new Date())

  const { data: contracts, error } = await supabase
    .from("contracts")
    .select("*")

  if (error) {
    console.log("FETCH ERROR:", error)
    return NextResponse.json({ ok: false })
  }

  console.log("CONTRACT COUNT:", contracts?.length)

  if (!contracts || contracts.length === 0) {
    console.log("NO CONTRACTS FOUND")
    return NextResponse.json({ ok: true })
  }

  for (const contract of contracts) {
    const days = daysLeft(contract.end_date)

    let type: string | null = null

    // 🔥 Stabil logic
    if (days >= 28 && days <= 30) type = "30_days"
    else if (days >= 13 && days <= 15) type = "15_days"
    else if (days >= 0 && days <= 1) type = "1_day"

    console.log("CHECK:", {
      id: contract.id,
      status: contract.status,
      end: contract.end_date,
      days,
      type
    })

    if (!type) continue

    const { data: already } = await supabase
      .from("contract_notifications")
      .select("id")
      .eq("contract_id", contract.id)
      .eq("type", type)
      .maybeSingle()

    if (already) {
      console.log("ALREADY SENT:", contract.id, type)
      continue
    }

    const { data: user } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", contract.created_by)
      .single()

    if (!user?.email) {
      console.log("NO EMAIL:", contract.id)
      continue
    }

    console.log("SENDING MAIL:", user.email, type)

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
        contract_id: contract.id,
        type
      })
  }

  return NextResponse.json({ ok: true })
}