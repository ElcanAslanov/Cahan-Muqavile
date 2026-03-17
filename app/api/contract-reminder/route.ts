import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/sendEmail";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Tarix fərqini UTC ilə hesablayan daha dəqiq funksiya
function getDaysLeft(end: string) {
  const today = new Date();
  const endDate = new Date(end);

  // Saatları sıfırlayırıq ki, gün fərqi təmiz rəqəm çıxsın
  const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const utcEnd = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  const diffInMs = utcEnd - utcToday;
  return Math.floor(diffInMs / (1000 * 60 * 60 * 24));
}

export async function GET(request: Request) {
  // 1. Təhlükəsizlik Yoxlaması (Cron Secret)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  console.log("CRON START:", new Date().toISOString());

  // 2. Müqavilələri çəkirik (Statusu bitməmiş olanları süzmək daha yaxşı olar)
  const { data: contracts, error } = await supabase
    .from("contracts")
    .select("*")
    .neq("status", "archived"); // Arxivlənmişlərə mail göndərməyə ehtiyac yoxdur

  if (error) {
    console.error("SUPABASE ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!contracts || contracts.length === 0) {
    return NextResponse.json({ message: "No active contracts found" });
  }

  const results = [];

  for (const contract of contracts) {
    const days = getDaysLeft(contract.end_date);
    let type: string | null = null;

    // Mail göndərmə şərtləri (Tam günlər)
    if (days === 30) type = "30_days";
    else if (days === 15) type = "15_days";
    else if (days === 1) type = "1_day";

    if (!type) continue;

    // 3. Dublikat yoxlaması (Eyni tip mail artıq göndərilibmi?)
    const { data: alreadySent } = await supabase
      .from("contract_notifications")
      .select("id")
      .eq("contract_id", contract.id)
      .eq("type", type)
      .maybeSingle();

    if (alreadySent) {
      console.log(`SKIP: ${contract.id} for ${type} (Already sent)`);
      continue;
    }

    // 4. İstifadəçi məlumatını çəkirik
    const { data: user } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", contract.created_by)
      .single();

    if (!user?.email) {
      console.log(`NO EMAIL FOUND FOR: ${contract.id}`);
      continue;
    }

    // 5. Mail göndərmə
    try {
      console.log(`SENDING ${type} to ${user.email}`);
      
      await sendEmail(
        user.email,
        `Müqavilə Bildirişi: ${days} gün qalıb`,
        `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
          <h2 style="color: #333;">Müqavilənin bitməsinə az qalıb</h2>
          <p><strong>Şirkət:</strong> ${contract.company_name}</p>
          <p><strong>Tərəfdaş:</strong> ${contract.counterparty}</p>
          <p><strong>Bitmə tarixi:</strong> ${contract.end_date}</p>
          <p style="font-size: 18px; color: red;"><strong>Qalan gün: ${days}</strong></p>
          <hr />
          <p style="font-size: 12px; color: #777;">Bu bildiriş avtomatik göndərilib.</p>
        </div>
        `
      );

      // 6. Göndərildi olaraq qeyd edirik
      await supabase
        .from("contract_notifications")
        .insert({
          contract_id: contract.id,
          type: type
        });
        
      results.push({ id: contract.id, type, status: "sent" });
    } catch (mailError) {
      console.error("MAIL ERROR:", mailError);
    }
  }

  return NextResponse.json({ ok: true, processed: results.length });
}