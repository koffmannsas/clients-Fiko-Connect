import { useState, useEffect, useRef } from 'react';
import {
  BrainCircuit,
  Send,
  Sparkles,
  Target,
  ShieldCheck,
  TrendingUp,
  Zap,
  Lightbulb,
  MessageSquare,
  ChevronRight,
  BookOpen,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BrainTrainer({ onboardingData }: { onboardingData: any }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(15);
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
    } catch (e) {
      setMessages(prev => [...prev, { role: 'fiko', content: "Désolé, j'ai eu un petit problème de mémorisation. Peux-tu répéter ?" }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const KnowledgeMetric = ({ label, value, icon: Icon, color }: any) => (
    <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl">
        <div className="flex items-center justify-between mb-2">
            <div className={`p-1.5 rounded-lg bg-${color}-500/10 text-${color}-400`}>
                <Icon size={14} />
            </div>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{label}</span>
        </div>
        <div className="text-lg font-black font-mono">{value}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* HEADER PREMIUM */}
      <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 p-8 rounded-[2.5rem] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#E10600]/5 rounded-full blur-[100px] -mr-32 -mt-32"></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-4 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E10600]/10 border border-[#E10600]/20 text-[#E10600] text-[10px] font-black uppercase tracking-widest">
                    <Sparkles size={12} /> Fiko Knowledge Engine™
                </div>
                <h2 className="text-4xl font-black tracking-tighter">Parler à Fiko<span className="text-[#E10600]">.</span></h2>
                <p className="text-gray-400 text-sm leading-relaxed font-medium italic">
                    "Enseignez votre activité à Fiko afin qu'il devienne votre meilleur commercial, conseiller et closer IA."
                </p>
            </div>

            <div className="w-full lg:w-72 space-y-4">
                <div className="flex justify-between items-end mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Niveau de connaissance</span>
                    <span className="text-xl font-black text-[#E10600] font-mono">{score}%</span>
                </div>
                <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${score}%` }}
                        className="h-full bg-gradient-to-r from-[#E10600] to-red-400 shadow-[0_0_15px_rgba(225,6,0,0.5)]"
                    />
                </div>
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter text-right">
                    {score < 50 ? 'Statut: Apprenti' : score < 90 ? 'Statut: Expert' : 'Statut: Maître Total'}
                </p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* CHAT AREA */}
        <div className="lg:col-span-3 flex flex-col h-[600px] bg-[#0a0a0a] border border-zinc-900 rounded-[2.5rem] overflow-hidden">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                <AnimatePresence>
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                            <BrainCircuit size={48} className="text-zinc-800" />
                            <p className="text-xs font-black uppercase tracking-widest text-zinc-600">Fiko attend vos instructions...</p>
                        </div>
                    )}
                    {messages.map((m, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                                m.role === 'user'
                                ? 'bg-[#E10600] text-white font-bold'
                                : 'bg-zinc-900 text-gray-300 border border-zinc-800'
                            }`}>
                                {m.content}
                            </div>
                        </motion.div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                                <Loader2 size={16} className="animate-spin text-[#E10600]" />
                            </div>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            <div className="p-6 bg-zinc-950 border-t border-zinc-900">
                <div className="relative">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                        placeholder="Expliquez votre business à Fiko... (ex: mes tarifs, mes points forts, mes concurrents)"
                        className="w-full bg-zinc-900 border border-zinc-800 p-4 pr-16 rounded-2xl text-sm text-white outline-none focus:border-[#E10600] min-h-[100px] resize-none font-medium"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || loading}
                        className="absolute bottom-4 right-4 p-3 bg-[#E10600] rounded-xl text-white hover:scale-110 transition-transform disabled:opacity-50 disabled:scale-100"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>

        {/* SIDEBAR METRICS */}
        <div className="space-y-4">
            <div className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-[2rem] space-y-6">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 border-b border-zinc-800 pb-4">Objectifs d'entraînement</h4>

                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full border-2 border-[#E10600] flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-[#E10600]"></div>
                        </div>
                        <span className="text-xs font-bold text-gray-300">Produits & Tarifs</span>
                    </div>
                    <div className="flex items-center gap-3 opacity-40">
                        <div className="w-5 h-5 rounded-full border-2 border-zinc-700"></div>
                        <span className="text-xs font-bold text-gray-500">Arguments de vente</span>
                    </div>
                    <div className="flex items-center gap-3 opacity-40">
                        <div className="w-5 h-5 rounded-full border-2 border-zinc-700"></div>
                        <span className="text-xs font-bold text-gray-500">Traitement objections</span>
                    </div>
                    <div className="flex items-center gap-3 opacity-40">
                        <div className="w-5 h-5 rounded-full border-2 border-zinc-700"></div>
                        <span className="text-xs font-bold text-gray-500">Méthodes de closing</span>
                    </div>
                </div>

                <div className="pt-4 border-t border-zinc-800 space-y-3">
                    <KnowledgeMetric label="Infos Apprises" value="12" icon={BookOpen} color="blue" />
                    <KnowledgeMetric label="Maîtrise Marché" value="64%" icon={Target} color="emerald" />
                    <KnowledgeMetric label="Score Closing" value="B+" icon={ShieldCheck} color="amber" />
                </div>
            </div>

            <div className="p-6 bg-[#E10600]/10 border border-[#E10600]/20 rounded-[2rem] space-y-3">
                <div className="flex items-center gap-2 text-[#E10600]">
                    <Lightbulb size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Conseil Fiko</span>
                </div>
                <p className="text-[11px] text-red-100 font-medium leading-relaxed italic">
                    "Parlez-moi de votre concurrent principal pour que je puisse préparer des contre-arguments imparables."
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}
