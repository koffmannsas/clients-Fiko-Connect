import { useState, useEffect } from 'react';
import { 
  Rocket,
  Zap,
  ChevronRight, 
  Lock,
  Loader2,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthService } from '../services/auth.service';

export default function QuantumGate({ onEnter }: { onEnter: (data: any, isDemo: boolean) => void }) {
  const [step, setStep] = useState<'intro' | 'phone' | 'otp' | 'org'>('intro');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOTP = async () => {
    if (!phone) return setError('Numéro requis');
    setLoading(true);
    const ok = await AuthService.sendOTP(phone);
    if (ok) {
        setStep('otp');
    } else {
        setError('Erreur lors de l’envoi');
    }
    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (!otp) return;
    setLoading(true);
    const result = await AuthService.verifyOTP(phone, otp);
    if (result?.success) {
        onEnter({ companyId: result.companyId, connectedNumber: phone }, false);
    } else {
        setError('OTP Invalide');
    }
    setLoading(false);
  };

  const handleDemo = () => {
    onEnter({ companyId: 'fiko_prod_68469', connectedNumber: '+225 05 92 84 77 15' }, true);
  };

  return (
    <div className="h-screen bg-black text-white flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full space-y-8 text-center">
        <h2 className="text-4xl font-black tracking-tighter">FIKO<span className="text-[#E10600]">.</span></h2>

        <AnimatePresence mode="wait">
          {step === 'intro' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="space-y-2">
                    <h3 className="text-xl font-bold">L'infrastructure de vente IA pour l'Afrique.</h3>
                    <p className="text-gray-500 text-sm">Activez votre organisation et commencez à closer sur WhatsApp.</p>
                </div>
                <div className="space-y-3">
                    <button onClick={() => setStep('phone')} className="w-full bg-[#E10600] py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition">🚀 Activer mon entreprise</button>
                    <button onClick={handleDemo} className="w-full bg-zinc-900 border border-zinc-800 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-zinc-400 hover:text-white transition">⚡ Mode Démo</button>
                </div>
            </motion.div>
          )}

          {step === 'phone' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6 text-left">
                <div className="space-y-2">
                    <h3 className="text-xl font-bold">Votre numéro WhatsApp</h3>
                    <p className="text-gray-500 text-sm">Nous allons vous envoyer un code de validation.</p>
                </div>
                <div className="space-y-4">
                    <div className="relative">
                        <Smartphone className="absolute left-4 top-4 text-gray-500" size={18} />
                        <input
                            type="text"
                            placeholder="+225 07 00 00 00 00"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 p-4 pl-12 rounded-2xl text-white outline-none focus:border-[#E10600]"
                        />
                    </div>
                    {error && <p className="text-red-500 text-[10px] font-bold uppercase">{error}</p>}
                    <button 
                        onClick={handleSendOTP}
                        disabled={loading}
                        className="w-full bg-[#E10600] py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={16} /> : "Continuer ➡️"}
                    </button>
                </div>
            </motion.div>
          )}

          {step === 'otp' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6 text-left">
                <div className="space-y-2">
                    <h3 className="text-xl font-bold">Validation OTP</h3>
                    <p className="text-gray-500 text-sm">Saisissez le code à 6 chiffres reçu sur WhatsApp.</p>
                </div>
                <div className="space-y-4">
                    <input
                        type="text"
                        maxLength={6}
                        placeholder="000000"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 p-4 text-center text-2xl tracking-[1em] font-black rounded-2xl text-white outline-none focus:border-[#E10600]"
                    />
                    {error && <p className="text-red-500 text-[10px] font-bold uppercase">{error}</p>}
                    <button
                        onClick={handleVerifyOTP}
                        disabled={loading || otp.length < 6}
                        className="w-full bg-[#E10600] py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={16} /> : "Valider 🔒"}
                    </button>
                </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
