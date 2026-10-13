// ── TindaGo — POS Payment Status Poller ──
// Supabase Edge Function: checks whether a POS GCash sale has been confirmed
// by the PayMongo webhook. Called by Android's GcashQrOverlay on a timer.
// Triggered by: POST from Android CheckoutScreen.kt
// Returns: { paymentMethod: string | null, paid: boolean }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { transactionId } = await req.json();
    if (typeof transactionId !== "number" || !transactionId) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid transactionId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data, error } = await sb
      .from("specific_sales")
      .select("payment_method")
      .eq("transaction_id", transactionId)
      .maybeSingle();

    if (error) {
      console.error("pos-status query error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentMethod = data?.payment_method ?? null;
    return new Response(
      JSON.stringify({
        paymentMethod,
        paid: paymentMethod === "gcash",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("pos-status error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
