// Shared email notification utility — works across all Pal apps.
// Uses Resend API directly (no extra deps).

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = "noreply@tradepals.net";
const FROM_NAME = "TradePals";

// App config — each app passes its key, the rest is derived
const APP_CONFIG = {
  splicepal: { name: "SplicePal", color: "#33cc33", url: "https://splicepal.tradepals.net" },
  weldpal:   { name: "WeldPal",   color: "#F97316", url: "https://weldpal.tradepals.net" },
  poolpal:   { name: "PoolPal",   color: "#14B8A6", url: "https://poolpal.tradepals.net" },
  voltpal:   { name: "VoltPal",   color: "#FACC15", url: "https://voltpal.tradepals.net" },
  pipepal:   { name: "PipePal",   color: "#3B82F6", url: "https://pipepal.tradepals.net" },
};

function buildAnalysisReadyEmail({ appKey, displayName, analysisType }) {
  const app = APP_CONFIG[appKey] || APP_CONFIG.weldpal;
  const logoUrl = `https://tradepals.net/${appKey}-logo.png`;
  const historyUrl = `${app.url}/history`;
  const firstName = (displayName || "").split(" ")[0] || "there";
  const typeLabel = (analysisType || "weld").replace(/_/g, " ");
  // Use dark text for yellow buttons (VoltPal), white for others
  const btnTextColor = appKey === "voltpal" ? "#0f0f10" : "#ffffff";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your ${app.name} analysis is ready</title>
</head>
<body style="margin:0;padding:0;background:#0f0f10;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e5e5e7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0f0f10;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background:#17171a;border:1px solid #2a2a2e;border-radius:12px;overflow:hidden;">
          <tr>
            <td align="center" style="padding:32px 32px 16px;">
              <img src="${logoUrl}" alt="${app.name}" width="200" style="display:block;max-width:200px;height:auto;">
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 0;">
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#ffffff;text-align:center;">Your analysis is ready</h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#a0a0a8;text-align:center;">
                Hey ${firstName}, your <strong style="color:#ffffff;">${typeLabel}</strong> analysis has been processed and is ready to view in ${app.name}.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 32px 24px;">
              <a href="${historyUrl}" style="display:inline-block;background:${app.color};color:${btnTextColor};font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:8px;">View in ${app.name}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid #2a2a2e;">
              <p style="margin:0;font-size:12px;color:#6b6b73;text-align:center;line-height:1.6;">
                This notification was sent because a queued photo was processed while you were offline.<br>
                ${app.name} is a TradePals, LLC product &middot; <a href="https://tradepals.net" style="color:#6b6b73;text-decoration:underline;">tradepals.net</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendAnalysisReadyEmail({ to, appKey, displayName, analysisType }) {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping email notification");
    return;
  }

  const app = APP_CONFIG[appKey] || APP_CONFIG.weldpal;
  const html = buildAnalysisReadyEmail({ appKey, displayName, analysisType });

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [to],
        subject: `Your ${app.name} analysis is ready`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend email error:", res.status, err);
    }
  } catch (err) {
    console.error("Email send failed:", err.message);
  }
}
