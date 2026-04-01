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
    } = body;

    if (!email || !password || !full_name || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

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

    // ✅ PROFILE INSERT
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

    // 🔥 ƏSAS DÜZƏLİŞ BURDA
    if (
      (role === "COMPANY_MANAGER" || role === "ACCOUNTANT") &&
      company_ids.length > 0
    ) {
      const rows = company_ids.map((companyId: string) => ({
        user_id: userId,
        company_id: companyId,
      }));

      const { error: userCompaniesError } = await supabaseAdmin
        .from("user_companies")
        .insert(rows);

      if (userCompaniesError) {
        return NextResponse.json(
          { error: userCompaniesError.message },
          { status: 400 }
        );
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