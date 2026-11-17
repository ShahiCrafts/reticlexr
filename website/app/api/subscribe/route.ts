import { NextResponse } from 'next/server';

/* Newsletter subscribe, handled server-side so the Resend API key never
   reaches the browser. Creates a Resend contact (the Contacts API is
   global: one audience, organised with segments and topics), which is
   the subscriber list the maintainer broadcasts release news to from
   the Resend dashboard.
   Needs only RESEND_API_KEY in the Vercel project environment. Until it
   exists this answers 503 { error: 'not_configured' } and the footer
   form falls back to the FormSubmit relay, so the form keeps working
   in the meantime. */
export async function POST(req: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }

  let email = '';
  try {
    const body = await req.json();
    email = typeof body?.email === 'string' ? body.email.trim() : '';
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 422 });
  }

  const res = await fetch('https://api.resend.com/contacts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, unsubscribed: false }),
  });

  if (res.ok) {
    return NextResponse.json({ success: true });
  }
  const data = await res.json().catch(() => ({}) as Record<string, unknown>);
  /* Re-subscribing an address already on the list is a success for the
     visitor, not an error. */
  const message = typeof data?.message === 'string' ? data.message : '';
  if (res.status === 409 || /already/i.test(message)) {
    return NextResponse.json({ success: true, already: true });
  }
  return NextResponse.json({ error: 'provider_error' }, { status: 502 });
}
