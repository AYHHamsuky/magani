import { env } from "../env";

/** Termii SMS. Without an API key, messages are logged so the flow can be tested locally. */
export async function sendSms(to: string, text: string): Promise<void> {
  const phone = to.replace(/^0/, "234").replace(/^\+/, "");
  if (!env.TERMII_API_KEY) {
    console.log(`[sms:dev] to ${phone}: ${text}`);
    return;
  }
  const res = await fetch("https://api.ng.termii.com/api/sms/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: env.TERMII_API_KEY,
      to: phone,
      from: env.TERMII_SENDER_ID,
      sms: text,
      type: "plain",
      channel: "generic",
    }),
  });
  if (!res.ok) throw new Error(`Termii responded ${res.status}: ${await res.text()}`);
}
