/// <reference types="@cloudflare/workers-types" />

/**
 * cert-worker — Cloudflare Worker
 *
 * Triggered by a Supabase Database Webhook whenever a quiz_attempts row is
 * inserted with passed = true. Responsibilities (stubs below):
 *   1. Validate X-Webhook-Secret
 *   2. Parse the Supabase webhook payload
 *   3. Fetch enrollment + user + firm data from Supabase (service role)
 *   4. Generate the compliance certificate PDF with pdf-lib
 *   5. Upload PDF to Supabase Storage at firms/{firm_id}/employees/{user_id}/{enrollment_id}.pdf
 *   6. Insert a row into the certificates table
 *   7. Email the certificate to the employee via the Resend REST API
 */

export interface Env {
  // Set via `wrangler secret put WEBHOOK_SECRET`
  WEBHOOK_SECRET: string;
  // Set via `wrangler secret put SUPABASE_SERVICE_ROLE_KEY`
  SUPABASE_SERVICE_ROLE_KEY: string;
  // Set as a plain var in wrangler.toml [vars] or via `wrangler secret put`
  SUPABASE_URL: string;
  // Set via `wrangler secret put RESEND_API_KEY`
  RESEND_API_KEY: string;
}

/** Shape of the Supabase Database Webhook payload for quiz_attempts INSERT */
interface SupabaseWebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: {
    id: string;
    firm_id: string;
    enrollment_id: string;
    user_id: string;
    score: number;
    passed: boolean;
    answers: Record<string, unknown> | null;
    attempted_at: string;
  } | null;
  old_record: Record<string, unknown> | null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Only accept POST
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // ------------------------------------------------------------------
    // 1. Validate shared secret
    // ------------------------------------------------------------------
    const incomingSecret = request.headers.get("X-Webhook-Secret");
    if (!incomingSecret || incomingSecret !== env.WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    // ------------------------------------------------------------------
    // 2. Parse payload
    // ------------------------------------------------------------------
    let payload: SupabaseWebhookPayload;
    try {
      payload = (await request.json()) as SupabaseWebhookPayload;
    } catch {
      return new Response("Bad Request: invalid JSON", { status: 400 });
    }

    // Only act on passed attempts; ignore anything else Supabase might send
    if (
      payload.type !== "INSERT" ||
      payload.table !== "quiz_attempts" ||
      !payload.record?.passed
    ) {
      return new Response("OK", { status: 200 });
    }

    const { id: attemptId, firm_id, enrollment_id, user_id, score } =
      payload.record;

    try {
      // ----------------------------------------------------------------
      // 3. TODO: fetch enrollment + user + firm from Supabase
      //    Use the service role key so RLS is bypassed.
      //    Needed fields:
      //      - employee display name + email  (auth.users / firm_members)
      //      - firm name                      (firms)
      //      - course title                   (courses via enrollments)
      //      - pass threshold                 (courses.pass_threshold)
      // ----------------------------------------------------------------
      void { attemptId, firm_id, enrollment_id, user_id, score }; // remove when implemented

      // ----------------------------------------------------------------
      // 4. TODO: generate certificate PDF with pdf-lib
      //    - Fill in: employee name, firm name, course title, score,
      //      issued date, expiry date (issued + 1 year), cert number
      //    - Call public.generate_certificate_number() via Supabase RPC
      //      or generate locally with crypto.randomUUID() + timestamp
      // ----------------------------------------------------------------

      // ----------------------------------------------------------------
      // 5. TODO: upload PDF to Supabase Storage (service role)
      //    Path: firms/{firm_id}/employees/{user_id}/{enrollment_id}.pdf
      //    Bucket: certificates (private)
      // ----------------------------------------------------------------

      // ----------------------------------------------------------------
      // 6. TODO: insert into public.certificates
      //    Columns: firm_id, user_id, enrollment_id, certificate_number,
      //             storage_path, issued_at, expires_at
      //    Use service role key — no RLS bypass needed from client.
      // ----------------------------------------------------------------

      // ----------------------------------------------------------------
      // 7. TODO: send certificate email via Resend REST API
      //    POST https://api.resend.com/emails
      //    Attach a 7-day signed download URL from Supabase Storage.
      // ----------------------------------------------------------------

      return new Response("OK", { status: 200 });
    } catch (err) {
      console.error("cert-worker error", err);
      // Return 500 so Supabase will retry the webhook delivery
      return new Response("Internal Server Error", { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;
