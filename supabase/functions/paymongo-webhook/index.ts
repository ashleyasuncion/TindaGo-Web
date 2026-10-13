// ── TindaGo — PayMongo Webhook Receiver ──
// Supabase Edge Function: Receives payment.paid / checkout.session.payment.paid
// events from PayMongo, verifies HMAC signature, updates Supabase tables.
// Triggered by: HTTP POST from PayMongo (server-to-server)
// Returns: 200 { received: true } | 401 Unauthorized | 500 error (triggers retry)
//
// Secrets required (set via Supabase dashboard or CLI):
//   PAYMONGO_WEBHOOK_SECRET   — the whsec_... signing secret from PayMongo
//   SUPABASE_SERVICE_ROLE_KEY — Supabase service role key (admin, bypasses RLS)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Admin client bypasses RLS — required because webhook events come from
// PayMongo with no user session. We only ever update rows identified by
// temp_id + user_id (or sale reference) from verified event metadata.
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Timing-safe string comparison (prevents timing side-channel attacks)
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// HMAC-SHA256 → lowercase hex digest
async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // ── 1. Read raw body — must be the exact bytes PayMongo signed ──
    const rawBody = await req.text();

    // ── 2. Verify HMAC signature ──
    // Header format: "Webhook-Signature: t=<timestamp>,v1=<hex hmac>"
    // Signed payload: "<timestamp>.<rawBody>" (Stripe-style convention)
    const signatureHeader = req.headers.get("webhook-signature");
    if (!signatureHeader) {
      console.error("Missing webhook-signature header");
      return new Response("Unauthorized", { status: 401 });
    }

    let expectedHex = "";
    let timestamp = "";
    for (const part of signatureHeader.split(",")) {
      const eq = part.indexOf("=");
      const k = part.slice(0, eq).trim();
      const v = part.slice(eq + 1).trim();
      if (k === "t") timestamp = v;
      if (k === "v1") expectedHex = v;
    }

    if (!expectedHex || !timestamp) {
      console.error("Malformed webhook-signature header:", signatureHeader);
      return new Response("Unauthorized", { status: 401 });
    }

    const secret = Deno.env.get("PAYMONGO_WEBHOOK_SECRET");
    if (!secret) {
      console.error("PAYMONGO_WEBHOOK_SECRET not configured");
      return new Response("Server misconfigured", { status: 500 });
    }

    const computedHex = await hmacSha256Hex(secret, `${timestamp}.${rawBody}`);
    if (!timingSafeEqual(computedHex, expectedHex)) {
      console.error("Signature verification failed");
      return new Response("Unauthorized", { status: 401 });
    }

    // ── 3. Parse the event (only after signature is verified) ──
    const event = JSON.parse(rawBody);
    const eventType: string = event.type || "";
    const eventData = event.data || {};

    console.log("Webhook received:", eventType);

    // ── 4. Route by event type ──
    if (eventType === "checkout.session.payment.paid") {
      await handleCheckoutSessionPaid(eventData);
    } else if (eventType === "payment.paid") {
      await handlePaymentPaid(eventData);
    } else {
      // Acknowledge unhandled types (e.g. checkout.session.expired)
      console.log("Unhandled event type acknowledged:", eventType);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    // 500 → PayMongo retries the delivery with backoff (transient failures)
    console.error("Webhook handler error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// ── Pre-order flow (customer online payment via checkout session) ──
async function handleCheckoutSessionPaid(session: any) {
  const attrs = session.attributes || {};
  const sessionId = session.id || "";

  // Our metadata rides on the session (set by create-preorder-session)
  const metadata = attrs.metadata || {};
  const tempId = metadata.temp_id || "";
  const storeUid = metadata.store_uid || "";

  if (!tempId || !storeUid) {
    console.log("checkout.session.payment.paid without temp_id/store_uid — ignoring");
    return;
  }

  // Idempotency: PayMongo may deliver the event more than once
  const { data: existing } = await sb
    .from("pre_orders")
    .select("payment_status")
    .eq("temp_id", tempId)
    .eq("user_id", storeUid)
    .maybeSingle();

  if (existing && existing.payment_status === "paid") {
    console.log("Pre-order already paid — skipping", tempId);
    return;
  }

  // Column note: gateway_* columns come from the ALTER in the integration
  // plan. If they haven't been applied yet, retry without them so the core
  // payment_status flip still lands (mirrors the fulfilled_at fallback in app.js).
  let { error } = await sb
    .from("pre_orders")
    .update({
      payment_status: "paid",
      status: "preparing",
      gateway_session_id: sessionId,
      gateway_payment_id: attrs.payment_intent?.id || sessionId,
      gateway_updated_at: Date.now(),
    })
    .eq("temp_id", tempId)
    .eq("user_id", storeUid);

  if (error && /gateway_/i.test(error.message || "")) {
    console.warn("gateway_* columns missing — applying fallback update", error.message);
    ({ error } = await sb
      .from("pre_orders")
      .update({ payment_status: "paid", status: "preparing" })
      .eq("temp_id", tempId)
      .eq("user_id", storeUid));
  }

  if (error) {
    console.error("Failed to update pre_orders:", error);
    throw new Error("DB update failed for pre-order " + tempId);
  }
  console.log("Updated pre-order:", tempId, "→ paid/preparing (session", sessionId + ")");
}

// ── POS flow (store owner's in-app sale paid via payment intent) ──
async function handlePaymentPaid(payment: any) {
  const attrs = payment.attributes || {};
  const paymentId = payment.id || "";

  // Metadata location varies by PayMongo event version — check common spots
  const metadata = attrs.metadata || attrs.data?.attributes?.metadata || {};
  const saleReference = metadata.sale_reference || "";

  if (!saleReference) {
    console.log("payment.paid without sale_reference metadata — ignoring");
    return;
  }

  // The POS flow encodes the sale's transaction_id (Date.now() millis) in the
  // SALE-<millis> reference — that value lives in specific_sales.transaction_id,
  // NOT in the id column (which is the client's small local counter). Match on
  // transaction_id so the webhook lands on the right sale row(s).
  const saleId = extractNumericId(saleReference);
  if (!saleId) {
    console.log("Unparseable sale_reference — ignoring", saleReference);
    return;
  }

  // Idempotency check first — matches ALL rows sharing the transaction_id.
  const { data: existing } = await sb
    .from("specific_sales")
    .select("payment_method, id")
    .eq("transaction_id", saleId);

  const alreadyGcash = (existing || []).every((r: any) => r.payment_method === "gcash");
  if (existing && existing.length > 0 && alreadyGcash) {
    console.log("Sale already marked gcash — skipping", saleReference);
    return;
  }

  const { error } = await sb
    .from("specific_sales")
    .update({ payment_method: "gcash" })
    .eq("transaction_id", saleId);

  if (error) {
    console.error("Failed to update specific_sales:", error);
    throw new Error("DB update failed for sale " + saleReference);
  }
  console.log("Updated sale", saleReference, "→ gcash (payment", paymentId + ")");
}

// Extract the leading number from a reference like "SALE-1699999999999" or a raw id
function extractNumericId(ref: string): number {
  const m = String(ref).match(/\d{10,}/);
  return m ? parseInt(m[0], 10) : 0;
}
