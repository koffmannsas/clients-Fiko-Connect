import { db } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, orderBy, limit, serverTimestamp, Timestamp } from 'firebase/firestore';

export class AuthService {
  static async sendOTP(phoneNumber: string): Promise<boolean> {
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber })
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
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch (e) {
      console.error("[AuthService] Verification failed", e);
      return null;
    }
  }
}
