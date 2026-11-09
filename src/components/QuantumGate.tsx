import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect, FormEvent } from 'react';
import { 
  auth, 
  db 
} from '../lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc
} from 'firebase/firestore';
import { 
  ChevronRight, 
  Loader2, 
  Globe, 
  ShieldCheck, 
  Cpu, 
  MessageSquare, 
  CreditCard, 
  LineChart, 
  Zap, 
  Rocket, 
  Brain, 
  Sparkles,
  Check,
  ShieldAlert,
  Building2,
  Lock,
  CheckCircle2,
  Crown
} from 'lucide-react';
import { PLAN_CONFIGS, PlanTier, SubscriptionStatus } from '../services/subscription.service';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface QuantumGateProps {
  onEnter: (onboardingData: any, isDemoMode: boolean) => void;
}

export default function QuantumGate({ onEnter }: QuantumGateProps) {
  // 1. Auth & Session tracking
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userCompanyId, setUserCompanyId] = useState<string>('');
  const [authLoading, setAuthLoading] = useState(true);

  // 2. Identity layer views
  const [identityOpen, setIdentityOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Login Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // 3. --- FIKO FREE ACTIVATION EXPERIENCE (10-STEP ONBOARDING) ---
  const [onboardActive, setOnboardActive] = useState(false);
  const [onboardStep, setOnboardStep] = useState(1);
  const [companyName, setCompanyName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [onboardPassword, setOnboardPassword] = useState('');

  // OTP Verification State
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  // Paywall & Plans Modal
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>('pro');

  // WhatsApp connection steps
  const [whatsappConnectMode, setWhatsappConnectMode] = useState<'idle' | 'linking' | 'connected'>('idle');
  const [firstMessageProgress, setFirstMessageProgress] = useState<'idle' | 'sending' | 'success'>('idle');

  // Auth sync
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  // Check if current user already has a company & subscription status in Firestore
  const checkUserCompanyAndEnter = async (uid: string) => {
    try {
      console.log('AUTH SUCCESS, checking user doc for uid:', uid);
      const userDocRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userDocRef);
      
      if (!userSnap.exists()) {
        setIdentityOpen(false);
        setOnboardActive(true);
        setOnboardStep(1);
        return;
      }

      const userData = userSnap.data();
      const companyId = userData.companyId;

      if (companyId) {
        setUserCompanyId(companyId);
      } else {
         setIdentityOpen(false);
         setOnboardActive(true);
         setOnboardStep(1);
         return;
      }

      // Check Subscription Server-Side Status
      const subRef = doc(db, 'subscriptions', companyId);
      const subSnap = await getDoc(subRef);
      if (subSnap.exists()) {
        const subData = subSnap.data();
        const trialEndsAt = subData.trialEndsAt ? new Date(subData.trialEndsAt).getTime() : 0;
        if (subData.status === 'EXPIRED' || (subData.plan === 'starter' && trialEndsAt > 0 && Date.now() > trialEndsAt)) {
          setPaywallOpen(true);
          return;
        }
      }

      // Check Company
      const companyDocRef = doc(db, 'companies', companyId);
      const companySnap = await getDoc(companyDocRef);
      let companyData = companySnap.exists() ? companySnap.data() : null;

      if (!companySnap.exists()) {
        companyData = {
          id: companyId,
          name: userData.displayName || 'Enterprise',
          ownerId: uid,
          status: 'active',
          plan: 'starter',
          createdAt: new Date().toISOString()
        };
        await setDoc(companyDocRef, companyData);
      }

      setIdentityOpen(false);
      onEnter({
        companyName: companyData?.name || 'Fiko Enterprise',
        selectedPlan: 'starter',
        contactsCaptured: 1,
        conversationsProcessed: 1,
        estimatedRevenue: 25000,
      }, false);
      
    } catch (err: any) {
      console.error('Error in checkUserCompanyAndEnter:', err);
      handleFirestoreError(err, OperationType.GET, `users/${uid}`);
    }
  };

  const requestLiveOtp = async (): Promise<boolean> => {
    setOtpLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: whatsappNumber.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Impossible d\'envoyer l\'OTP');
      setOtpSent(true);
      return true;
    } catch (e: any) {
      setErrorMessage(e.message || 'Erreur d\'envoi OTP');
      return false;
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyLiveOtp = async () => {
    setOtpLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: whatsappNumber.trim(), otp: otpCode.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Code OTP non valide');

      executeAutomaticDeployment();
    } catch (e: any) {
      setErrorMessage(e.message || 'Code OTP incorrect');
    } finally {
      setOtpLoading(false);
    }
  };

  // Trigger Fiko Core Activation Choice from Quantum Cards
  const handleActivationCardClick = async () => {
    setErrorMessage('');
    if (authLoading) return;

    if (!currentUser) {
      setOnboardActive(true);
      setOnboardStep(1);
    } else {
      setLoading(true);
      await checkUserCompanyAndEnter(currentUser.uid);
      setLoading(false);
    }
  };

  const handleDemoClick = () => {
    setErrorMessage('');
    setOnboardActive(true);
    setOnboardStep(1);
  };

  const executeAutomaticDeployment = async () => {
    setErrorMessage('');
    if (!companyName.trim()) {
      setErrorMessage("Veuillez renseigner le nom de l'entreprise.");
      setOnboardStep(1);
      return;
    }
    if (!whatsappNumber.trim()) {
      setErrorMessage("Veuillez renseigner le numéro WhatsApp.");
      setOnboardStep(2);
      return;
    }

    setLoading(true);
    try {
      setOnboardStep(5);
      const userCredential = await createUserWithEmailAndPassword(auth, emailAddress.trim().toLowerCase(), onboardPassword);
      const uid = userCredential.user.uid;
      const companyId = 'co_' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').substring(0, 12) : Math.random().toString(36).substr(2, 9));
      await new Promise(resolve => setTimeout(resolve, 1000));

      setOnboardStep(6);
      const userRef = doc(db, 'users', uid);
      const userPayload = {
        uid,
        displayName: companyName.trim(),
        email: emailAddress.trim().toLowerCase(),
        phoneNumber: whatsappNumber.trim(),
        companyId,
        role: 'user',
        status: 'active',
        createdAt: new Date().toISOString()
      };
      await setDoc(userRef, userPayload);

      const companyRef = doc(db, 'companies', companyId);
      const companyPayload = {
        id: companyId,
        name: companyName.trim(),
        industry: 'Prestations de Service',
        country: 'CI',
        whatsappNumber: whatsappNumber.trim(),
        phoneNumberId: whatsappNumber.trim().replace(/[^0-9]/g, ""),
        ownerId: uid,
        createdAt: new Date().toISOString()
      };
      await setDoc(companyRef, companyPayload);

      // Step 7: Create 7-day Trial Subscription
      setOnboardStep(7);
      const subscriptionRef = doc(db, 'subscriptions', companyId);
      const now = new Date();
      const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const subscriptionPayload = {
        companyId,
        plan: 'starter',
        status: 'TRIAL',
        trialStartedAt: now.toISOString(),
        trialEndsAt,
        maxContacts: 10,
        createdAt: now.toISOString()
      };
      await setDoc(subscriptionRef, subscriptionPayload);

      // Step 8: Deploy Agent & Knowledge Base
      setOnboardStep(8);
      const memoryRef = doc(db, 'fiko_memory', companyId);
      await setDoc(memoryRef, {
        companyId,
        messagesProcessedCount: 0,
        cognitiveTokensCount: 2500,
        updatedAt: new Date().toISOString()
      });

      const agentRef = doc(db, 'agents', companyId);
      await setDoc(agentRef, {
        id: companyId,
        companyId,
        name: `Fiko Agent ${companyName.trim()}`,
        status: 'online',
        autoPilot: true,
        createdAt: new Date().toISOString()
      });

      setOnboardStep(9);
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur lors de la configuration du compte.");
      setOnboardStep(3);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!email || !password) {
      setErrorMessage("Veuillez renseigner votre email et votre mot de passe.");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      await checkUserCompanyAndEnter(userCredential.user.uid);
    } catch (err: any) {
      setErrorMessage(err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' 
        ? "Identifiants ou mot de passe incorrects."
        : err.message || "Impossible de se connecter.");
    } finally {
      setLoading(false);
    }
  };

  const fillReviewCredentials = () => {
    setEmail('review@krypton-ia.tech');
    setPassword('MetaReview2026!');
  };

  // --- RENDER DYNAMIC 10-STEP ONBOARDING WIZARD ---
  if (onboardActive) {
    const totalSteps = 10;
    
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4 md:p-10 font-sans relative overflow-x-hidden">
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-25"
          style={{ backgroundImage: 'url("https://firebasestorage.googleapis.com/v0/b/krypton-ai-490214.firebasestorage.app/o/ba05e1c2-5730-44aa-bb43-73857f103596.png?alt=media&token=cd77592a-ea23-4e43-824d-21e388cd1b31")' }}
        />
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#050505] via-transparent to-[#050505] pointer-events-none" />

        <div className="relative z-20 w-full max-w-2xl bg-[#09090b]/90 border border-white/10 rounded-3xl p-6 md:p-10 shadow-[0_0_80px_rgba(225,6,0,0.12)] overflow-hidden backdrop-blur-md">
          
          <div className="flex items-center justify-between border-b border-white/5 pb-5 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#E10600]/15 border border-[#E10600]/30 flex items-center justify-center text-[#E10600]">
                <Sparkles size={16} />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-[#E10600]">FIKO IA ACTIVATION</h4>
                <p className="text-[10px] text-zinc-400 font-mono mt-0.5">7 JOURS GRATUITS INCLUS</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xl font-mono font-black text-white">{onboardStep > 10 ? 10 : onboardStep}</span>
              <span className="text-xs text-zinc-500 font-mono"> / {totalSteps}</span>
            </div>
          </div>

          <div className="w-full h-[3px] bg-white/5 rounded-full mb-8 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#E10600] to-red-650 transition-all duration-500" 
              style={{ width: `${Math.min((onboardStep / totalSteps) * 100, 100)}%` }}
            />
          </div>

          <div className="space-y-6">

            {/* STEP 1: Company Name */}
            {onboardStep === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-2">
                  <div className="bg-red-950/25 border border-[#E10600]/30 p-4 rounded-xl">
                    <p className="text-sm font-semibold text-zinc-200 leading-relaxed">
                      Bienvenue dans Fiko Connect. Activer votre force commerciale avec 7 jours d'essai gratuit.
                    </p>
                  </div>
                  <h3 className="text-xl font-black text-white pt-2">Comment s'appelle votre entreprise ?</h3>
                </div>

                <div className="space-y-2">
                  <input 
                    type="text"
                    required
                    placeholder="Nom de l'entreprise (Ex: Koffmann Capital Group, Boutique Sy...)"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-zinc-950/85 border border-white/10 p-4 rounded-xl text-white font-bold placeholder-zinc-650 focus:border-[#E10600] focus:outline-none transition-colors text-base"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && companyName.trim()) setOnboardStep(2);
                    }}
                  />
                </div>

                <button
                  type="button"
                  disabled={!companyName.trim()}
                  onClick={() => setOnboardStep(2)}
                  className="w-full bg-[#E10600] disabled:opacity-45 text-white py-4 rounded-xl font-black text-xs tracking-wider uppercase hover:bg-red-700 transition flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_20px_rgba(225,6,0,0.25)]"
                >
                  Continuer vers l'étape suivante <ChevronRight size={14} />
                </button>
              </div>
            )}

            {/* STEP 2: WhatsApp Number */}
            {onboardStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-white">Quel est le numéro commercial WhatsApp ?</h3>
                  <p className="text-xs text-zinc-400">Format international obligatoire (+225XXXXXXXXXX).</p>
                </div>

                <div className="space-y-2">
                  <input 
                    type="text"
                    placeholder="Ex: +2250748931120"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="w-full bg-zinc-950/85 border border-white/10 p-4 rounded-xl text-white font-mono font-bold placeholder-zinc-650 focus:border-[#E10600] focus:outline-none transition-colors text-base"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setOnboardStep(1)}
                    className="px-6 bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-zinc-400 rounded-xl font-black text-xs uppercase transition"
                  >
                    Retour
                  </button>
                  <button
                    type="button"
                    disabled={!whatsappNumber.trim()}
                    onClick={() => {
                      if (!emailAddress) {
                        setEmailAddress(whatsappNumber.replace(/[^0-9]/g, "") + '@fiko.io');
                      }
                      setOnboardStep(3);
                    }}
                    className="flex-1 bg-[#E10600] disabled:opacity-45 text-white py-4 rounded-xl font-black text-xs tracking-wider uppercase hover:bg-red-700 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Saisir mes identifiants <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Password and Email */}
            {onboardStep === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-white">Saisissez vos identifiants de connexion</h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Email</label>
                    <input 
                      type="email"
                      placeholder="votre-email@adresse.com"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      className="w-full bg-zinc-950/85 border border-white/10 p-3.5 rounded-xl text-white font-bold placeholder-zinc-650 focus:border-[#E10600] focus:outline-none transition-colors text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Mot de passe (min 6 caractères)</label>
                    <input 
                      type="password"
                      placeholder="••••••••"
                      value={onboardPassword}
                      onChange={(e) => setOnboardPassword(e.target.value)}
                      className="w-full bg-zinc-950/85 border border-white/10 p-3.5 rounded-xl text-white font-bold placeholder-zinc-650 focus:border-[#E10600] focus:outline-none transition-colors text-sm"
                    />
                  </div>
                </div>

                {errorMessage && (
                  <div className="bg-red-950/40 border border-red-900/60 text-red-500 p-3 rounded-xl text-xs font-semibold leading-relaxed flex items-start gap-2">
                    <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setOnboardStep(2)}
                    className="px-6 bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-zinc-400 rounded-xl font-black text-xs uppercase transition"
                  >
                    Retour
                  </button>
                  <button
                    type="button"
                    disabled={!emailAddress.trim() || onboardPassword.length < 6 || otpLoading}
                    onClick={async () => {
                      const success = await requestLiveOtp();
                      if (success) {
                        setOnboardStep(4);
                      }
                    }}
                    className="flex-1 bg-[#E10600] disabled:opacity-45 text-white py-4 rounded-xl font-black text-xs tracking-wider uppercase hover:bg-red-700 transition flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_20px_rgba(225,6,0,0.25)]"
                  >
                    {otpLoading ? <Loader2 size={16} className="animate-spin" /> : "Envoyer le code WhatsApp OTP"} <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Live WhatsApp OTP Verification */}
            {onboardStep === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono text-[#25D366] bg-emerald-950/20 border border-emerald-900/50 px-3 py-1.5 rounded-lg w-fit">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>WHATSAPP OTP ENVOYÉ SUR {whatsappNumber}</span>
                  </div>
                  <h3 className="text-xl font-black text-white pt-2">Vérification du numéro WhatsApp</h3>
                  <p className="text-xs text-zinc-400">
                    Saisissez le code à 6 chiffres transmis sur votre WhatsApp.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <input 
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                    className="w-full bg-zinc-950/85 border border-white/10 p-4 rounded-xl text-center text-2xl font-mono font-black text-white tracking-widest placeholder-zinc-750 focus:border-[#E10600] focus:outline-none transition-colors"
                  />
                </div>

                {errorMessage && (
                  <div className="bg-red-950/40 border border-red-900/60 text-red-500 p-3 rounded-xl text-xs font-semibold leading-relaxed flex items-start gap-2">
                    <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setOnboardStep(3)}
                    className="px-6 bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-zinc-400 rounded-xl font-black text-xs uppercase transition"
                  >
                    Retour
                  </button>
                  <button
                    type="button"
                    disabled={otpCode.length < 4 || otpLoading}
                    onClick={verifyLiveOtp}
                    className="flex-1 bg-[#E10600] disabled:opacity-45 text-white py-4 rounded-xl font-black text-xs tracking-wider uppercase hover:bg-red-700 transition flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_20px_rgba(225,6,0,0.25)]"
                  >
                    {otpLoading ? <Loader2 size={16} className="animate-spin" /> : "Vérifier & Activer mes 7 jours gratuits"} <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: Create Firebase Account */}
            {onboardStep === 5 && (
              <div className="space-y-8 py-6 text-center animate-in fade-in duration-500">
                <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                  <Loader2 className="animate-spin text-[#E10600]" size={36} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-white">Création du compte sécurisé</h3>
                </div>
              </div>
            )}

            {/* STEP 6: Create Company */}
            {onboardStep === 6 && (
              <div className="space-y-8 py-6 text-center animate-in fade-in duration-500">
                <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                  <Building2 className="text-[#E10600] animate-pulse" size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-white">Enregistrement de l'entreprise</h3>
                </div>
              </div>
            )}

            {/* STEP 7: Create Trial Subscription */}
            {onboardStep === 7 && (
              <div className="space-y-8 py-6 text-center animate-in fade-in duration-500">
                <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                  <CreditCard className="text-[#E10600] animate-bounce" size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-white">Activation de l'essai gratuit 7 jours</h3>
                </div>
              </div>
            )}

            {/* STEP 8: Deploy Fiko AI Agent & Memory */}
            {onboardStep === 8 && (
              <div className="space-y-8 py-6 text-center animate-in fade-in duration-500">
                <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                  <Brain className="text-[#E10600] animate-pulse" size={36} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-white">Configuration de Fiko Intelligence</h3>
                </div>
              </div>
            )}

            {/* STEP 9: Connect WhatsApp */}
            {onboardStep === 9 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-white">Liez votre application WhatsApp</h3>
                  <p className="text-xs text-zinc-400">
                    Ouvrez WhatsApp {'>'} Appareils connectés {'>'} Lier un appareil.
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center bg-zinc-950/90 border border-white/5 p-6 rounded-2xl relative overflow-hidden">
                  {whatsappConnectMode === 'connected' ? (
                    <div className="h-48 flex flex-col items-center justify-center text-center space-y-3">
                      <div className="w-16 h-16 rounded-full bg-emerald-950/50 border border-emerald-900 flex items-center justify-center text-[#25D366]">
                        <Check size={28} className="stroke-[3px]" />
                      </div>
                      <p className="text-sm font-black text-white">WhatsApp connecté avec succès !</p>
                    </div>
                  ) : (
                    <div className="space-y-4 text-center">
                      <button 
                        type="button"
                        onClick={() => {
                          setWhatsappConnectMode('linking');
                          setTimeout(() => setWhatsappConnectMode('connected'), 1500);
                        }}
                        className="bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-[#25D366] text-xs px-4 py-2 rounded-full font-black uppercase tracking-wider transition inline-flex items-center gap-1.5"
                      >
                        Simuler la liaison QR Code
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={whatsappConnectMode !== 'connected'}
                    onClick={() => setOnboardStep(10)}
                    className="flex-1 bg-[#E10600] disabled:opacity-45 text-white py-4 rounded-xl font-black text-xs tracking-wider uppercase hover:bg-red-700 transition flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_20px_rgba(225,6,0,0.25)]"
                  >
                    Envoyer le message d'accueil <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 10: Send first automatic live WhatsApp message */}
            {onboardStep === 10 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-white">Premier Message Envoyé</h3>
                </div>

                <div className="bg-[#0b0c10] border border-zinc-900 p-4 rounded-2xl">
                  <p className="text-xs text-zinc-300 whitespace-pre-line">
                    Bonjour 👋 Je suis Fiko, votre force commerciale IA. Votre essai gratuit de 7 jours est maintenant actif pour "{companyName}".
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setOnboardActive(false);
                    onEnter({
                      companyName: companyName || 'Fiko Enterprise',
                      selectedPlan: 'starter',
                      contactsCaptured: 1,
                      conversationsProcessed: 1,
                      estimatedRevenue: 35000,
                    }, false);
                  }}
                  className="w-full bg-[#E10600] hover:bg-red-700 text-white py-4 rounded-xl font-black text-xs tracking-wider uppercase transition flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_25px_rgba(225,6,0,0.3)]"
                >
                  ACCÉDER À MON DASHBOARD FIKO <Rocket size={14} />
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col lg:flex-row overflow-x-hidden font-sans relative">
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000"
        style={{ backgroundImage: 'url("https://firebasestorage.googleapis.com/v0/b/krypton-ai-490214.firebasestorage.app/o/ba05e1c2-5730-44aa-bb43-73857f103596.png?alt=media&token=cd77592a-ea23-4e43-824d-21e388cd1b31")' }}
      />
      
      <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#030303]/90 via-[#030303]/45 to-[#050505]/95 pointer-events-none" />
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#050505] via-transparent to-[#050505]/65 pointer-events-none" />

      {/* LEFT SECTION */}
      <div className="flex-1 lg:flex-[0.7] flex flex-col justify-between p-6 lg:p-10 xl:p-14 relative z-20 min-h-screen">
        
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <div className="flex flex-col select-none leading-none font-sans">
              <span className="text-[25px] font-black tracking-tighter text-[#E10600]">FIKO</span>
              <span className="text-[17px] font-extrabold tracking-[0.24em] text-white mt-1">CONNECT</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser ? (
              <div className="flex items-center gap-3 bg-zinc-900/80 border border-white/10 pl-3.5 pr-1.5 py-1.5 rounded-full text-[11px] font-bold text-zinc-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="truncate max-w-[120px]">{currentUser.email}</span>
                <button
                  onClick={async () => {
                    await signOut(auth);
                    setCurrentUser(null);
                  }}
                  className="bg-[#E10600] text-white hover:bg-red-700 px-3 py-1 rounded-full transition-all text-[10px]"
                >
                  Déconnexion
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIdentityOpen(true)}
                className="bg-white/5 border border-white/10 hover:bg-white/10 px-4 py-2 rounded-full text-xs font-bold text-zinc-200 cursor-pointer"
              >
                Espace Client 🔒
              </button>
            )}
            <div className="hidden sm:flex items-center gap-1.5 bg-black/45 border border-white/10 px-3.5 py-1.5 rounded-full text-[11px] font-bold text-zinc-300">
              <Globe size={11} className="text-[#E10600]" />
              <span>FR</span>
            </div>
          </div>
        </div>

        <div className="my-auto py-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-5xl md:text-6xl xl:text-7xl font-sans font-[900] tracking-tighter leading-none text-white max-w-xl">
                Votre entreprise.
              </h1>
              <h1 className="text-5xl md:text-6xl xl:text-7xl font-sans font-[900] tracking-tighter leading-none text-[#E10600]">
                Sans limites.
              </h1>
            </div>

            <p className="text-zinc-300 text-[15px] lg:text-[16px] leading-relaxed max-w-[530px] font-medium font-sans">
              <span className="text-white font-extrabold">FiKO Connect</span> est votre force commerciale IA autonome sur WhatsApp avec 7 jours d'essai gratuit.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3.5 max-w-xl pt-4">
              {[
                { text: "IA Avancée", icon: Brain, desc: "Analyse d'intentions" },
                { text: "Automatisation WhatsApp", icon: Cpu, desc: "Qualification & Closing" },
                { text: "WhatsApp Business Intégré", icon: MessageSquare, desc: "Accès instantané" },
                { text: "Paiements Mobile Money", icon: CreditCard, desc: "Wave, Orange, MTN" },
                { text: "Analyses & Scoring", icon: LineChart, desc: "Suivi des opportunités" },
                { text: "Croissance Commerciale", icon: Sparkles, desc: "Conversion accélérée" },
              ].map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3 p-1 rounded-lg">
                  <div className="flex-shrink-0 mt-0.5 relative">
                    <div className="w-5.5 h-5.5 rounded-full bg-[#E10600]/15 border border-[#E10600]/40 flex items-center justify-center text-[#E10600]">
                      <feature.icon size={11} className="stroke-[2.5px]" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold text-white leading-none mt-1">
                      {feature.text}
                    </h4>
                    <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">
                      {feature.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-bold bg-white/5 border border-white/5 px-3 py-1.5 rounded-full w-fit">
            <ShieldCheck size={13} className="text-[#E10600]" />
            <span>Fiko Connect OS — 7 jours d'essai gratuit</span>
          </div>
        </div>

      </div>

      {/* RIGHT COMPONENT */}
      <div className="flex-[0.3] lg:max-w-[480px] w-full bg-[#0B0B0B]/70 backdrop-blur-3xl px-6 py-10 lg:p-10 xl:p-12 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-white/5 relative z-20 shadow-[0_0_80px_rgba(3,3,3,0.8)]">

        <div className="space-y-8 my-auto">
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl border-2 border-[#E10600]/80 bg-[#0C0C0E]/95 flex items-center justify-center text-[#E10600] relative z-10 shadow-[0_0_20px_rgba(225,6,0,0.45)] mb-3">
              <Sparkles size={24} className="stroke-[2px]" />
            </div>

            <h2 className="text-xl font-black tracking-[0.22em] text-white uppercase font-sans">
              FIKO <span className="text-[#E10600]">OS GATES</span>
            </h2>
          </div>

          <div className="space-y-3.5">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleActivationCardClick}
              className="w-full p-5 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden flex items-center justify-between group bg-[#0F0F11]/85 border-white/5 hover:border-zinc-700/80 cursor-pointer"
            >
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-[#E10600] text-white flex items-center justify-center">
                  <Rocket size={20} />
                </div>
                <div>
                  <h4 className="text-[14px] font-extrabold text-white leading-tight">
                    🚀 Créer mon compte (7 jours gratuits)
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Déployer ma force commerciale WhatsApp
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-zinc-500 group-hover:text-white" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDemoClick}
              className="w-full p-5 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden flex items-center justify-between group bg-gradient-to-r from-[#E10600]/10 to-transparent border-[#E10600]/30 hover:border-[#E10600] cursor-pointer"
            >
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-zinc-800 text-white flex items-center justify-center">
                  <Zap size={20} className="text-[#E10600]" />
                </div>
                <div>
                  <h4 className="text-[14px] font-extrabold text-white leading-tight">
                    ⚡ Mode Démo Fiko
                  </h4>
                  <p className="text-[11px] text-zinc-300 mt-1">
                    Essayer Fiko sans inscription
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-[#E10600]" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* LOGIN MODAL */}
      <AnimatePresence>
        {identityOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-[#0D0D10]/95 border border-white/10 rounded-3xl p-6 lg:p-8 shadow-2xl overflow-hidden"
            >
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-[#E10600]/10 border border-[#E10600]/30 rounded-xl flex items-center justify-center text-[#E10600] mx-auto mb-3">
                  <Lock size={20} />
                </div>
                <h3 className="text-lg font-black text-white">Espace Client Fiko 🔒</h3>
              </div>

              {errorMessage && (
                <div className="bg-red-950/40 border border-red-900/60 text-red-500 p-3 rounded-xl text-xs font-semibold mb-4 leading-relaxed flex items-start gap-2">
                  <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400">Email</label>
                  <input 
                    type="email" 
                    placeholder="review@krypton-ia.tech"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 p-3.5 rounded-xl text-white text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400">Mot de passe</label>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 p-3.5 rounded-xl text-white text-sm"
                  />
                </div>

                <div className="flex justify-between items-center text-xs py-1">
                  <button 
                    type="button" 
                    onClick={fillReviewCredentials}
                    className="text-[#25D366] font-bold underline"
                  >
                    ⚡ Compte de Revue Meta
                  </button>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-[#E10600] text-white py-3.5 rounded-xl font-black text-xs tracking-wider uppercase hover:bg-red-700 transition flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : "SE CONNECTER"}
                </button>

                <div className="flex justify-between text-xs pt-2">
                  <button type="button" onClick={() => setIdentityOpen(false)} className="text-zinc-500 hover:text-white">
                    Fermer
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PAYWALL & PUBLIC PLANS MODAL */}
      <AnimatePresence>
        {paywallOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-4xl bg-[#09090b] border border-red-900/40 rounded-3xl p-6 md:p-8 my-8 shadow-2xl"
            >
              <div className="text-center space-y-3 mb-8">
                <div className="inline-flex items-center gap-2 bg-red-950/60 border border-red-800/60 text-[#E10600] px-4 py-1.5 rounded-full text-xs font-mono font-bold">
                  <ShieldAlert size={14} /> PÉRIODE D'ESSAI DE 7 JOURS EXPIRÉE
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-white">Choisissez votre formule Fiko Connect</h2>
                <p className="text-xs md:text-sm text-zinc-400 max-w-xl mx-auto">
                  Votre Fiko a appris votre activité et est prêt à continuer à transformer vos conversations WhatsApp en ventes.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {(['growth', 'pro', 'elite'] as PlanTier[]).map((tier) => {
                  const p = PLAN_CONFIGS[tier];
                  const isSelected = selectedPlan === tier;
                  const isPro = tier === 'pro';

                  return (
                    <div
                      key={tier}
                      onClick={() => setSelectedPlan(tier)}
                      className={`relative p-5 rounded-2xl border cursor-pointer transition-all ${isSelected ? 'bg-zinc-900 border-[#E10600] shadow-[0_0_25px_rgba(225,6,0,0.2)]' : 'bg-zinc-950/80 border-white/10 hover:border-zinc-700'}`}
                    >
                      {isPro && (
                        <div className="absolute -top-3 right-4 bg-[#E10600] text-white text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                          <Crown size={10} /> ⭐ RECOMMANDÉ
                        </div>
                      )}

                      <h3 className="text-lg font-extrabold text-white">{p.name}</h3>
                      <p className="text-xs text-zinc-400 mt-1 min-h-[36px]">{p.description}</p>

                      <div className="my-4 font-mono">
                        <span className="text-2xl font-black text-white">{p.priceFCFA.toLocaleString()}</span>
                        <span className="text-xs text-zinc-500"> FCFA/mois</span>
                      </div>

                      <ul className="space-y-2 text-xs text-zinc-300">
                        {p.features.map((f, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <CheckCircle2 size={13} className="text-[#25D366] shrink-0" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border-t border-white/5 pt-6">
                <button
                  type="button"
                  onClick={() => setPaywallOpen(false)}
                  className="text-xs text-zinc-500 hover:text-white font-bold cursor-pointer"
                >
                  Fermer la fenêtre
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (!userCompanyId && !currentUser?.uid) {
                      setErrorMessage("Erreur d'espace entreprise: Veuillez vous réauthentifier.");
                      return;
                    }
                    setLoading(true);
                    try {
                      const targetCompanyId = userCompanyId || `co_${currentUser.uid}`;
                    const token = currentUser ? await currentUser.getIdToken() : '';
                      const res = await fetch('/api/subscription/checkout', {
                        method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                      },
                        body: JSON.stringify({ companyId: targetCompanyId, plan: selectedPlan })
                      });
                      const data = await res.json();
                      if (data.success) {
                        setPaywallOpen(false);
                        onEnter({
                          companyName: 'Fiko Enterprise',
                          selectedPlan,
                          contactsCaptured: 10,
                          conversationsProcessed: 50,
                          estimatedRevenue: PLAN_CONFIGS[selectedPlan].priceFCFA * 3
                        }, false);
                      }
                    } catch (err) {
                      console.error('Checkout Error:', err);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="w-full sm:w-auto bg-[#E10600] hover:bg-red-700 text-white px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : `🔥 ACTIVER ${PLAN_CONFIGS[selectedPlan].name.toUpperCase()}`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
