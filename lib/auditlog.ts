import { supabase } from "@/lib/supabase";

type AuditLogInput = {
  action: string;
  tableName?: string;
  recordId?: string | null;
  description?: string;
  oldData?: any;
  newData?: any;
};

function getProfileName(profile: any) {
  if (!profile) return null;

  const firstLast = `${profile.first_name || ""} ${
    profile.last_name || ""
  }`.trim();

  return (
    profile.full_name ||
    firstLast ||
    profile.name ||
    profile.display_name ||
    profile.email ||
    null
  );
}

export async function createAuditLog({
  action,
  tableName,
  recordId,
  description,
  oldData = null,
  newData = null,
}: AuditLogInput) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    let userName = user?.email || null;

    if (user?.id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      userName = getProfileName(profile) || user.email || null;
    }

    const { error } = await supabase.from("audit_logs").insert({
      user_id: user?.id || null,
      user_name: userName,
      action,
      table_name: tableName || null,
      record_id: recordId || null,
      description: description || null,
      old_data: oldData,
      new_data: newData,
    });

    if (error) {
      console.error("Audit log error:", error);
    }
  } catch (err) {
    console.error("Audit log exception:", err);
  }
}