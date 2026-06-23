import { auth, db } from '../lib/firebase';
import { signInWithCustomToken, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export class AuthService {
  static async sendOTP(phoneNumber: string, params: any = {}): Promise<boolean> {
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, ...params })
      });
      return res.ok;
    } catch (e) {
      console.error("[AuthService] Failed to send OTP", e);
      return false;
    }
  }

  static async verifyOTP(phoneNumber: string, otp: string): Promise<any> {
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, otp })
      });

      if (!res.ok) return null;

      const data = await res.json();

      if (data.token) {
        // Industrial Persistence: Use setPersistence if required,
        // default is LOCAL (persistent across tabs/sessions)
        await signInWithCustomToken(auth, data.token);

        // Store rememberMe session locally if needed
        localStorage.setItem('fiko_company_id', data.companyId);
        localStorage.setItem('fiko_phone', phoneNumber);
      }

      return data;
    } catch (e) {
      console.error("[AuthService] Verification failed", e);
      return null;
    }
  }

  static async logout() {
    await signOut(auth);
    localStorage.removeItem('fiko_company_id');
    localStorage.removeItem('fiko_phone');
    window.location.reload();
  }

  static onAuthChange(callback: (user: any) => void) {
    return onAuthStateChanged(auth, callback);
  }

  // Industrial QR Pairing Hook
  static async getPairingStatus(phoneNumber: string): Promise<string> {
    const docRef = doc(db, 'pairing_sessions', phoneNumber);
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data().status : 'none';
  }
}
