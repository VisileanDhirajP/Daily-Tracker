import { NextResponse } from "next/server";
import { Resend } from "resend";
import { IS_MOCK } from "@/lib/config";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_B64 = 15_000_000; // ~11MB attachment ceiling

interface SendBody {
  to?: string | string[];
  subject?: string;
  summary?: string;
  pdfBase64?: string;
  filename?: string;
}

/**
 * Relay a client-generated report PDF to the manager via Resend.
 * Returns 501 when email isn't configured so the client can fall back to a
 * download + mailto draft. Requires an authenticated Supabase session in
 * supabase mode; in mock mode it's dev-only and unauthenticated.
 */
export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return NextResponse.json({ error: "Email not configured" }, { status: 501 });
  }

  // Require a valid session before relaying mail. Always enforced in
  // production — even if the app is misconfigured to mock mode — so this route
  // can never become an unauthenticated open relay. Only skipped in genuine
  // local mock development.
  if (!IS_MOCK || process.env.NODE_ENV === "production") {
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: "Auth check failed" }, { status: 401 });
    }
  }

  let body: SendBody;
  try {
    body = (await request.json()) as SendBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { to, subject, summary, pdfBase64, filename } = body;

  const recipients = (Array.isArray(to) ? to : to ? [to] : []).map((r) => r.trim());
  if (recipients.length === 0 || !recipients.every((r) => EMAIL_RE.test(r))) {
    return NextResponse.json({ error: "Invalid recipient" }, { status: 400 });
  }
  if (!pdfBase64 || pdfBase64.length > MAX_B64) {
    return NextResponse.json({ error: "Missing or oversized attachment" }, { status: 400 });
  }

  const resend = new Resend(apiKey);
  try {
    const { error } = await resend.emails.send({
      from,
      to: recipients,
      subject: subject || "Daily work report",
      text: summary || "Please find my work report attached.",
      attachments: [
        {
          filename: filename || "report.pdf",
          content: pdfBase64,
        },
      ],
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return NextResponse.json({ sent: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Send failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
