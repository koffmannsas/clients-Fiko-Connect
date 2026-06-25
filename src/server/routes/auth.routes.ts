import express from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { FirestoreRepo } from '../repositories/firestore.repo';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const router = express.Router();

router.post("/send-otp", async (req, res) => {
    const { phoneNumber, type, password, firstName, lastName, activity } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const signupData = type === 'signup' ? { pendingFirstName: firstName, pendingLastName: lastName, pendingActivity: activity, pendingPasswordHash: await bcrypt.hash(password, 10) } : {};
    await FirestoreRepo.db().collection('otp_sessions').doc(phoneNumber).set({ otp, type, ...signupData, expiresAt: Timestamp.fromMillis(Date.now() + 5 * 60 * 1000) });
    console.log(`[AUTH] OTP for ${phoneNumber}: ${otp}`);
    res.json({ success: true });
});

router.post("/verify-otp", async (req, res) => {
    const { phoneNumber, otp } = req.body;
    const snap = await FirestoreRepo.db().collection('otp_sessions').doc(phoneNumber).get();
    const data = snap.data();
    if (data?.otp === otp) {
        const companyId = `fiko_org_${phoneNumber.replace(/[^0-9]/g, '')}`;
        if (data.type === 'signup') {
            await FirestoreRepo.db().collection('companies').doc(companyId).set({ id: companyId, whatsappNumber: phoneNumber, firstName: data.pendingFirstName, lastName: data.pendingLastName, industry: data.pendingActivity, passwordHash: data.pendingPasswordHash, createdAt: FieldValue.serverTimestamp(), status: 'active' }, { merge: true });
            await FirestoreRepo.db().collection('subscriptions').doc(companyId).set({ plan: 'premium', trialActive: true, trialExpiresAt: Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000), messagesSent: 0, maxMessages: 10000 }, { merge: true });
        }
        const token = await getAuth().createCustomToken(companyId);
        res.json({ success: true, companyId, token });
    } else { res.status(401).json({ error: "Invalid OTP" }); }
});

export default router;
