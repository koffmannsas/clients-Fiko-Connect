import { useState, useEffect, useRef } from 'react';
import {
  BrainCircuit,
  Send,
  Sparkles,
  Zap,
  Lightbulb,
  Loader2,
  Package,
  CreditCard,
  AlertOctagon,
  Mic,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DNAService } from '../services/dna.service';

export default function BrainTrainer({ onboardingData }: { onboardingData: any }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(0);
  const [dnaStats, setStats] = useState<any>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const companyId = onboardingData?.companyId;

  const loadProgress = async () => {
      if (!companyId) return;
      const [s, st] = await Promise.all([
          DNAService.getKnowledgeScore(companyId),
          DNAService.getStats(companyId)
      ]);
      setScore(s.score);
      setStats(st);
  };

  useEffect(() => { loadProgress(); }, [companyId]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const data = await DNAService.trainDNA(companyId, input);
      setMessages(prev => [...prev, { role: 'fiko', content: data.response }]);
      await loadProgress();
    } catch (e) {
      setMessages(prev => [...prev, { role: 'fiko', content: "Erreur de synchronisation DNA." }]);
    } finally {
      setLoading(false);
    }
  };

  const DNAStat = ({ label, count, icon: Icon, color }: any) => (
    <div className="flex items-center gap-3 bg-zinc-900/40 p-3 rounded-xl border border-white/5">
        <div className={`p-2 rounded-lg bg-${color}-500/10 text-${color}-400`}><Icon size={14} /></div>
        <div>
            <div className="text-[10px] font-black text-gray-500 uppercase">{label}</div>
            <div className="text-xs font-black font-mono">{count || 0}</div>
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
                    <Sparkles size={12} /> Fiko DNA Engine V3.5
                </div>
                <h2 className="text-4xl font-black tracking-tighter">Cerveau Central<span className="text-[#E10600]">.</span></h2>
            </div>
            <div className="w-full lg:w-72 space-y-4 text-right">
                <div className="flex justify-between items-end mb-1">
                    <span className="text-[10px] font-black uppercase text-gray-500">Mastery Score</span>
                    <span className="text-xl font-black text-[#E10600] font-mono">{score}%</span>
                </div>
                <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div animate={{ width: `${score}%` }} className="h-full bg-gradient-to-r from-[#E10600] to-red-400 shadow-[0_0_15px_rgba(225,6,0,0.5)]" />
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 flex flex-col h-[550px] bg-[#0a0a0a] border border-zinc-900 rounded-[2.5rem] overflow-hidden">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                        <BrainCircuit size={48} />
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Dites-moi tout sur vos produits ou vos prix.</p>
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
            <div className="p-6 bg-zinc-950 border-t border-zinc-900">
                <div className="relative">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ex: Mes chaussures coûtent 25 000 F..."
                        className="w-full bg-zinc-900 border border-zinc-800 p-4 pr-16 rounded-2xl text-sm text-white outline-none focus:border-[#E10600] min-h-[80px] resize-none"
                    />
                    <button onClick={handleSend} disabled={!input.trim() || loading} className="absolute bottom-4 right-4 p-3 bg-[#E10600] rounded-xl text-white hover:scale-110 transition-all disabled:opacity-50">
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>

        <div className="space-y-4">
            <div className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-[2rem] space-y-6">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-zinc-800 pb-4">DNA Matrix</h4>
                <div className="space-y-3">
                    <DNAStat label="Produits" count={dnaStats.dna_products} icon={Package} color="blue" />
                    <DNAStat label="Pricing" count={dnaStats.dna_pricing} icon={CreditCard} color="emerald" />
                    <DNAStat label="FAQ" count={dnaStats.dna_faq} icon={MessageSquare} color="amber" />
                    <DNAStat label="Objections" count={dnaStats.dna_objections} icon={AlertOctagon} color="red" />
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
