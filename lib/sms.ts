const WHATSAPP_API = 'https://graph.facebook.com/v21.0';

/**
 * Normalise un numéro au format international sans « + » attendu par l'API Meta.
 * Par défaut, les numéros locaux (commençant par 0) sont considérés martiniquais (+596).
 */
function normalizePhone(to: string): string {
  let phone = to.replace(/[\s\-().]/g, '');
  if (phone.startsWith('+')) {
    phone = phone.slice(1);
  } else if (phone.startsWith('0')) {
    phone = '596' + phone.slice(1); // Martinique par défaut
  }
  return phone;
}

/**
 * Envoie un message WhatsApp en **texte libre** via Meta Cloud API.
 * ⚠️ N'est autorisé par Meta QUE dans la fenêtre de 24 h après un message du client.
 * Pour un message à l'initiative du salon (confirmation, rappel), utiliser
 * `sendWhatsAppTemplate` à la place.
 * Si les variables d'env ne sont pas configurées, le message est loggué en console.
 */
export async function sendSMS({ to, body }: { to: string; body: string }) {
  const phone = normalizePhone(to);
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

/**
 * Envoie un message WhatsApp à partir d'un **template approuvé** par Meta.
 * C'est le mode requis pour tout message à l'initiative du salon (confirmation
 * de RDV, rappel, etc.) en dehors de la fenêtre de 24 h.
 *
 * @param to        Numéro du destinataire (formats locaux ou internationaux acceptés).
 * @param template  Nom exact du template tel qu'approuvé dans Meta Business Manager.
 * @param params    Valeurs injectées dans les variables {{1}}, {{2}}… du corps du template, dans l'ordre.
 * @param lang      Code langue du template (doit correspondre à celui approuvé). Défaut : fr.
 *
 * Si les variables d'env ne sont pas configurées, l'envoi est loggué en console.
 */
export async function sendWhatsAppTemplate({
  to,
  template,
  params = [],
  lang = process.env.WHATSAPP_LANG || 'fr',
}: {
  to: string;
  template: string;
  params?: string[];
  lang?: string;
}) {
  const phone = normalizePhone(to);
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;

  if (!phoneNumberId || !token) {
    console.log(
      `[WhatsApp template non envoyé — non configuré] → ${phone} : ${template}(${params.join(', ')})`,
    );
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
      type: 'template',
      template: {
        name: template,
        language: { code: lang },
        components: params.length
          ? [
              {
                type: 'body',
                parameters: params.map((text) => ({ type: 'text', text })),
              },
            ]
          : [],
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[WhatsApp template API error]', res.status, err);
    throw new Error(`WhatsApp template API error: ${res.status}`);
  }

  return res.json();
}
