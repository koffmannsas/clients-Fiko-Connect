import { Request, Response, NextFunction } from "express";
import { initializeApp as initAdmin, getApps as getAdminApps } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { doc, getDoc } from "firebase/firestore";
import { getServerDb } from "./db";
import fs from "fs";

let adminInitialized = false;

function ensureAdminInitialized() {
  if (adminInitialized) return;
  const cfg = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));
  if (!getAdminApps().length) {
    initAdmin({ projectId: cfg.projectId });
  }
  adminInitialized = true;
}

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  companyId: string;
  role?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  rawBody?: Buffer;
}

/**
 * Middleware: Verifies Firebase ID Token in Authorization header.
 * Looks up user document in Firestore to resolve companyId and permissions.
 * Never trusts client-supplied companyId.
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Jeton d'authentification manquant dans l'en-tête Authorization."
    });
  }

  const token = authHeader.split("Bearer ")[1].trim();

  try {
    ensureAdminInitialized();
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Look up companyId securely from trusted Firestore record
    const db = await getServerDb();
    const userDocRef = doc(db, "users", uid);
    const userSnap = await getDoc(userDocRef);

    let companyId = "default-company";
    let role = "user";

    if (userSnap.exists()) {
      const data = userSnap.data();
      companyId = data?.companyId || companyId;
      role = data?.role || role;
    } else {
      // In development fallback, check user custom claims or fallback
      if (decodedToken.companyId) {
        companyId = decodedToken.companyId;
      }
    }

    req.user = {
      uid,
      email: decodedToken.email,
      companyId,
      role
    };

    next();
  } catch (err: any) {
    console.error("[Fiko Auth] Token verification failed:", err.message);
    return res.status(401).json({
      error: "INVALID_TOKEN",
      message: "Jeton d'authentification invalide ou expiré."
    });
  }
}
