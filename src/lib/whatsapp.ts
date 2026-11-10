/**
 * Fiko OS - WhatsApp Cloud API Policy & Customer Care Service Window
 */

export const WHATSAPP_SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface WhatsAppServiceWindowStatus {
  isOpen: boolean;
  remainingMs: number;
  lastClientMessageAt?: string;
  warningMessage?: string;
}

/**
 * Checks if the customer conversation is within Meta's 24-hour customer care service window.
 * Within 24h of customer message: free-form messages allowed.
 * After 24h: only approved Meta template messages may be sent.
 */
export function checkWhatsAppServiceWindow(
  lastClientMessageTimestamp?: number | string | Date | null
): WhatsAppServiceWindowStatus {
  if (!lastClientMessageTimestamp) {
    return {
      isOpen: false,
      remainingMs: 0,
      warningMessage: 'Aucun message entrant client récent. La fenêtre de service est fermée. Utilisez un modèle Meta approuvé.'
    };
  }

  const timestampMs = typeof lastClientMessageTimestamp === 'number'
    ? lastClientMessageTimestamp
    : new Date(lastClientMessageTimestamp).getTime();

  if (isNaN(timestampMs)) {
    return {
      isOpen: false,
      remainingMs: 0,
      warningMessage: 'Horodatage du message invalide.'
    };
  }

  const now = Date.now();
  const elapsed = now - timestampMs;
  const remaining = WHATSAPP_SERVICE_WINDOW_MS - elapsed;

  if (remaining > 0) {
    return {
      isOpen: true,
      remainingMs: remaining,
      lastClientMessageAt: new Date(timestampMs).toISOString()
    };
  } else {
    return {
      isOpen: false,
      remainingMs: 0,
      lastClientMessageAt: new Date(timestampMs).toISOString(),
      warningMessage: 'La fenêtre de 24h pour les messages libres est expirée. Un template Meta approuvé est requis pour reprendre contact.'
    };
  }
}
