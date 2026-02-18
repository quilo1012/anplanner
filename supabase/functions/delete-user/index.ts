import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller identity using the service role client
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callerUser }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerId = callerUser.id;

    // Check caller is admin
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .maybeSingle();

    if (roleData?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only admins can manage users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const action = body.action || "delete";

    // === CREATE USER ===
    if (action === "create") {
      const { email, password, name, role } = body;

      if (!email || !password || !name) {
        return new Response(
          JSON.stringify({ error: "email, password and name are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let createResult = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: name.trim().substring(0, 100) },
      });

      // Handle zombie user: if email already exists, delete the old record and retry
      if (createResult.error && (createResult.error as any).code === "email_exists") {
        console.log(`Zombie user detected for ${email}, cleaning up...`);
        
        // Find zombie auth user by email
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        const zombieUser = listData?.users?.find(u => u.email === email);
        
        if (zombieUser) {
          // Clean up orphaned records
          await supabaseAdmin.from("profiles").delete().eq("id", zombieUser.id);
          await supabaseAdmin.from("user_roles").delete().eq("user_id", zombieUser.id);
          await supabaseAdmin.auth.admin.deleteUser(zombieUser.id);
          console.log(`Zombie user ${email} (${zombieUser.id}) cleaned up`);
        }

        // Retry creation
        createResult = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name: name.trim().substring(0, 100) },
        });
      }

      if (createResult.error) {
        console.error("Error creating user:", createResult.error);
        return new Response(
          JSON.stringify({ error: createResult.error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const newUser = createResult.data;

      // Wait for handle_new_user trigger to create default role
      if (role && role !== "operator" && newUser?.user) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .update({ role })
          .eq("user_id", newUser.user.id);

        if (roleError) {
          console.error("Error updating role:", roleError);
        }
      }

      return new Response(
        JSON.stringify({ success: true, userId: newUser?.user?.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === DELETE USER ===
    const { userId } = body;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (userId === callerId) {
      return new Response(
        JSON.stringify({ error: "Cannot delete yourself" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean up profile and role before deleting auth record
    await supabaseAdmin.from("profiles").delete().eq("id", userId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("Error deleting user:", deleteError);
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
