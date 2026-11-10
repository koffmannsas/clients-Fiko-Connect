import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import fs from "fs";

let dbInstance: Firestore | null = null;
let isAuthReady = false;

const SYSTEM_BOT_EMAIL = "fiko-system-bot@fiko.internal";
const SYSTEM_BOT_PASSWORD = "FikoSystemSecret2026!Key";

/**
 * Returns an authenticated Firestore instance for server-side trusted operations
 * (e.g., webhook ingestion from WhatsApp and Paystack).
 */
export async function getServerDb(): Promise<Firestore> {
  if (dbInstance && isAuthReady) {
    return dbInstance;
  }

  const configPath = "./firebase-applet-config.json";
  if (!fs.existsSync(configPath)) {
    throw new Error("firebase-applet-config.json not found on server.");
  }

  const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
  
  const app = getApps().find(a => a.name === "fiko-server-admin") || initializeApp(cfg, "fiko-server-admin");
  const auth = getAuth(app);
  dbInstance = getFirestore(app);

  try {
    await signInWithEmailAndPassword(auth, SYSTEM_BOT_EMAIL, SYSTEM_BOT_PASSWORD);
    isAuthReady = true;
  } catch (err: any) {
    if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
      try {
        await createUserWithEmailAndPassword(auth, SYSTEM_BOT_EMAIL, SYSTEM_BOT_PASSWORD);
        isAuthReady = true;
      } catch (createErr: any) {
        console.warn("[Fiko Server DB] Failed to create system bot user:", createErr.message);
      }
    } else {
      console.warn("[Fiko Server DB] System bot auth warning:", err.message);
    }
  }

  return dbInstance;
}
