// ── TindaGo — PayMongo Pre-Order Session Creator ──
// Supabase Edge Function: Creates a PayMongo Checkout Session for GCash payments
// Triggered by: POST from preorder/app.js when customer selects GCash
// Returns: { checkoutUrl, sessionId } or error
//
// IMPORTANT (2026-10-12): This merchant account REQUIRES a `currency: "PHP"`
// field on each line item. PayMongo's validator returns a misleading
// "line_item.currency is not supported" error message when the field is omitted —
// it is actually required, not unsupported. Selftest confirmed.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const PAYMONGO_API = "https://api.paymongo.com/v1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const secretKey = Deno.env.get("PAYMONGO_SECRET_KEY");
    if (!secretKey) {
      throw new Error("PAYMONGO_SECRET_KEY not configured");
    }

    const { totalAmount, tempId, storeUid, items } = await req.json();

    if (!totalAmount || !tempId || !storeUid || !items || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: totalAmount, tempId, storeUid, items" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Line items per current PayMongo Checkout Sessions docs:
    // name (string), amount (integer centavos), quantity (integer).
    // IMPORTANT: This merchant account requires currency field.
    const lineItems = items.map((item: any) => ({
      name: String(item.name || "Item"),
      amount: Math.round(Number(item.price) * 100),
      quantity: Number(item.qty),
      currency: "PHP",
    }));

    console.log("DEBUG: paymongo payload:", JSON.stringify({ data: { attributes: { payment_method_types: ["gcash"], line_items: lineItems, success_url: `...`, metadata: { temp_id: tempId, store_uid: storeUid, total_amount: totalAmount } } } }));

    const paymongoPayload = {
      data: {
        attributes: {
          payment_method_types: ["gcash"],
          line_items: lineItems,
          success_url: `https://tindago.vercel.app/preorder/success.html?temp_id=${encodeURIComponent(tempId)}`,
          cancel_url: `https://tindago.vercel.app/preorder/?code=${encodeURIComponent(storeUid)}`,
          description: `Pre-order #${tempId}`,
          metadata: {
            temp_id: tempId,
            store_uid: storeUid,
            total_amount: totalAmount,
          },
        },
      },
    };

    console.log("DEBUG: paymongo body:", JSON.stringify(paymongoPayload));

    const response = await fetch(`${PAYMONGO_API}/checkout_sessions`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(secretKey + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymongoPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("DEBUG: PayMongo full error response:", JSON.stringify(result));
      const errs = result.errors || [];
      throw new Error(errs[0]?.detail || errs[0]?.code || "Failed to create checkout session");
    }

    const checkoutUrl = result.data.attributes.checkout_url;
    const sessionId = result.data.id;

    return new Response(
      JSON.stringify({ checkoutUrl, sessionId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
