import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};


const ALL_PERMISSIONS = [
  "dashboard",
  "donations",
  "expenses",
  "funds",
  "reports",
  "transactions",
  "contribution_requests",
  "announcements",
  "programs",
  "prayer_times",
  "mahall_members",
  "external_contributors",
  "committee",
  "documents",
  "audit_logs",
  "settings",
  "messages",
  "contribution_analytics",
  "user_management",
];


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


Deno.serve(
  async (req) => {

    if (
      req.method ===
      "OPTIONS"
    ) {
      return new Response(
        "ok",
        {
          headers:
            corsHeaders,
        }
      );
    }


    try {

      const supabaseUrl =
        Deno.env.get(
          "SUPABASE_URL"
        );

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


      const adminClient =
        createClient(
          supabaseUrl,
          serviceRoleKey
        );


      const {
        data: {
          user: caller,
        },
        error: callerError,
      } =
        await adminClient.auth.getUser(
          authHeader.replace(
            "Bearer ",
            ""
          )
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


      /* ==================================
         LOAD CALLER
      ================================== */

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
        callerMember.role !==
        "admin"
      ) {
        return json(
          {
            error:
              "Only administrators can create committee users.",
          },
          403
        );
      }


      const body =
        await req.json();


      const {
        fullName,
        email,
        password,
        phone,
        position,
        role,
        permissions = [],
      } = body;


      if (
        !fullName?.trim() ||
        !email?.trim() ||
        !password ||
        !role
      ) {
        return json(
          {
            error:
              "Name, email, password and role are required.",
          },
          400
        );
      }


      if (
        password.length <
        8
      ) {
        return json(
          {
            error:
              "Password must contain at least 8 characters.",
          },
          400
        );
      }


      /* ==================================
         LOAD ROLE TEMPLATE
      ================================== */

      const {
        data: roleRecord,
        error:
          roleError,
      } =
        await adminClient
          .from(
            "committee_roles"
          )
          .select(`
            id,
            name,
            is_active,
            permissions
          `)
          .eq(
            "name",
            role
          )
          .eq(
            "is_active",
            true
          )
          .maybeSingle();


      if (
        roleError ||
        !roleRecord
      ) {
        return json(
          {
            error:
              "The selected role is not active or does not exist.",
          },
          400
        );
      }


      /* ==================================
         DETERMINE PERMISSIONS
      ================================== */

      const defaultPermissions =
        Array.isArray(
          roleRecord.permissions
        )
          ? roleRecord.permissions.filter(
              (
                key: string
              ) =>
                ALL_PERMISSIONS.includes(
                  key
                )
            )
          : [];


      let finalPermissions =
        defaultPermissions;


      /*
        ONLY SUPER ADMIN can override
        role-template permissions.
      */

      if (
        callerMember.is_super_admin
      ) {

        finalPermissions =
          [
            ...new Set(
              permissions.filter(
                (
                  key: string
                ) =>
                  ALL_PERMISSIONS.includes(
                    key
                  )
              )
            ),
          ];

      }


      /* ==================================
         CREATE AUTH USER
      ================================== */

      const {
        data: authData,
        error:
          authError,
      } =
        await adminClient.auth.admin.createUser({
          email:
            email
              .trim()
              .toLowerCase(),

          password,

          email_confirm:
            true,

          user_metadata: {
            full_name:
              fullName.trim(),
          },
        });


      if (
        authError ||
        !authData.user
      ) {
        return json(
          {
            error:
              authError?.message ||
              "Unable to create account.",
          },
          400
        );
      }


      const authUser =
        authData.user;


      /* ==================================
         COMMITTEE MEMBER
      ================================== */

      const {
        data: committeeMember,
        error:
          committeeError,
      } =
        await adminClient
          .from(
            "committee_members"
          )
          .insert({
            id:
              authUser.id,

            full_name:
              fullName.trim(),

            email:
              email
                .trim()
                .toLowerCase(),

            phone:
              phone?.trim() ||
              null,

            position:
              position?.trim() ||
              null,

            role,

            is_active:
              true,

            is_super_admin:
              false,
          })
          .select()
          .single();


      if (
        committeeError ||
        !committeeMember
      ) {

        await adminClient.auth.admin.deleteUser(
          authUser.id
        );

        return json(
          {
            error:
              committeeError?.message ||
              "Unable to create committee profile.",
          },
          400
        );
      }


      /* ==================================
         PERMISSIONS
      ================================== */

      if (
        finalPermissions.length >
        0
      ) {

        const rows =
          finalPermissions.map(
            (
              key: string
            ) => ({
              committee_member_id:
                committeeMember.id,

              permission_key:
                key,

              can_view:
                true,
            })
          );


        const {
          error:
            permissionError,
        } =
          await adminClient
            .from(
              "user_permissions"
            )
            .insert(
              rows
            );


        if (
          permissionError
        ) {

          await adminClient
            .from(
              "committee_members"
            )
            .delete()
            .eq(
              "id",
              committeeMember.id
            );


          await adminClient.auth.admin.deleteUser(
            authUser.id
          );


          return json(
            {
              error:
                permissionError.message,
            },
            400
          );
        }
      }


      return json({
        success:
          true,

        user: {
          id:
            authUser.id,

          fullName:
            committeeMember.full_name,

          email:
            committeeMember.email,

          role:
            committeeMember.role,

          position:
            committeeMember.position,

          isSuperAdmin:
            false,
        },
      });

    } catch (error) {

      console.error(
        error
      );

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
  }
);