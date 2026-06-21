import { useState } from 'react';
import {
  Bot,
  TrendingUp,
  Target,
  Zap,
  Sparkles,
  Send,
  BrainCircuit,
  AlertCircle,
  HelpCircle,
  Loader2
} from 'lucide-react';
import { AiOmegaService } from '../services/ai-omega.service';

interface BrainLog {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
}

export default function FikoBrainModule({ onboardingData }: { onboardingData: any }) {
  const [logs, setLogs] = useState<BrainLog[]>([
    { id: '1', role: 'ai', content: "Bonjour CEO. Je suis FiKO Brain. Je peux analyser vos conversations, vos campagnes et vos ventes pour vous aider à piloter votre empire. Que voulez-vous savoir aujourd'hui ?", timestamp: 'Maintenant' }
  ]);
  const [input, setTypedInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const companyId = onboardingData?.companyId || 'fiko_prod_68469';

  const handleQuery = async () => {
    if (!input.trim() || isAnalyzing) return;
    const userMsg: BrainLog = { id: Date.now().toString(), role: 'user', content: input, timestamp: 'Maintenant' };
    setLogs(prev => [...prev, userMsg]);
    const currentInput = input;
    setTypedInput('');
    setIsAnalyzing(true);

    const context = {
        market: "West Africa",
        company: onboardingData?.companyName || "Mon Entreprise",
        active_leads: 127,
        conversion_rate: "19.8%"
    };

    const aiContent = await AiOmegaService.queryBrain(companyId, currentInput, context);
    const aiMsg: BrainLog = { id: (Date.now()+1).toString(), role: 'ai', content: aiContent, timestamp: 'Maintenant' };
    setLogs(prev => [...prev, aiMsg]);
    setIsAnalyzing(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <BrainCircuit className="text-purple-400" size={24} /> Fiko AI Sales Copilot
          </h1>
          <p className="text-gray-500 text-xs">Module Premium d'analyse stratégique et de conseil commercial.</p>
        </div>
        <div className="bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full text-purple-400 text-[10px] font-black uppercase tracking-widest">
          Premium Access
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-280px)]">
        <div className="lg:col-span-2 bg-[#0a0a0a] border border-gray-900 rounded-3xl flex flex-col overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-gray-900 bg-black/40 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 border border-purple-500/30">
              <Bot size={18} />
            </div>
            <h3 className="text-white text-xs font-black uppercase tracking-widest">Intelligence Stratégique</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
            {logs.map((log) => (
              <div key={log.id} className={`flex ${log.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-[12px] leading-relaxed ${log.role === 'user' ? 'bg-purple-600 text-white rounded-tr-none shadow-lg shadow-purple-900/20' : 'bg-zinc-900 border border-zinc-800 text-gray-200 rounded-tl-none'}`}>
                  {log.role === 'ai' && (
                    <div className="flex items-center gap-1.5 mb-2 text-[8px] font-black uppercase tracking-widest text-purple-400">
                      <Sparkles size={10} /> FiKO BRAIN
                    </div>
                  )}
                  <p>{log.content}</p>
                </div>
              </div>
            ))}
            {isAnalyzing && (
              <div className="flex justify-start">
                <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-2xl flex items-center gap-3">
                  <Loader2 className="animate-spin text-purple-400" size={16} />
                  <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Analyse des données en cours...</span>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-900 bg-black/40">
            <div className="flex gap-2 bg-zinc-950 border border-zinc-900 rounded-2xl p-1 focus-within:border-purple-500 transition-colors shadow-inner">
              <input
                value={input}
                onChange={e => setTypedInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleQuery()}
                placeholder="Posez une question stratégique..."
                className="flex-1 p-3 bg-transparent text-white text-xs focus:outline-none"
              />
              <button onClick={handleQuery} disabled={isAnalyzing} className="bg-purple-600 text-white p-3 rounded-xl font-bold hover:bg-purple-700 transition active:scale-95 disabled:opacity-50">
                <Send size={16}/>
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6 overflow-y-auto scrollbar-hide">
          <div className="bg-[#0a0a0f] border border-gray-900 rounded-3xl p-6 space-y-6 shadow-xl">
            <div className="flex items-center gap-2 border-b border-gray-950 pb-4">
              <Target className="text-emerald-400" size={18} />
              <h3 className="text-white text-xs font-black uppercase tracking-widest">Objectifs de la semaine</h3>
            </div>

            <div className="space-y-4">
              {[
                { label: 'Revenus (MRR)', current: 85, color: 'bg-emerald-500' },
                { label: 'Nouveaux Leads', current: 62, color: 'bg-blue-500' },
                { label: 'Taux de Closing', current: 48, color: 'bg-purple-500' }
              ].map((obj) => (
                <div key={obj.label} className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-gray-400 uppercase tracking-widest">{obj.label}</span>
                    <span className="text-white">{obj.current}%</span>
                  </div>
                  <div className="w-full bg-black h-1.5 rounded-full overflow-hidden">
                    <div className={`${obj.color} h-full transition-all duration-1000`} style={{ width: `${obj.current}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#0a0a0f] border border-gray-900 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-3xl"></div>
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="text-blue-400" size={16} />
              <h3 className="text-white text-xs font-black uppercase tracking-widest">Questions suggérées</h3>
            </div>
            <div className="space-y-2">
              {[
                "Quels sont mes meilleurs prospects ?",
                "Pourquoi mes ventes baissent ?",
                "Quels leads appeler aujourd'hui ?",
                "Quelle campagne lancer ce week-end ?",
                "Analyser le sentiment à Dakar"
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => setTypedInput(q)}
                  className="w-full text-left bg-black border border-zinc-900 p-2.5 rounded-xl text-[10px] text-gray-400 hover:text-white hover:border-purple-500/50 transition-all font-medium"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
