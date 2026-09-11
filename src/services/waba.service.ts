export interface WABASendOptions {
  to: string;
  text: string;
  vault?: { wabaToken?: string };
  company?: { waba?: { phoneNumberId?: string } };
}

export interface WABATypingOptions {
  to: string;
  vault?: { wabaToken?: string };
  company?: { waba?: { phoneNumberId?: string } };
}

export class WABAService {
  static async sendTypingIndicator(options: WABATypingOptions): Promise<{ success: boolean; data?: any; error?: any }> {
    const { to, vault, company } = options;

    const token = vault?.wabaToken || process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = company?.waba?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneId) {
      return { success: false, error: 'Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID' };
    }

    try {
      const response = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'action',
          action: 'typing_on'
        })
      });

      const responseData = await response.json();
      if (!response.ok) {
        console.warn('[WABA][TYPING] Meta response warning:', responseData?.error?.message || response.statusText);
        return { success: false, error: responseData };
      }

      console.log('[WABA][TYPING] Native typing indicator enabled for recipient:', to ? `${to.slice(0, 5)}***` : '');
      return { success: true, data: responseData };
    } catch (err: any) {
      console.warn('[WABA][TYPING] Non-blocking typing indicator error:', err?.message);
      return { success: false, error: err?.message };
    }
  }

  static async sendMessage(options: WABASendOptions): Promise<{ success: boolean; data?: any; error?: any }> {
    const { to, text, vault, company } = options;

    const token = vault?.wabaToken || process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = company?.waba?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;

    const tokenPresent = Boolean(token);
    const phoneIdPresent = Boolean(phoneId);

    console.log('[WABA] Configuration:', {
      tokenPresent,
      phoneIdPresent,
      phoneId: phoneId ? `${phoneId.slice(0, 4)}***` : null
    });

    if (!token || !phoneId) {
      console.error('[WABA] BLOCKED: Missing credentials', {
        missingToken: !token,
        missingPhoneId: !phoneId
      });
      return { success: false, error: 'Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID' };
    }

    console.log('[WABA] Sending message:', {
      phoneId,
      recipient: to ? `${to.slice(0, 5)}***` : '',
      textLength: text.length
    });

    try {
      const response = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: {
            body: text
          }
        })
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('[WABA] Meta error:', {
          status: response.status,
          code: responseData?.error?.code,
          type: responseData?.error?.type,
          message: responseData?.error?.message
        });
        return { success: false, error: responseData };
      }

      console.log('[WABA] Meta response:', responseData);
      console.log('[WABA] Message sent successfully');
      return { success: true, data: responseData };
    } catch (err: any) {
      console.error('[WABA] Network error:', { message: err?.message });
      return { success: false, error: err?.message };
    }
  }
}
