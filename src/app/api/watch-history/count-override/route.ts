import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type OverrideRequest = {
  id?: unknown;
  countOverride?: unknown;
};

export async function PATCH(request: Request) {
  const authorized = await isAuthorized();

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as OverrideRequest;
  const id = typeof body.id === "string" ? body.id : "";

  if (!id || typeof body.countOverride !== "boolean") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase service credentials are not configured" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("watch_history")
    .update({ count_override: body.countOverride })
    .eq("id", id)
    .select("id,count_override")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ row: data });
}

async function isAuthorized() {
  const sitePassword = process.env.SITE_PASSWORD;

  if (!sitePassword) {
    return true;
  }

  const cookieStore = await cookies();
  return cookieStore.get("bili_stats_auth")?.value === sitePassword;
}
