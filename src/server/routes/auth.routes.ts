import express from 'express';
import bcrypt from 'bcrypt';
import { FirestoreRepo } from '../repositories/firestore.repo';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { WABAService } from '../services/waba.service';

const router = express.Router();

// Industrial OTP Delivery: Using the Master System Account to send global OTPs
const SYSTEM_COMPANY_ID = "fiko_system_master";

router.post("/send-otp", async (req, res) => {
    const { phoneNumber, type, password, firstName, lastName, activity } = req.body;
    if (!phoneNumber) return res.status(400).json({ error: "Missing phone number" });

    // For login, we should check if the password is correct before sending OTP
    if (type === 'login') {
        const companyId = `fiko_org_${phoneNumber.replace(/[^0-9]/g, '')}`;
        const companySnap = await FirestoreRepo.db().collection('companies').doc(companyId).get();
        if (!companySnap.exists) return res.status(404).json({ error: "Account not found" });

        const companyData = companySnap.data();
        const isMatch = await bcrypt.compare(password, companyData?.passwordHash || "");
        if (!isMatch) return res.status(401).json({ error: "Invalid password" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Timestamp.fromMillis(Date.now() + 5 * 60 * 1000);

    try {
        const signupData = type === 'signup' ? {
            pendingFirstName: firstName,
            pendingLastName: lastName,
            pendingActivity: activity,
            pendingPasswordHash: await bcrypt.hash(password, 10)
        } : {};

        await FirestoreRepo.db().collection('otp_sessions').doc(phoneNumber).set({
            otp, type, ...signupData, expiresAt
        });

        const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
        const message = `[Fiko Connect] Votre code de vérification est : ${otp}. Valide pendant 5 minutes.`;

        const sent = await WABAService.sendMessage(SYSTEM_COMPANY_ID, cleanPhone, message);

        console.log(`[AUTH] OTP for ${phoneNumber}: ${otp} (Sent via WABA: ${sent})`);
        res.json({ success: true, delivered: sent });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post("/verify-otp", async (req, res) => {
    const { phoneNumber, otp } = req.body;
    const snap = await FirestoreRepo.db().collection('otp_sessions').doc(phoneNumber).get();
    const data = snap.data();

    if (!data) return res.status(401).json({ error: "No active session" });
    if (data.expiresAt.toMillis() < Date.now()) return res.status(401).json({ error: "OTP Expired" });

    if (data.otp === otp) {
        const companyId = `fiko_org_${phoneNumber.replace(/[^0-9]/g, '')}`;
        if (data.type === 'signup') {
            await FirestoreRepo.db().collection('companies').doc(companyId).set({
                id: companyId,
                whatsappNumber: phoneNumber,
                firstName: data.pendingFirstName,
                lastName: data.pendingLastName,
                industry: data.pendingActivity,
                passwordHash: data.pendingPasswordHash,
                createdAt: FieldValue.serverTimestamp(),
                status: 'active'
            }, { merge: true });

            await FirestoreRepo.db().collection('subscriptions').doc(companyId).set({
                plan: 'premium',
                trialActive: true,
                trialExpiresAt: Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000),
                messagesSent: 0,
                maxMessages: 10000
            }, { merge: true });
        }

        const token = await getAuth().createCustomToken(companyId);
        res.json({ success: true, companyId, token });
    } else {
        res.status(401).json({ error: "Invalid OTP" });
    }
});

export default router;
