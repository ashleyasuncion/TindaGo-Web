// ── TindaGo — Pre-Order Status Probe ──
// Supabase Edge Function: Lets the public success page poll whether a temp_id
// has been marked paid by the paymongo-webhook. Read-only; returns only
// payment_status + status — never items, notes, or store owner data.
// Triggered by: GET ?temp_id=TGO-XXXXX from preorder/success.html
// Returns: { temp_id, payment_status, status } | 400 | 404

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Admin client: pre_orders SELECT is owner-only under RLS, so the success page
// (anon) can't read it directly. This function is the narrow public window —
// it projects ONLY payment_status + status for a matching temp_id.
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const tempId = new URL(req.url).searchParams.get("temp_id") || "";
    if (!tempId || tempId.length > 40) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid temp_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data, error } = await sb
      .from("pre_orders")
      .select("payment_status, status")
      .eq("temp_id", tempId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("preorder-status query error:", error);
      throw new Error("Database query failed");
    }

    if (!data) {
      return new Response(
        JSON.stringify({ temp_id: tempId, payment_status: "unknown", status: "unknown" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        temp_id: tempId,
        payment_status: data.payment_status || "unpaid",
        status: data.status || "pending",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("preorder-status error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
