// import { NextResponse } from "next/server";
// import { createClient } from "@supabase/supabase-js";
// import { sendEmail } from "@/lib/sendEmail";

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// function getDaysLeft(end: string) {
//   const today = new Date();
//   const endDate = new Date(end);

//   // Vaxt qurşağını sıfırlamaq üçün ən təhlükəsiz yol:
//   const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
//   const e = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

//   const diffInMs = e.getTime() - t.getTime();
//   return Math.round(diffInMs / (1000 * 60 * 60 * 24));
// }

// export async function GET(request: Request) {
//   const authHeader = request.headers.get('authorization');
//   if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
//     return new Response('Unauthorized', { status: 401 });
//   }

//   console.log("--- CRON START ---");

//   const { data: contracts, error } = await supabase
//     .from("contracts")
//     .select("*")
//     .neq("status", "archived");

//   if (error) return NextResponse.json({ error: error.message }, { status: 500 });

//   for (const contract of contracts) {
//     const days = getDaysLeft(contract.end_date);
    
//     console.log(`CONTRACT: ${contract.id} | DAYS LEFT: ${days}`);

//     // --- 1. AVTOMATİK ARXİVLƏŞDİRMƏ ---
//     if (days <= 0) {
//       await supabase
//         .from("contracts")
//         .update({ status: "archived" })
//         .eq("id", contract.id);
//       console.log(`ARCHIVED: ${contract.id}`);
//       continue; 
//     }

//     // --- 2. MAİL MƏNTİQİ ---
//     let type: string | null = null;
//     if (days === 30) type = "30_days";
//     else if (days === 15) type = "15_days";
//     else if (days === 1) type = "1_day";

//     if (!type) continue;

//     // Dublikat yoxlaması
//     const { data: alreadySent } = await supabase
//       .from("contract_notifications")
//       .select("id")
//       .eq("contract_id", contract.id)
//       .eq("type", type)
//       .maybeSingle();

//     if (alreadySent) {
//       console.log(`ALREADY SENT: ${contract.id} Type: ${type}`);
//       continue;
//     }

//     const { data: user } = await supabase
//       .from("profiles")
//       .select("email")
//       .eq("id", contract.created_by)
//       .single();

//     if (user?.email) {
//       await sendEmail(
//         user.email,
//         `Müqavilə Bildirişi: ${days} gün qalıb`,
//         `<p>Müqavilə bitməsinə <b>${days} gün</b> qalıb.</p>
//          <p>Şirkət: ${contract.company_name}</p>`
//       );

//       await supabase
//         .from("contract_notifications")
//         .insert({ contract_id: contract.id, type: type });
      
//       console.log(`SENT: ${type} to ${user.email}`);
//     }
//   }

//   return NextResponse.json({ ok: true });
// }
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/sendEmail";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getDaysLeft(end: string) {
  const today = new Date();
  const endDate = new Date(end);

  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const e = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  const diffInMs = e.getTime() - t.getTime();
  return Math.round(diffInMs / (1000 * 60 * 60 * 24));
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  console.log("--- CRON START ---");

  const { data: contracts, error } = await supabase
    .from("contracts")
    .select("*")
    .neq("status", "archived");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  for (const contract of contracts) {
    const days = getDaysLeft(contract.end_date);
    
    console.log(`CONTRACT: ${contract.id} | DAYS LEFT: ${days}`);

    // --- 1. AVTOMATİK YENİLƏNMƏ VƏ YA ARXİVLƏŞDİRMƏ ---
    if (days <= 0) {
      if (contract.auto_renew === true) {
        // Frontend-dən gələn duration_month-u götürürük (yoxdursa 12 ay)
        const monthsToAdd = contract.duration_month || 12;
        
        const currentEndDate = new Date(contract.end_date);
        const newEndDate = new Date(currentEndDate.setMonth(currentEndDate.getMonth() + monthsToAdd));
        const newEndDateString = newEndDate.toISOString().split('T')[0];

        await supabase
          .from("contracts")
          .update({ 
            end_date: newEndDateString,
            status: "active" 
          })
          .eq("id", contract.id);

        console.log(`RENEWED: ${contract.id} | Extended by ${monthsToAdd} months.`);
        continue; // Yeniləndiyi üçün mail göndərməyə ehtiyac yoxdur, növbəti müqaviləyə keç
      } else {
        // Auto-renew yoxdursa arxivlə
        await supabase
          .from("contracts")
          .update({ status: "archived" })
          .eq("id", contract.id);
        
        console.log(`ARCHIVED: ${contract.id}`);
        continue;
      }
    }

    // --- 2. MAİL BİLDİRİŞ MƏNTİQİ ---
    let type: string | null = null;
    if (days === 30) type = "30_days";
    else if (days === 15) type = "15_days";
    else if (days === 1) type = "1_day";

    if (!type) continue;

    const { data: alreadySent } = await supabase
      .from("contract_notifications")
      .select("id")
      .eq("contract_id", contract.id)
      .eq("type", type)
      .maybeSingle();

    if (alreadySent) {
      console.log(`ALREADY SENT: ${contract.id} Type: ${type}`);
      continue;
    }

    const { data: user } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", contract.created_by)
      .single();

    if (user?.email) {
      await sendEmail(
        user.email,
        `Müqavilə Bildirişi: ${days} gün qalıb`,
        `<p>Müqavilə bitməsinə <b>${days} gün</b> qalıb.</p>
         <p>Şirkət: ${contract.company_name}</p>
         <p>Əks tərəf: ${contract.counterparty}</p>`
      );

      await supabase
        .from("contract_notifications")
        .insert({ contract_id: contract.id, type: type });
      
      console.log(`SENT: ${type} to ${user.email}`);
    }
  }

  return NextResponse.json({ ok: true });
}