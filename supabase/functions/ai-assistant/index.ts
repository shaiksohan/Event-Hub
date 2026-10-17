import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM_PROMPT = `You are the EventHub AI Assistant, a helpful customer service assistant for an event services marketplace platform called EventHub.

EventHub connects customers with service providers across four categories:
1. Function Services — event planning, decor, stage setup, lighting, sound, tents, flower decoration for weddings, birthdays, corporate events, religious functions, etc.
2. Catering Services — wedding catering, function catering, birthday catering, corporate catering, South Indian, Andhra, vegetarian, non-vegetarian, biryani catering
3. Camera & Studio Services — wedding photography, videography, candid photography, pre-wedding shoots, drone photography, live streaming, photo & video editing
4. Workers Services — decoration workers, stage setup, lighting, sound system, DJ, tables & chairs, tent/canopy, flower decoration, event management staff, security & stewards

You can help customers:
- Search for service providers by type, category, city, or budget
- Navigate to the booking flow (direct them to the service detail page)
- Check their existing bookings (direct them to /bookings)
- Answer questions about how EventHub works
- Provide general event planning guidance

CRITICAL RULES:
1. NEVER invent or fabricate provider names, prices, availability, phone numbers, or booking confirmations. Only use data returned from the database search tools.
2. NEVER confirm a booking. Booking requires the customer to go through the booking flow on the service detail page. Always direct them to click on a service to start booking.
3. If asked about specific prices, always clarify that final pricing depends on their selections (package, guest count, duration, etc.) and they should check the service detail page.
4. If you don't have enough information to answer, ask clarifying questions.
5. If a customer wants to contact support or needs a contact number, ALWAYS provide ONLY the EventHub official contact details:
   - EventHub Support Phone: +91 90000 90000
   - EventHub Support Email: support@eventhub.app
   Do NOT provide any other phone numbers. Do NOT fabricate provider phone numbers. If the user wants to contact a specific service provider, tell them to open the service detail page and use the booking flow — provider contact details are shared after a booking is made.
6. Be friendly, concise, and helpful. Use simple language. Do NOT include any unrelated information, marketing messages, or off-topic content. Stay strictly within EventHub-related topics.
7. Support both English and Telugu. If the user writes in Telugu, respond in Telugu. If they write in English, respond in English.
8. When you find services from the database, present them clearly with the service title, city, rating, and a suggestion to view details. Do NOT make up details not in the data.
9. Always remind users they need to be signed in to make a booking.
10. NEVER respond to questions unrelated to EventHub or event services. If a user asks about unrelated topics (politics, other companies, general knowledge, etc.), politely say: "I can only help with EventHub services. For anything else, please contact our support team at +91 90000 90000 or support@eventhub.app"

When presenting search results, format them as a simple list. Include the service title, city, rating, and price_unit if available. Suggest the user tap/click to view details and book.`;

interface SearchResult {
  id: string;
  title: string;
  city: string;
  rating: number;
  review_count: number;
  price: number;
  price_unit: string;
  service_type: string;
  category: string;
  image_url: string;
  available: boolean;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  messages: ChatMessage[];
  language?: "en" | "te";
  context?: {
    service_type?: string;
    city?: string;
  };
}

function jsonResponse(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractServiceType(text: string): string | null {
  const lower = text.toLowerCase();
  if (lower.includes("cater") || lower.includes("food") || lower.includes("biryani") || lower.includes("ఆహార") || lower.includes("క్యాటరिंగ్")) return "catering";
  if (lower.includes("photo") || lower.includes("camera") || lower.includes("video") || lower.includes("studio") || lower.includes("wedding shoot") || lower.includes("ఫోటో") || lower.includes("కెమెరా")) return "camera_studio";
  if (lower.includes("worker") || lower.includes("staff") || lower.includes("dj") || lower.includes("decoration") || lower.includes("stage") || lower.includes("sound") || lower.includes("tent") || lower.includes("వర్కర్") || lower.includes("డిజె")) return "workers";
  if (lower.includes("function") || lower.includes("event") || lower.includes("wedding") || lower.includes("birthday") || lower.includes("party") || lower.includes("ఫంక్షన్") || lower.includes("వివాహ")) return "function";
  return null;
}

function extractCity(text: string): string | null {
  const cities = ["hyderabad", "secunderabad", "vizag", "visakhapatnam", "vijayawada", "warangal", "tirupati", "guntur", "nellore", "kurnool", "rajahmundry", "kakinada", "ongole", "anantapur", "kadapa", "eluru", "chirala", "machilipatnam", "srikakulam", "karimnagar", "nizamabad", "adilabad"];
  const lower = text.toLowerCase();
  for (const city of cities) {
    if (lower.includes(city)) return city.charAt(0).toUpperCase() + city.slice(1);
  }
  return null;
}

async function searchServices(supabase: ReturnType<typeof createClient>, params: { service_type?: string | null; city?: string | null; category?: string | null; maxPrice?: number | null }): Promise<SearchResult[]> {
  let query = supabase.from("services").select("id, title, city, rating, review_count, price, price_unit, service_type, category, image_url, available").eq("available", true).order("rating", { ascending: false }).limit(5);

  if (params.service_type) query = query.eq("service_type", params.service_type);
  if (params.city) query = query.ilike("city", `%${params.city}%`);
  if (params.category) query = query.ilike("category", `%${params.category}%`);
  if (params.maxPrice) query = query.lte("price", params.maxPrice);

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as unknown as SearchResult[];
}

async function getUserBookings(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await supabase
    .from("service_bookings")
    .select(`
      id, status, booking_date, total_price, payment_status,
      service:services(title, service_type, city, image_url)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) return [];
  return data ?? [];
}

async function callAI(apiKey: string, messages: { role: string; content: string }[]): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-001",
      messages,
      max_tokens: 800,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "I'm sorry, I couldn't generate a response right now.";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const aiApiKey = Deno.env.get("OPENROUTER_API_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return jsonResponse({ error: "Server configuration incomplete — database not connected." }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Authentication required. Please sign in to use the AI assistant." }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return jsonResponse({ error: "Invalid or expired session. Please sign in again." }, 401);
    }

    // Rate limiting: check recent requests count
    const oneMinAgo = new Date(Date.now() - 60_000).toISOString();
    const { count } = await supabase
      .from("ai_chat_logs")
      .select("id", { count: "exact" })
      .eq("user_id", user.id)
      .gte("created_at", oneMinAgo);
    if ((count ?? 0) >= 15) {
      return jsonResponse({
        reply: "You're sending messages too quickly. Please wait a moment and try again. మీరు చాలా త్వరగా సందేశాలు పంపుతున్నారు. దయచేసి కొద్దిసేపు ఆగి మళ్లీ ప్రయత్నించండి.",
        rate_limited: true,
      });
    }

    const body: RequestBody = await req.json();
    const { messages, context } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return jsonResponse({ error: "No messages provided." }, 400);
    }

    // Keep last 10 messages for context
    const recentMessages = messages.slice(-10);
    const lastUserMessage = recentMessages.filter((m) => m.role === "user").pop();

    // Search database based on user message + context
    let searchResults: SearchResult[] = [];
    let bookingsData: unknown[] = [];
    let dbContext = "";

    if (lastUserMessage) {
      const text = lastUserMessage.content;
      const serviceType = context?.service_type || extractServiceType(text);
      const city = context?.city || extractCity(text);

      // Check if user is asking about bookings
      const lowerText = text.toLowerCase();
      const askingBookings = lowerText.includes("booking") || lowerText.includes("my order") || lowerText.includes("my booking") || lowerText.includes("బుకింగ్") || lowerText.includes("నా బుకింగ్");

      if (askingBookings) {
        bookingsData = await getUserBookings(supabase, user.id);
        if (bookingsData.length > 0) {
          dbContext += `\n\nThe user has ${bookingsData.length} recent booking(s):\n`;
          for (const b of bookingsData as Array<{ id: string; status: string; booking_date: string; total_price: number; payment_status: string; service?: { title?: string; service_type?: string; city?: string } }>) {
            dbContext += `- "${b.service?.title || "Unknown"}" on ${b.booking_date}, status: ${b.status}, payment: ${b.payment_status}, price: Rs.${b.total_price}\n`;
          }
          dbContext += "Direct the user to /bookings to see full details and manage their bookings.";
        } else {
          dbContext += "\n\nThe user has no bookings yet. Encourage them to browse services.";
        }
      } else {
        // Search for services
        searchResults = await searchServices(supabase, { service_type: serviceType, city });

        if (searchResults.length > 0) {
          dbContext += `\n\nI found ${searchResults.length} service(s) from the database matching the user's request:\n`;
          for (const s of searchResults) {
            dbContext += `- ID: ${s.id} | "${s.title}" | ${s.category} | ${s.city} | Rating: ${s.rating} (${s.review_count} reviews) | Price: Rs.${s.price} ${s.price_unit}\n`;
          }
          dbContext += "\nPresent these results to the user. Tell them they can tap on any service to view full details and start a booking. Remind them they need to be signed in to book. Do NOT make up any details not listed above.";
        } else if (serviceType || city) {
          dbContext += "\n\nNo services were found in the database matching the user's criteria. Let the user know and suggest they try browsing at /browse or adjusting their search (different city, different service type).";
        }
      }
    }

    // Build the messages for the AI
    const aiMessages = [
      { role: "system", content: SYSTEM_PROMPT + dbContext },
      ...recentMessages.map((m) => ({ role: m.role, content: m.content })),
    ];

    let reply: string;

    if (aiApiKey) {
      // Call the real AI API
      reply = await callAI(aiApiKey, aiMessages);
    } else {
      // Fallback: no AI key configured — use rule-based responses
      reply = generateFallbackResponse(lastUserMessage?.content || "", searchResults, bookingsData, dbContext);
    }

    // Log the interaction for rate limiting and analytics
    await supabase.from("ai_chat_logs").insert({
      user_id: user.id,
      message: lastUserMessage?.content || "",
      response: reply,
      search_results_count: searchResults.length,
    });

    // Build response with service cards if results found
    const response: {
      reply: string;
      services?: SearchResult[];
      navigate_to?: string;
    } = { reply };

    if (searchResults.length > 0) {
      response.services = searchResults;
    }

    // Suggest navigation
    const lowerReply = lastUserMessage?.content.toLowerCase() || "";
    if (lowerReply.includes("booking") || lowerReply.includes("my booking") || lowerReply.includes("బుకింగ్")) {
      response.navigate_to = "/bookings";
    }

    return jsonResponse(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return jsonResponse({
      reply: "I'm having trouble right now. Please try again in a moment, or contact EventHub support at +91 90000 90000 or support@eventhub.app for help.",
      error: message,
    }, 500);
  }
});

function generateFallbackResponse(userMessage: string, searchResults: SearchResult[], bookingsData: unknown[], dbContext: string): string {
  const lower = userMessage.toLowerCase();

  // Greeting
  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey") || lower.includes("namaste") || lower.includes("నమస్తే")) {
    return "Hello! I'm the EventHub AI Assistant. I can help you find event services like Function planning, Catering, Camera & Studio, and Workers. How can I help you today?\n\nనమస్కారం! నేను EventHub AI అసిస్టెంట్. ఫంక్షన్, క్యాటరింగ్, కెమెరా మరియు వర్కర్స్ సేవల కోసం మీకు సహాయం చేయగలను.";
  }

  // Bookings
  if (lower.includes("booking") || lower.includes("my booking") || lower.includes("బుకింగ్")) {
    if (bookingsData.length > 0) {
      return `You have ${bookingsData.length} recent booking(s). You can view and manage all your bookings on the Bookings page. Tap "My Bookings" below to go there now.`;
    }
    return "You don't have any bookings yet. Browse our services to find the perfect provider for your event! You can start by tapping one of the quick reply options below.";
  }

  // Search results
  if (searchResults.length > 0) {
    let response = `I found ${searchResults.length} service(s) for you:\n\n`;
    for (const s of searchResults) {
      response += `• ${s.title} — ${s.city}, Rating: ${s.rating}\n`;
    }
    response += "\nTap on any service below to view details and start booking. You'll need to be signed in to make a booking.";
    return response;
  }

  // Service type queries
  const serviceType = extractServiceType(userMessage);
  if (serviceType) {
    const labels: Record<string, string> = {
      function: "Function Services",
      catering: "Catering Services",
      camera_studio: "Camera & Studio Services",
      workers: "Workers Services",
    };
    return `I can help you find ${labels[serviceType]}! Could you tell me which city you're looking for? You can also browse all ${labels[serviceType]} by going to the Browse page.`;
  }

  // Contact support
  if (lower.includes("support") || lower.includes("help") && lower.includes("human") || lower.includes("contact") || lower.includes("phone") || lower.includes("number") || lower.includes("call")) {
    return "You can reach EventHub support at:\n\nPhone: +91 90000 90000\nEmail: support@eventhub.app\n\nOur team is available to help with any questions about bookings, services, or your account.\n\nమీరు EventHub సపోర్ట్ ను సంప్రదించవచ్చు:\nఫోన్: +91 90000 90000\nఇమెయిల్: support@eventhub.app";
  }

  return "I'm the EventHub AI Assistant. I can help you find event services, check your bookings, or answer questions about EventHub. What are you looking for today?\n\nFor any other questions, call us at +91 90000 90000 or email support@eventhub.app";
}
