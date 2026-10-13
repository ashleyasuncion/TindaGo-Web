// ── TindaGo — PayMongo POS Payment (QR) Creator ──
// Supabase Edge Function: Creates a PayMongo Checkout Session for GCash QR payments
// Triggered by: POST from Android CheckoutScreen.kt when owner selects GCash
// Returns: { sessionId, checkoutUrl, qrUrl } or error

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const PAYMONGO_API = "https://api.paymongo.com/v1";

serve(async (req) => {
  // CORS headers for browser requests
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };

  // Handle OPTIONS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Get secret key from environment
    const secretKey = Deno.env.get("PAYMONGO_SECRET_KEY");
    if (!secretKey) {
      throw new Error("PAYMONGO_SECRET_KEY not configured");
    }

    // Parse request body
    const { totalAmount, saleReference } = await req.json();

    if (!totalAmount || !saleReference) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: totalAmount, saleReference" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert to centavos
    const amountInCentavos = Math.round(Number(totalAmount) * 100);

    // Create a Checkout Session with a single line item for the POS sale.
    // IMPORTANT: this merchant account requires currency: "PHP" on each
    // line item (same fix as create-preorder-session — otherwise PayMongo
    // returns the misleading "line_item.currency is not supported" error).
    const response = await fetch(`${PAYMONGO_API}/checkout_sessions`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(secretKey + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          attributes: {
            payment_method_types: ["gcash"],
            line_items: [
              {
                name: `TindaGo POS Sale #${saleReference}`,
                amount: amountInCentavos,
                quantity: 1,
                currency: "PHP",
              },
            ],
            success_url: `https://tindago.vercel.app/preorder/success.html?temp_id=${encodeURIComponent(saleReference)}`,
            cancel_url: `https://tindago.vercel.app/preorder/`,
            description: `POS Sale #${saleReference}`,
            metadata: {
              sale_reference: saleReference,
              total_amount: totalAmount,
            },
          },
        },
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("PayMongo API error:", result);
      throw new Error(result.errors?.[0]?.detail || "Failed to create POS payment session");
    }

    const sessionData = result.data;
    const qrUrl = sessionData.attributes.qr_code_image_url || "";
    const checkoutUrl = sessionData.attributes.checkout_url || "";

    return new Response(
      JSON.stringify({
        sessionId: sessionData.id,
        checkoutUrl,
        qrUrl,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
