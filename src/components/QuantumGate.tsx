import { useState, useMemo } from 'react';
import { 
  ChevronRight, 
  Loader2,
  Eye,
  EyeOff,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthService } from '../services/auth.service';
import { Country } from '../config/countries';
import { PhoneService } from '../services/phone.service';
import CountrySelector from './CountrySelector';

type Flow = 'login' | 'signup' | 'idle';
type SignupStep = 'welcome' | 'country' | 'phone' | 'identity' | 'activity' | 'security' | 'otp';
type LoginStep = 'credentials' | 'otp';

export default function QuantumGate({ onEnter }: { onEnter: (data: any, isDemo: boolean) => void }) {
  const [flow, setFlow] = useState<Flow>('idle');
  const [signupStep, setSignupStep] = useState<SignupStep>('welcome');
  const [loginStep, setLoginStep] = useState<LoginStep>('credentials');

  const [country, setCountry] = useState<Country | null>(null);
  const [searchCountry, setSearchCountry] = useState('');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [activity, setActivity] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const industries = [
    "Immobilier", "Automobile", "Assurance", "Banque", "Formation",
    "Coaching", "Santé", "Beauté", "Restaurant", "E-commerce",
    "BTP", "Industrie", "Tourisme", "Services", "Autre"
  ];

  const handleSignupActivation = async () => {
    if (password !== confirmPassword) return setError('Les mots de passe ne correspondent pas');
    setLoading(true);
    const normalized = PhoneService.normalizePhoneNumber(phone, country?.dialCode || '');
    const ok = await AuthService.sendOTP(normalized, {
        type: 'signup',
        firstName,
        lastName,
        activity,
        password
    });
    if (ok) setSignupStep('otp');
    else setError('Erreur d’activation');
    setLoading(false);
  };

  const handleLoginSubmit = async () => {
    setLoading(true);
    const ok = await AuthService.sendOTP(phone, { type: 'login', password });
    if (ok) setLoginStep('otp');
    else setError('Identifiants invalides');
    setLoading(false);
  };

  const handleVerify = async () => {
    setLoading(true);
    const res = await AuthService.verifyOTP(phone, otp);
    if (res?.success) onEnter(res, false);
    else setError('Code OTP invalide');
    setLoading(false);
  };

  const StepWrapper = ({ children, title, subtitle, onBack }: any) => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8 w-full max-w-sm"
    >
      <div className="space-y-2">
        {onBack && (
            <button onClick={onBack} className="text-gray-500 hover:text-white flex items-center gap-2 text-xs font-black uppercase tracking-widest mb-4">
                <ChevronLeft size={14} /> Retour
            </button>
        )}
        <h3 className="text-3xl font-black tracking-tighter leading-tight">{title}</h3>
        <p className="text-gray-500 text-sm font-medium">{subtitle}</p>
      </div>
      {children}
    </motion.div>
  );

  return (
    <div className="h-screen bg-black text-white flex items-center justify-center p-6 font-sans overflow-hidden">
      <div className="absolute top-10 left-10">
        <h2 className="text-2xl font-black tracking-tighter italic">FIKO<span className="text-[#E10600]">.</span></h2>
      </div>

      <AnimatePresence mode="wait">
        {flow === 'idle' && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center space-y-12">
            <div className="space-y-4">
                <h1 className="text-6xl font-black tracking-tighter italic leading-none">VENDRE.<br/>AUTREMENT.</h1>
                <p className="text-gray-500 font-medium tracking-tight">L'infrastructure de vente IA n°1 en Afrique.</p>
            </div>
            <div className="flex flex-col gap-4 w-64 mx-auto">
                <button onClick={() => { setFlow('signup'); setSignupStep('welcome'); }} className="bg-[#E10600] py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-all shadow-[0_0_30px_rgba(225,6,0,0.2)]">Ouvrir un compte</button>
                <button onClick={() => setFlow('login')} className="bg-zinc-900 border border-zinc-800 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all">Se connecter</button>
            </div>
          </motion.div>
        )}

        {flow === 'signup' && (
          <div className="flex flex-col items-center w-full">
            {signupStep === 'welcome' && (
                <StepWrapper key="s1" title="Prêt pour le futur ?" subtitle="Activez votre commercial IA en quelques étapes immersives.">
                    <button onClick={() => setSignupStep('country')} className="w-full bg-[#E10600] py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 group">
                        Commencer <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </StepWrapper>
            )}

            {signupStep === 'country' && (
                <StepWrapper key="s2" title="Où opérez-vous ?" subtitle="Sélectionnez votre pays d'activité principal." onBack={() => setSignupStep('welcome')}>
                    <CountrySelector
                        search={searchCountry}
                        onSearchChange={setSearchCountry}
                        onSelect={(c) => { setCountry(c); setSignupStep('phone'); }}
                    />
                </StepWrapper>
            )}

            {signupStep === 'phone' && (
                <StepWrapper key="s3" title="Votre WhatsApp Business" subtitle="Le numéro que Fiko utilisera pour vendre." onBack={() => setSignupStep('country')}>
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl text-gray-400 font-mono flex items-center gap-2">
                                {country?.flag} {country?.dialCode}
                            </div>
                            <input
                                type="tel"
                                placeholder="05 00 00 00 00"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="flex-1 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl text-white outline-none focus:border-[#E10600] font-mono"
                            />
                        </div>
                        <button
                            disabled={!phone}
                            onClick={() => setSignupStep('identity')}
                            className="w-full bg-[#E10600] py-5 rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-50"
                        >
                            Continuer
                        </button>
                    </div>
                </StepWrapper>
            )}

            {signupStep === 'identity' && (
                <StepWrapper key="s4" title="Qui êtes-vous ?" subtitle="L'identité derrière ce projet commercial." onBack={() => setSignupStep('phone')}>
                    <div className="space-y-4">
                        <input
                            placeholder="Votre Prénom"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl text-white outline-none focus:border-[#E10600]"
                        />
                        <input
                            placeholder="Votre Nom"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl text-white outline-none focus:border-[#E10600]"
                        />
                        <button
                            disabled={!firstName || !lastName}
                            onClick={() => setSignupStep('activity')}
                            className="w-full bg-[#E10600] py-5 rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-50"
                        >
                            Continuer
                        </button>
                    </div>
                </StepWrapper>
            )}

            {signupStep === 'activity' && (
                <StepWrapper key="s5" title="Votre Secteur" subtitle="Fiko adaptera son langage à votre métier." onBack={() => setSignupStep('identity')}>
                    <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                        {industries.map(ind => (
                            <button
                                key={ind}
                                onClick={() => { setActivity(ind); setSignupStep('security'); }}
                                className={`p-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                                    activity === ind ? 'bg-[#E10600] border-[#E10600]' : 'bg-zinc-900 border-zinc-800 hover:border-gray-600'
                                }`}
                            >
                                {ind}
                            </button>
                        ))}
                    </div>
                </StepWrapper>
            )}

            {signupStep === 'security' && (
                <StepWrapper key="s6" title="Sécurisez l'accès" subtitle="Définissez un mot de passe robuste." onBack={() => setSignupStep('activity')}>
                    <div className="space-y-4">
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Mot de passe"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl text-white outline-none focus:border-[#E10600]"
                            />
                            <button
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-4 text-gray-500 hover:text-white"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <input
                            type="password"
                            placeholder="Confirmer le mot de passe"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl text-white outline-none focus:border-[#E10600]"
                        />
                        {error && <p className="text-red-500 text-[10px] font-black uppercase">{error}</p>}
                        <button
                            disabled={loading || !password || password !== confirmPassword}
                            onClick={handleSignupActivation}
                            className="w-full bg-[#E10600] py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={16} /> : "Activer mon compte Fiko"}
                        </button>
                    </div>
                </StepWrapper>
            )}

            {signupStep === 'otp' && (
                <StepWrapper key="s7" title="Vérification" subtitle="Entrez le code envoyé sur votre WhatsApp.">
                    <div className="space-y-6">
                        <input
                            type="text"
                            maxLength={6}
                            placeholder="000000"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 p-6 text-center text-3xl tracking-[0.5em] font-black rounded-3xl text-white outline-none focus:border-[#E10600]"
                        />
                        {error && <p className="text-red-500 text-[10px] font-black uppercase text-center">{error}</p>}
                        <button
                            onClick={handleVerify}
                            disabled={loading || otp.length < 6}
                            className="w-full bg-[#E10600] py-5 rounded-2xl font-black text-xs uppercase hover:bg-red-700 transition flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={16} /> : "Vérifier & Entrer 🔒"}
                        </button>
                        <button onClick={() => setSignupStep('security')} className="w-full text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition">Modifier le numéro</button>
                    </div>
                </StepWrapper>
            )}
          </div>
        )}

        {flow === 'login' && (
            <div className="flex flex-col items-center w-full">
                {loginStep === 'credentials' && (
                    <StepWrapper key="l1" title="Bon retour." subtitle="Accédez à votre centre de commandement." onBack={() => setFlow('idle')}>
                        <div className="space-y-4">
                            <input
                                placeholder="Numéro WhatsApp"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl text-white outline-none focus:border-[#E10600] font-mono"
                            />
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Mot de passe"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl text-white outline-none focus:border-[#E10600]"
                                />
                                <button onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-gray-500">
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <button onClick={handleLoginSubmit} disabled={loading} className="w-full bg-[#E10600] py-5 rounded-2xl font-black text-xs uppercase tracking-widest">Suivant</button>
                        </div>
                    </StepWrapper>
                )}
                {loginStep === 'otp' && (
                    <StepWrapper key="l2" title="Double Sécurité" subtitle="Entrez le code OTP reçu.">
                        <div className="space-y-6">
                            <input
                                type="text" maxLength={6} placeholder="000000" value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 p-6 text-center text-3xl tracking-[0.5em] font-black rounded-3xl text-white outline-none focus:border-[#E10600]"
                            />
                            <button onClick={handleVerify} disabled={loading} className="w-full bg-[#E10600] py-5 rounded-2xl font-black text-xs uppercase tracking-widest">Connecter</button>
                        </div>
                    </StepWrapper>
                )}
            </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #E10600; }
      `}</style>
    </div>
  );
}
