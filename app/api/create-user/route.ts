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
      email,
      password,
      full_name,
      role,
      company_ids = [],
      permissions = [],
    } = body;

    if (!email || !password || !full_name || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // ✅ AUTH USER
    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError || !authUser.user) {
      return NextResponse.json(
        { error: authError?.message || "Failed to create auth user" },
        { status: 400 }
      );
    }

    const userId = authUser.user.id;

    // ✅ PROFILE
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: userId,
      email,
      full_name,
      role,
    });

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      );
    }

    // =========================
    // 🔵 OLD SYSTEM (company_ids)
    // =========================
    if (
      (role === "COMPANY_MANAGER" || role === "ACCOUNTANT") &&
      company_ids.length > 0
    ) {
      const rows = company_ids.map((companyId: string) => ({
        user_id: userId,
        company_id: companyId,
      }));

      const { error } = await supabaseAdmin
        .from("user_companies")
        .insert(rows);

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    // =========================
    // 🔥 NEW SYSTEM (permissions)
    // =========================
    if (permissions.length > 0) {
      // 🔥 yalnız seçilmiş company-lər
      const filtered = permissions.filter((p: any) =>
        company_ids.includes(p.company_id)
      );

      // 🔥 yalnız aktiv permission olanlar
      const rows = filtered
        .filter(
          (p: any) =>
            p.can_read || p.can_create || p.can_delete || p.can_archive
        )
        .map((p: any) => ({
          user_id: userId,
          company_id: p.company_id,
          can_read: p.can_read || false,
          can_create: p.can_create || false,
          can_delete: p.can_delete || false,
          can_archive: p.can_archive || false,
          can_edit: p.can_edit || false,
        }));

      if (rows.length > 0) {
        const { error } = await supabaseAdmin
          .from("user_company_permissions")
          .insert(rows);

        if (error) {
          return NextResponse.json(
            { error: error.message },
            { status: 400 }
          );
        }
      }
    }

    return NextResponse.json({ success: true, user_id: userId });
  } catch (err) {
    console.error("CREATE USER API ERROR:", err);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}