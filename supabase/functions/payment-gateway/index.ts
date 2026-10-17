import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const path = url.pathname.replace("/functions/v1/payment-gateway", "");

    // POST /create-order — create a Razorpay order for a booking
    if (path === "/create-order" && req.method === "POST") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return jsonResponse({ error: "Missing auth" }, 401);
      }

      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }

      const { booking_id } = await req.json();
      if (!booking_id) {
        return jsonResponse({ error: "booking_id required" }, 400);
      }

      const { data: booking } = await supabase
        .from("service_bookings")
        .select("id, user_id, total_price, provider_id, booking_status")
        .eq("id", booking_id)
        .maybeSingle();

      if (!booking) {
        return jsonResponse({ error: "Booking not found" }, 404);
      }
      if (booking.user_id !== user.id) {
        return jsonResponse({ error: "Not authorized" }, 403);
      }

      const amountInPaise = Math.round(Number(booking.total_price) * 100);

      // Dev mode: no Razorpay credentials configured
      if (!razorpayKeyId || !razorpayKeySecret) {
        const fakeOrderId = `order_dev_${Date.now()}`;

        const { error: orderError } = await supabase
          .from("payment_orders")
          .insert({
            booking_id: booking.id,
            user_id: user.id,
            gateway_order_id: fakeOrderId,
            amount: amountInPaise,
            currency: "INR",
            status: "created",
            gateway_response: { dev_mode: true },
          });

        if (orderError) {
          return jsonResponse({ error: "Failed to create order" }, 500);
        }

        return jsonResponse({
          order_id: fakeOrderId,
          amount: amountInPaise,
          currency: "INR",
          dev_mode: true,
          key_id: null,
        });
      }

      // Production mode: create real Razorpay order
      const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Basic " + btoa(`${razorpayKeyId}:${razorpayKeySecret}`),
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: "INR",
          receipt: `booking_${booking.id.slice(0, 20)}`,
          notes: { booking_id: booking.id },
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        return jsonResponse(
          { error: orderData.error?.description || "Order creation failed" },
          500
        );
      }

      const { error: orderError } = await supabase
        .from("payment_orders")
        .insert({
          booking_id: booking.id,
          user_id: user.id,
          gateway_order_id: orderData.id,
          amount: amountInPaise,
          currency: "INR",
          status: "created",
          gateway_response: orderData,
        });

      if (orderError) {
        return jsonResponse({ error: "Failed to store order" }, 500);
      }

      return jsonResponse({
        order_id: orderData.id,
        amount: amountInPaise,
        currency: "INR",
        dev_mode: false,
        key_id: razorpayKeyId,
      });
    }

    // POST /verify-payment — verify Razorpay signature and record payment
    if (path === "/verify-payment" && req.method === "POST") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return jsonResponse({ error: "Missing auth" }, 401);
      }

      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }

      const {
        booking_id,
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
      } = await req.json();

      if (!booking_id || !razorpay_payment_id || !razorpay_order_id) {
        return jsonResponse({ error: "Missing payment details" }, 400);
      }

      // Dev mode: skip signature verification
      if (!razorpayKeySecret) {
        const { data: result } = await supabase.rpc("verify_and_record_payment", {
          p_booking_id: booking_id,
          p_gateway_payment_id: razorpay_payment_id,
          p_gateway_signature: razorpay_signature || "dev_mode",
          p_gateway_order_id: razorpay_order_id,
        });

        if (!result?.success) {
          return jsonResponse(
            { error: result?.error || "Payment verification failed" },
            400
          );
        }

        // Notify provider
        const { data: booking } = await supabase
          .from("service_bookings")
          .select("provider_id, service_id")
          .eq("id", booking_id)
          .maybeSingle();

        if (booking) {
          await supabase.from("notifications").insert({
            user_id: booking.provider_id,
            actor_id: user.id,
            type: "booking",
            entity_id: booking.service_id,
            entity_type: "service",
            message: "A new booking has been paid and is awaiting your acceptance",
          });
        }

        return jsonResponse({
          success: true,
          dev_mode: true,
          message: "Payment verified (development mode — no real money was charged)",
        });
      }

      // Production: verify Razorpay signature using HMAC-SHA256
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(razorpayKeySecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const sig = await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(`${razorpay_order_id}|${razorpay_payment_id}`)
      );
      const sigArray = Array.from(new Uint8Array(sig));
      const computedSignature = sigArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      if (computedSignature !== razorpay_signature) {
        // Record failed transaction
        await supabase.from("payment_transactions").insert({
          booking_id,
          user_id: user.id,
          gateway_payment_id: razorpay_payment_id,
          gateway_signature: razorpay_signature,
          amount: 0,
          status: "failed",
          failure_reason: "Signature mismatch",
        });

        return jsonResponse({ error: "Payment signature verification failed" }, 400);
      }

      // Signature valid — record via SECURITY DEFINER function
      const { data: result } = await supabase.rpc("verify_and_record_payment", {
        p_booking_id: booking_id,
        p_gateway_payment_id: razorpay_payment_id,
        p_gateway_signature: razorpay_signature,
        p_gateway_order_id: razorpay_order_id,
      });

      if (!result?.success) {
        return jsonResponse(
          { error: result?.error || "Payment verification failed" },
          400
        );
      }

      // Fetch payment details from Razorpay to confirm status
      const payRes = await fetch(
        `https://api.razorpay.com/v1/payments/${razorpay_payment_id}`,
        {
          headers: {
            Authorization:
              "Basic " + btoa(`${razorpayKeyId}:${razorpayKeySecret}`),
          },
        }
      );
      const payData = await payRes.json();

      if (payData.status !== "captured") {
        return jsonResponse(
          { error: `Payment status: ${payData.status}` },
          400
        );
      }

      // Notify provider
      const { data: booking } = await supabase
        .from("service_bookings")
        .select("provider_id, service_id")
        .eq("id", booking_id)
        .maybeSingle();

      if (booking) {
        await supabase.from("notifications").insert({
          user_id: booking.provider_id,
          actor_id: user.id,
          type: "booking",
          entity_id: booking.service_id,
          entity_type: "service",
          message: "A new booking has been paid and is awaiting your acceptance",
        });
      }

      return jsonResponse({ success: true, message: "Payment verified" });
    }

    // POST /webhook — Razorpay webhook handler
    if (path === "/webhook" && req.method === "POST") {
      const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
      const body = await req.text();
      const signature = req.headers.get("X-Razorpay-Signature");

      if (webhookSecret && signature) {
        const key = await crypto.subtle.importKey(
          "raw",
          new TextEncoder().encode(webhookSecret),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"]
        );
        const sig = await crypto.subtle.sign(
          "HMAC",
          key,
          new TextEncoder().encode(body)
        );
        const sigArray = Array.from(new Uint8Array(sig));
        const computed = sigArray
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        if (computed !== signature) {
          return jsonResponse({ error: "Invalid webhook signature" }, 400);
        }
      }

      const event = JSON.parse(body);
      // Handle payment.captured event
      if (event.event === "payment.captured") {
        const payment = event.payload.payment.entity;
        const orderId = payment.order_id;

        // Already handled by verify-payment endpoint
        // This webhook is a backup verification
      }

      return jsonResponse({ received: true });
    }

    return jsonResponse({ error: "Not found" }, 404);
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Internal error" },
      500
    );
  }
});

function jsonResponse(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
