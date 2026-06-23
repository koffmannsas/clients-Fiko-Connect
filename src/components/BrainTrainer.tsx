import { useState, useEffect, useRef } from 'react';
import {
  BrainCircuit,
  Send,
  Sparkles,
  Target,
  ShieldCheck,
  Zap,
  Lightbulb,
  BookOpen,
  Loader2,
  FileText,
  Mic,
  Package,
  CreditCard,
  AlertOctagon,
  Users,
  Music
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BrainTrainer({ onboardingData }: { onboardingData: any }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(15);
  const [stats, setStats] = useState<any>({ products: 0, pricing: 0, objections: 0 });
  const scrollRef = useRef<HTMLDivElement>(null);
  const companyId = onboardingData?.companyId;

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, message: input })
      });
      const data = await res.json();

      setMessages(prev => [...prev, { role: 'fiko', content: data.response }]);
      if (data.newScore) setScore(data.newScore);

      if (data.category) {
          setStats((prev: any) => ({
              ...prev,
              [data.category]: (prev[data.category] || 0) + 1
          }));
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'fiko', content: "Erreur de synchronisation ADN." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceUpload = () => {
      alert("Fiko Voice Trainer™ : Prêt à transcrire vos appels et notes vocales. (V3.2 active)");
  };

  const generatePlaybook = async () => {
      setLoading(true);
      await fetch('/api/ai/generate-playbook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyId })
      });
      alert("Fiko Sales DNA™ Playbook généré avec succès !");
      setLoading(false);
  };

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const DNAStat = ({ label, count, icon: Icon, color }: any) => (
    <div className="flex items-center gap-3 bg-zinc-900/40 p-3 rounded-xl border border-white/5">
        <div className={`p-2 rounded-lg bg-${color}-500/10 text-${color}-400`}><Icon size={14} /></div>
        <div>
            <div className="text-[10px] font-black text-gray-500 uppercase">{label}</div>
            <div className="text-xs font-black font-mono">{count}</div>
        </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 p-8 rounded-[2.5rem] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#E10600]/5 rounded-full blur-[100px] -mr-32 -mt-32"></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-4 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E10600]/10 border border-[#E10600]/20 text-[#E10600] text-[10px] font-black uppercase tracking-widest">
                    <Sparkles size={12} /> Fiko V3.2 Industrial
                </div>
                <h2 className="text-4xl font-black tracking-tighter">Parler à Fiko<span className="text-[#E10600]">.</span></h2>
                <p className="text-gray-400 text-sm font-medium italic">"Apprenez à Fiko votre ADN commercial via texte ou notes vocales."</p>
            </div>

            <div className="w-full lg:w-72 space-y-4 text-right">
                <div className="flex justify-between items-end mb-1">
                    <span className="text-[10px] font-black uppercase text-gray-500">Knowledge Score</span>
                    <span className="text-xl font-black text-[#E10600] font-mono">{score}%</span>
                </div>
                <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div animate={{ width: `${score}%` }} className="h-full bg-gradient-to-r from-[#E10600] to-red-400 shadow-[0_0_15px_rgba(225,6,0,0.5)]" />
                </div>
                {score >= 90 && (
                    <div className="inline-flex items-center gap-1.5 text-emerald-400 text-[10px] font-black uppercase">
                        <Zap size={10} fill="currentColor" /> Fiko Autopilot Actif
                    </div>
                )}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 flex flex-col h-[550px] bg-[#0a0a0a] border border-zinc-900 rounded-[2.5rem] overflow-hidden">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                        <BrainCircuit size={48} />
                        <p className="text-[10px] font-black uppercase tracking-widest">Fiko attend votre savoir...</p>
                    </div>
                )}
                {messages.map((m, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${m.role === 'user' ? 'bg-[#E10600] text-white font-bold' : 'bg-zinc-900 text-gray-300 border border-zinc-800'}`}>
                            {m.content}
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="p-6 bg-zinc-950 border-t border-zinc-900 flex gap-4">
                <div className="relative flex-1">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                        placeholder="Expliquez vos prix, vos scripts ou vos concurrents..."
                        className="w-full bg-zinc-900 border border-zinc-800 p-4 pr-16 rounded-2xl text-sm text-white outline-none focus:border-[#E10600] min-h-[80px] resize-none"
                    />
                    <button onClick={handleSend} disabled={!input.trim() || loading} className="absolute bottom-4 right-4 p-3 bg-[#E10600] rounded-xl text-white hover:scale-110 transition-all disabled:opacity-50"><Send size={16} /></button>
                </div>
                <button
                    onClick={handleVoiceUpload}
                    className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-gray-400 hover:text-[#E10600] transition-colors self-end"
                >
                    <Mic size={20} />
                </button>
            </div>
        </div>

        <div className="space-y-4">
            <div className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-[2rem] space-y-6">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-zinc-800 pb-4">Fiko Sales DNA™ Index</h4>
                <div className="space-y-3">
                    <DNAStat label="Produits & Offres" count={stats.products} icon={Package} color="blue" />
                    <DNAStat label="Grille Tarifaire" count={stats.pricing} icon={CreditCard} color="emerald" />
                    <DNAStat label="Objections DNA" count={stats.objections} icon={AlertOctagon} color="red" />
                    <DNAStat label="Voix Apprise" count={0} icon={Music} color="amber" />
                </div>

                <button
                    onClick={generatePlaybook}
                    className="w-full bg-white text-black py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                    <FileText size={14} /> Générer Playbook V3.2
                </button>
            </div>

            <div className="p-6 bg-[#E10600]/10 border border-[#E10600]/20 rounded-[2rem] space-y-2">
                <div className="flex items-center gap-2 text-[#E10600]">
                    <Zap size={14} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Fiko Autopilot</span>
                </div>
                <p className="text-[10px] text-red-100 font-medium italic leading-relaxed">
                    "À 90%, j'active mon autonomie totale pour closer vos prospects 24h/24."
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}
