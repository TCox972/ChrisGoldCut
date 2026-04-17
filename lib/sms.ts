const WHATSAPP_API = 'https://graph.facebook.com/v21.0';

/**
 * Envoie un message WhatsApp via Meta Cloud API.
 * Si les variables d'env ne sont pas configurées, le message est loggué en console.
 */
export async function sendSMS({ to, body }: { to: string; body: string }) {
  // Normaliser le numéro (format international sans +)
  let phone = to.replace(/[\s\-().]/g, '');
  if (phone.startsWith('0')) {
    phone = '596' + phone.slice(1); // Martinique par défaut
  }
  if (phone.startsWith('+')) {
    phone = phone.slice(1);
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;

  if (!phoneNumberId || !token) {
    console.log(`[WhatsApp non envoyé — non configuré] → ${phone}: ${body}`);
    return;
  }

  const res = await fetch(`${WHATSAPP_API}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phone,
      type: 'text',
      text: { body },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[WhatsApp API error]', res.status, err);
    throw new Error(`WhatsApp API error: ${res.status}`);
  }

  return res.json();
}
