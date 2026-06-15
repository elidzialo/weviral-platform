import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { email } = body

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email: email.trim().toLowerCase(),
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const resetLink = data.properties.action_link

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F6F6F3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:1px solid #ECECE8;overflow:hidden">
        <!-- Header -->
        <tr>
          <td style="padding:32px 40px 24px;border-bottom:1px solid #ECECE8">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:28px;height:28px;background:linear-gradient(120deg,#6E5BFF,#1FD3A3);border-radius:50%;vertical-align:middle"></td>
                <td style="padding-left:10px;font-size:18px;font-weight:900;letter-spacing:-0.5px;color:#0B0B0C;vertical-align:middle">WViral</td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px 40px">
            <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#0B0B0C;letter-spacing:-0.5px">Reset your password</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#8C8C88;line-height:1.6">
              We received a request to reset the password for your WViral account. Click the button below to choose a new password.
            </p>
            <a href="${resetLink}"
               style="display:inline-block;padding:14px 28px;background:linear-gradient(120deg,#6E5BFF,#4D7CFF);color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px">
              Reset password →
            </a>
            <p style="margin:24px 0 0;font-size:13px;color:#8C8C88;line-height:1.6">
              This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email — your password won't change.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #ECECE8;background:#F6F6F3">
            <p style="margin:0;font-size:12px;color:#C4C4C0">
              © WViral · <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="color:#8C8C88;text-decoration:none">weviral.co.uk</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'WViral <noreply@weviral.co.uk>',
      to: email.trim().toLowerCase(),
      subject: 'Reset your WViral password',
      html,
    }),
  })

  if (!resendRes.ok) {
    const errData = await resendRes.json().catch(() => ({}))
    console.error('Resend error:', errData)
    return NextResponse.json({ error: 'Failed to send email. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
