import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MSG91_BASE = "https://control.msg91.com/api/v5/otp";
const AUTH_KEY = Deno.env.get("MSG91_AUTH_KEY") ?? "";
const TEMPLATE_ID = Deno.env.get("MSG91_OTP_TEMPLATE_ID") ?? "";

// In-memory rate-limit store (per-isolate, best-effort)
type RateEntry = { count: number; firstAt: number; lastAt: number; attempts: number; resendAt: number };
const rateStore = new Map<string, RateEntry>();
const WINDOW_MS = 10 * 60 * 1000; // 10 min window
const MAX_SEND_PER_WINDOW = 3;
const MAX_VERIFY_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds

function getClientIP(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function checkRateLimit(key: string, kind: "send" | "verify" | "resend"): { ok: boolean; message?: string } {
  const now = Date.now();
  let entry = rateStore.get(key);
  if (!entry) {
    entry = { count: 0, firstAt: now, lastAt: 0, attempts: 0, resendAt: 0 };
    rateStore.set(key, entry);
  }

  // Reset window if expired
  if (now - entry.firstAt > WINDOW_MS) {
    entry.count = 0;
    entry.firstAt = now;
    entry.attempts = 0;
  }

  if (kind === "send") {
    if (entry.count >= MAX_SEND_PER_WINDOW) {
      return { ok: false, message: "Too many requests. Please try again later." };
    }
    entry.count++;
    entry.lastAt = now;
  }

  if (kind === "verify") {
    if (entry.attempts >= MAX_VERIFY_ATTEMPTS) {
      return { ok: false, message: "Maximum verification attempts exceeded. Please request a new OTP." };
    }
    entry.attempts++;
  }

  if (kind === "resend") {
    if (entry.lastAt === 0) {
      return { ok: false, message: "Please request an OTP first." };
    }
    if (now - entry.resendAt < RESEND_COOLDOWN_MS && entry.resendAt > 0) {
      const remaining = Math.ceil((RESEND_COOLDOWN_MS - (now - entry.resendAt)) / 1000);
      return { ok: false, message: `Please wait ${remaining}s before requesting a new OTP.` };
    }
    entry.resendAt = now;
  }

  return { ok: true };
}

function normalizeIndianMobile(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) {
    digits = digits.slice(2);
  }
  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
    return "91" + digits;
  }
  return null;
}

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.pathname.split("/").filter(Boolean).pop() ?? "";

  try {
    // ─── SEND OTP ───
    if (action === "send-otp") {
      if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
      if (!AUTH_KEY || !TEMPLATE_ID) {
        return json({ error: "OTP service is not configured. Contact support." }, 503);
      }

      const body = await req.json().catch(() => ({}));
      const mobile = normalizeIndianMobile(body.mobile ?? "");
      if (!mobile) {
        return json({ error: "Please enter a valid 10-digit Indian mobile number." }, 400);
      }

      const ip = getClientIP(req);
      // Rate limit by IP and mobile
      const ipCheck = checkRateLimit(`send:ip:${ip}`, "send");
      if (!ipCheck.ok) return json({ error: ipCheck.message }, 429);
      const mobileCheck = checkRateLimit(`send:mobile:${mobile}`, "send");
      if (!mobileCheck.ok) return json({ error: mobileCheck.message }, 429);

      const params = new URLSearchParams({
        template_id: TEMPLATE_ID,
        mobile,
        authkey: AUTH_KEY,
        otp_length: "6",
        otp_expiry: "5",
      });

      const resp = await fetch(`${MSG91_BASE}?${params}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
      });

      if (!resp.ok) {
        return json({ error: "Could not send OTP. Please try again." }, 502);
      }

      // Initialize attempt tracking for this mobile
      const key = `verify:mobile:${mobile}`;
      rateStore.set(key, { count: 0, firstAt: Date.now(), lastAt: Date.now(), attempts: 0, resendAt: 0 });

      return json({ success: true, message: "OTP sent successfully" }, 200);
    }

    // ─── VERIFY OTP ───
    if (action === "verify-otp") {
      if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
      if (!AUTH_KEY) {
        return json({ error: "OTP service is not configured. Contact support." }, 503);
      }

      const body = await req.json().catch(() => ({}));
      const mobile = normalizeIndianMobile(body.mobile ?? "");
      const otp = (body.otp ?? "").toString().replace(/\D/g, "");

      if (!mobile) return json({ error: "Invalid mobile number." }, 400);
      if (otp.length !== 6) return json({ error: "Please enter the 6-digit OTP." }, 400);

      const mobileCheck = checkRateLimit(`verify:mobile:${mobile}`, "verify");
      if (!mobileCheck.ok) return json({ error: mobileCheck.message }, 429);

      const verifyUrl = `${MSG91_BASE}/verify?otp=${otp}&mobile=${mobile}&authkey=${AUTH_KEY}`;
      const resp = await fetch(verifyUrl, { method: "GET" });
      const data = await resp.json().catch(() => ({}));

      // MSG91 returns { type: "success" } or { type: "error", message: "..." }
      if (!resp.ok || data.type !== "success") {
        return json({ error: "Incorrect or expired OTP. Please try again." }, 400);
      }

      // OTP verified — create or retrieve Supabase user
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      // Use a deterministic pseudo-email so Supabase auth can manage the user
      // The phone number is stored in user_metadata and profiles.phone
      const pseudoEmail = `${mobile}@phone.eventhub.app`;
      const fullName = (body.fullName ?? "").toString().trim();
      const role = body.role === "provider" ? "provider" : "customer";
      const businessName = (body.businessName ?? "").toString().trim();
      const serviceType = (body.serviceType ?? "").toString().trim();
      const referralCode = (body.referralCode ?? "").toString().trim();

      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users.find(
        (u) => u.email?.toLowerCase() === pseudoEmail.toLowerCase()
      );

      let userId: string;

      if (existingUser) {
        // Existing user — generate a new session for them
        userId = existingUser.id;

        // Update phone in profile if missing
        await supabaseAdmin
          .from("profiles")
          .update({ phone: mobile })
          .eq("id", userId)
          .is("phone", null as unknown as string);
      } else {
        // Create new user with a random secure password (user logs in via OTP, not password)
        const randomPassword = crypto.randomUUID() + crypto.randomUUID();

        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: pseudoEmail,
          password: randomPassword,
          email_confirm: true,
          user_metadata: { full_name: fullName || "User", phone: mobile },
        });

        if (createError || !newUser) {
          return json({ error: "Could not create your account. Please try again." }, 500);
        }

        userId = newUser.id;

        // Create profile row
        const { error: profileError } = await supabaseAdmin.from("profiles").insert({
          id: userId,
          full_name: fullName || "User",
          role,
          business_name: businessName || "",
          service_type: serviceType || "",
          phone: mobile,
          avatar_url: "",
        });

        if (profileError) {
          // Best effort — profile may be auto-created by trigger
        }

        // Claim referral if provided
        if (referralCode) {
          await supabaseAdmin.rpc("claim_referral", { p_referral_code: referralCode });
        }
      }

      // Issue a session for the user by generating a magic link token and
      // returning it to the client so they can establish a Supabase session
      const { data: tokenData, error: tokenError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: pseudoEmail,
      });

      if (tokenError || !tokenData) {
        return json({ error: "Verification succeeded but could not start your session. Please try again." }, 500);
      }

      // Extract the token from the properties
      const hashedToken = tokenData.properties?.hashed_token;
      if (!hashedToken) {
        return json({ error: "Could not establish session. Please try again." }, 500);
      }

      return json({
        success: true,
        message: "OTP verified successfully",
        token: hashedToken,
        email: pseudoEmail,
      }, 200);
    }

    // ─── RESEND OTP ───
    if (action === "resend-otp") {
      if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
      if (!AUTH_KEY) {
        return json({ error: "OTP service is not configured. Contact support." }, 503);
      }

      const body = await req.json().catch(() => ({}));
      const mobile = normalizeIndianMobile(body.mobile ?? "");
      if (!mobile) return json({ error: "Invalid mobile number." }, 400);

      const mobileCheck = checkRateLimit(`verify:mobile:${mobile}`, "resend");
      if (!mobileCheck.ok) return json({ error: mobileCheck.message }, 429);

      const params = new URLSearchParams({
        mobile,
        authkey: AUTH_KEY,
        retrytype: "text",
      });

      const resp = await fetch(`${MSG91_BASE}/retry?${params}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
      });

      if (!resp.ok) {
        return json({ error: "Could not resend OTP. Please try again." }, 502);
      }

      return json({ success: true, message: "OTP resent successfully" }, 200);
    }

    return json({ error: "Unknown endpoint" }, 404);
  } catch {
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
