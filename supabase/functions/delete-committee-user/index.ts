import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};


function json(
  body: unknown,
  status = 200
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type":
          "application/json",
      },
    }
  );
}


Deno.serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }


  try {

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY"
      );


    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      return json(
        {
          error:
            "Missing Supabase configuration.",
        },
        500
      );
    }


    const authHeader =
      req.headers.get(
        "Authorization"
      );


    if (!authHeader) {
      return json(
        {
          error:
            "Authentication required.",
        },
        401
      );
    }


    const token =
      authHeader.replace(
        "Bearer ",
        ""
      );


    const adminClient =
      createClient(
        supabaseUrl,
        serviceRoleKey
      );


    // ========================================
    // VERIFY CALLER
    // ========================================

    const {
      data: {
        user: caller,
      },
      error: callerError,
    } =
      await adminClient.auth.getUser(
        token
      );


    if (
      callerError ||
      !caller
    ) {
      return json(
        {
          error:
            "Invalid authentication.",
        },
        401
      );
    }


    // ========================================
    // VERIFY SUPER ADMIN
    // ========================================

    const {
      data: callerMember,
      error:
        callerMemberError,
    } =
      await adminClient
        .from(
          "committee_members"
        )
        .select(`
          id,
          role,
          is_active,
          is_super_admin
        `)
        .eq(
          "id",
          caller.id
        )
        .maybeSingle();


    if (
      callerMemberError ||
      !callerMember ||
      !callerMember.is_active
    ) {
      return json(
        {
          error:
            "Your committee account is not active.",
        },
        403
      );
    }


    if (
      !callerMember.is_super_admin
    ) {
      return json(
        {
          error:
            "Only the Super Admin can permanently delete users.",
        },
        403
      );
    }


    // ========================================
    // REQUEST
    // ========================================

    const body =
      await req.json();

    const targetUserId =
      body?.userId;


    if (!targetUserId) {
      return json(
        {
          error:
            "userId is required.",
        },
        400
      );
    }


    // ========================================
    // PROTECT SUPER ADMIN
    // ========================================

    if (
      targetUserId === caller.id
    ) {
      return json(
        {
          error:
            "The Super Admin account cannot be deleted.",
        },
        400
      );
    }


    const {
      data: targetMember,
      error:
        targetMemberError,
    } =
      await adminClient
        .from(
          "committee_members"
        )
        .select(`
          id,
          full_name,
          email,
          role,
          is_super_admin
        `)
        .eq(
          "id",
          targetUserId
        )
        .maybeSingle();


    if (targetMemberError) {
      return json(
        {
          error:
            targetMemberError.message,
        },
        400
      );
    }


    if (!targetMember) {
      return json(
        {
          error:
            "Committee user not found.",
        },
        404
      );
    }


    if (
      targetMember.is_super_admin
    ) {
      return json(
        {
          error:
            "The Super Admin account cannot be deleted.",
        },
        400
      );
    }


    // ========================================
    // DELETE AUTH USER
    //
    // committee_members.id references
    // auth.users.id with ON DELETE CASCADE.
    // Historical records using created_by /
    // reviewed_by were changed to SET NULL.
    // ========================================

    const {
      error: deleteError,
    } =
      await adminClient.auth.admin.deleteUser(
        targetUserId
      );


    if (deleteError) {
      return json(
        {
          error:
            deleteError.message,
        },
        400
      );
    }


    return json({
      success: true,

      deletedUser: {
        id:
          targetMember.id,

        fullName:
          targetMember.full_name,

        email:
          targetMember.email,

        role:
          targetMember.role,
      },
    });

  } catch (error) {

    console.error(error);

    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error.",
      },
      500
    );
  }
});