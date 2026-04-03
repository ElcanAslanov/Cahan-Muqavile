import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      user_id,
      full_name,
      role,
      company_ids = [],
      permissions = [],
    } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: "Missing user_id" },
        { status: 400 }
      );
    }

    // ✅ PROFILE UPDATE
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name,
        role,
      })
      .eq("id", user_id);

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      );
    }

    // =========================
    // 🔵 COMPANY RESET
    // =========================
    await supabaseAdmin
      .from("user_companies")
      .delete()
      .eq("user_id", user_id);

    if (company_ids.length > 0) {
      const companyRows = company_ids.map((cid: string) => ({
        user_id,
        company_id: cid,
      }));

      await supabaseAdmin
        .from("user_companies")
        .insert(companyRows);
    }

    // =========================
    // 🔥 PERMISSIONS RESET
    // =========================
    await supabaseAdmin
      .from("user_company_permissions")
      .delete()
      .eq("user_id", user_id);

    if (permissions.length > 0) {
      const permRows = permissions.map((p: any) => ({
        user_id,
        company_id: p.company_id,
        can_view: p.can_view || false,
        can_create: p.can_create || false,
        can_delete: p.can_delete || false,
        can_archive: p.can_archive || false,
        can_edit: p.can_edit || false,
      }));

      const { error } = await supabaseAdmin
        .from("user_company_permissions")
        .insert(permRows);

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("UPDATE USER ERROR:", err);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}