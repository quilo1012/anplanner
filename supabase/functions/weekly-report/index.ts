import { createClient } from "npm:@supabase/supabase-js@2.93.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate JWT
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError?.message, "User:", !!user);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user role and profile
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const userRole = roleData?.role || "operator";

    const { data: profileData } = await adminClient
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .maybeSingle();

    const userName = profileData?.name || "";

    // Parse + validate request body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const line = typeof body.line === "string" ? body.line.trim() : "";
    const weekStart = typeof body.week_start === "string" ? body.week_start.trim() : "";
    const shiftFilter = typeof body.shift === "string" ? body.shift.toUpperCase() : "ALL";

    if (!line || !weekStart) {
      return new Response(
        JSON.stringify({ error: "Missing required params: line, week_start" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (line.length > 50 || !/^[A-Za-z0-9 _\-./]+$/.test(line)) {
      return new Response(JSON.stringify({ error: "Invalid line value" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      return new Response(JSON.stringify({ error: "week_start must be YYYY-MM-DD" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const startDate = new Date(weekStart + "T00:00:00Z");
    if (isNaN(startDate.getTime())) {
      return new Response(JSON.stringify({ error: "Invalid week_start date" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const now = Date.now();
    const fiveYearsMs = 5 * 365 * 24 * 60 * 60 * 1000;
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;
    if (startDate.getTime() < now - fiveYearsMs || startDate.getTime() > now + oneYearMs) {
      return new Response(JSON.stringify({ error: "week_start out of allowed range" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!["ALL", "DAY", "NIGHT"].includes(shiftFilter)) {
      return new Response(JSON.stringify({ error: "shift must be one of ALL, DAY, NIGHT" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lineNumber = line.replace(/^Line\s+/i, "");
    const shiftFilterDb = shiftFilter.toLowerCase();

    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + 6);
    const weekEnd = endDate.toISOString().split("T")[0];

    // Build sessions query
    let sessionsQuery = adminClient
      .from("production_sessions")
      .select("id, date, shift_type, planned_quantity, production_line, line_leader")
      .eq("production_line", lineNumber)
      .gte("date", weekStart)
      .lte("date", weekEnd);

    if (shiftFilter !== "ALL") {
      sessionsQuery = sessionsQuery.eq("shift_type", shiftFilterDb);
    }

    // Access control: operators only see their lines
    if (userRole === "operator") {
      sessionsQuery = sessionsQuery.eq("line_leader", userName);
    }

    const { data: sessions, error: sessionsError } = await sessionsQuery;

    if (sessionsError) {
      console.error("Sessions query error:", sessionsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch sessions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!sessions || sessions.length === 0) {
      return new Response(
        JSON.stringify({
          line,
          week_start: weekStart,
          days: [],
          totals: { planned: 0, actual: 0, performance: null, downtime_minutes: 0 },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sessionIds = sessions.map((s) => s.id);

    // Fetch items and downtimes in parallel
    const [itemsResult, downtimesResult] = await Promise.all([
      adminClient
        .from("production_items")
        .select("session_id, quantity_actual")
        .in("session_id", sessionIds),
      adminClient
        .from("structured_downtimes")
        .select("session_id, duration")
        .in("session_id", sessionIds),
    ]);

    // Aggregate per session
    const itemsBySession = new Map<string, number>();
    for (const item of itemsResult.data || []) {
      const current = itemsBySession.get(item.session_id) || 0;
      itemsBySession.set(item.session_id, current + (item.quantity_actual || 0));
    }

    const downtimeBySession = new Map<string, number>();
    for (const dt of downtimesResult.data || []) {
      const current = downtimeBySession.get(dt.session_id) || 0;
      downtimeBySession.set(dt.session_id, current + (dt.duration || 0));
    }

    // Build day rows
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const days = sessions.map((s) => {
      const planned = s.planned_quantity || 0;
      const actual = itemsBySession.get(s.id) || 0;
      const downtimeMinutes = downtimeBySession.get(s.id) || 0;
      const d = new Date(s.date + "T00:00:00");
      const dayName = dayNames[d.getDay()];
      const performance = planned > 0 ? Math.round((actual / planned) * 1000) / 10 : null;

      return {
        date: s.date,
        day_name: dayName,
        shift: s.shift_type.toUpperCase(),
        planned,
        actual,
        performance,
        downtime_minutes: downtimeMinutes,
      };
    });

    // Sort by date then shift (DAY before NIGHT)
    days.sort((a, b) => {
      if (a.date < b.date) return -1;
      if (a.date > b.date) return 1;
      if (a.shift === "DAY" && b.shift === "NIGHT") return -1;
      if (a.shift === "NIGHT" && b.shift === "DAY") return 1;
      return 0;
    });

    // Totals
    const totalPlanned = days.reduce((s, d) => s + d.planned, 0);
    const totalActual = days.reduce((s, d) => s + d.actual, 0);
    const totalDowntime = days.reduce((s, d) => s + d.downtime_minutes, 0);
    const totalPerformance = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 1000) / 10 : null;

    return new Response(
      JSON.stringify({
        line,
        week_start: weekStart,
        days,
        totals: {
          planned: totalPlanned,
          actual: totalActual,
          performance: totalPerformance,
          downtime_minutes: totalDowntime,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
