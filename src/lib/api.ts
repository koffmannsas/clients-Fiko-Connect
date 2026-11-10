import { auth } from './firebase';

export async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    } catch (err) {
      console.warn('[Fiko API] Could not get user ID token:', err);
    }
  }

  return headers;
}

export async function apiPaystackStatus() {
  const res = await fetch('/api/paystack/status');
  return res.json();
}

export async function apiPaystackInitialize(params: {
  leadId?: string | number;
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
  amountCommercial: number;
  description?: string;
}) {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/paystack/initialize', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Échec de la création du lien Paystack.');
  }
  return data;
}

export async function apiPaystackVerify(reference: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/paystack/verify/${encodeURIComponent(reference)}`, {
    headers,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Échec de la vérification Paystack.');
  }
  return data;
}

export const apiVerifyPaystackPayment = apiPaystackVerify;
export const apiGetPaystackStatus = apiPaystackStatus;

export async function apiWhatsAppStatus() {
  const res = await fetch('/api/whatsapp/status');
  return res.json();
}

export async function apiWhatsAppSend(params: {
  phone: string;
  text: string;
  leadId?: string | number;
}) {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/whatsapp/send', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Échec de l\'envoi WhatsApp.');
  }
  return data;
}

export async function apiUpdateLeadStage(leadId: string | number, newStatus: string) {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/leads/update-stage', {
    method: 'POST',
    headers,
    body: JSON.stringify({ leadId, newStatus }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Échec de la mise à jour de l\'étape CRM.');
  }
  return data;
}
