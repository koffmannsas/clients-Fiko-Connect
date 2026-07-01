import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter,
  Plus,
  MoreHorizontal,
  MessageSquare,
  Phone,
  Target,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Flame,
  Snowflake,
  Sun,
  ChevronRight,
  Loader2,
  BrainCircuit,
  Zap
} from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AIOmegaService } from '../services/ai-omega.service';

export default function LeadsModule({ onboardingData }: { onboardingData: any }) {
  const [leads, setLeads] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAIAnalyzing] = useState(false);
  const [aiInsight, setAIInsight] = useState<any>(null);

  const companyId = onboardingData?.companyId;

  useEffect(() => {
    if (!companyId) return;
    const q = query(
      collection(db, 'leads'),
      where('companyId', '==', companyId),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setLeads(snap.docs.map(d => ({ id: doc.id, ...d.data() })));
      setLoading(false);
    });

    return unsubscribe;
  }, [companyId]);

  const runAIAnalysis = async (lead: any) => {
    setIsAIAnalyzing(true);
    const insight = await AIOmegaService.getSalesInsights(companyId, lead.id);
    setAIInsight(insight);
    setIsAIAnalyzing(false);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Customer': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Lead': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Qualified': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Lost': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getTempIcon = (score: number) => {
    if (score >= 80) return <Flame className="text-red-500" size={14} />;
    if (score >= 40) return <Sun className="text-amber-500" size={14} />;
    return <Snowflake className="text-blue-500" size={14} />;
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black tracking-tighter">Pipeline de Vente<span className="text-[#E10600]">.</span></h2>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Command Center IA</p>
        </div>
        <button className="bg-[#E10600] px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-red-700 transition shadow-lg shadow-red-900/20">
          <Plus size={14} /> Nouveau Prospect
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">

        {/* LIST */}
        <div className="lg:col-span-8 bg-[#0a0a0a] border border-zinc-900 rounded-[2.5rem] flex flex-col overflow-hidden">
          <div className="p-6 border-b border-zinc-900 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3 text-gray-600" size={16} />
              <input
                type="text"
                placeholder="Chercher un prospect..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-12 pr-4 text-xs outline-none focus:border-[#E10600] text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-gray-400 hover:text-white"><Filter size={16} /></button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
                <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-[#E10600]" /></div>
            ) : (
                <table className="w-full text-left">
                    <thead className="bg-zinc-950/50 sticky top-0 z-10 border-b border-zinc-900">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase">Lead</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase">Statut</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase">Temp.</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase">Valeur</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase">Dernière Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                        {leads.map((lead) => (
                            <tr
                                key={lead.id}
                                onClick={() => { setSelectedLead(lead); runAIAnalysis(lead); }}
                                className={`hover:bg-zinc-900/40 cursor-pointer transition-colors ${selectedLead?.id === lead.id ? 'bg-zinc-900/60' : ''}`}
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center font-black text-xs text-white border border-zinc-700">
                                            {(lead.name || 'P')[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="text-xs font-black text-white">{lead.name || 'Prospect Anonyme'}</div>
                                            <div className="text-[10px] text-gray-500 font-mono">{lead.phone}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border ${getStatusStyle(lead.status)}`}>
                                        {lead.status || 'Nouveau'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        {getTempIcon(lead.score || 0)}
                                        <span className="text-xs font-black text-white">{lead.score || 0}%</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-mono text-[11px] text-gray-300 font-bold">
                                    {(lead.estimatedValue || 0).toLocaleString()} F
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-[10px] text-gray-500 italic max-w-[150px] truncate">{lead.lastMessage || 'Aucun message'}</div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
          </div>
        </div>

        {/* AI PANEL */}
        <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#0a0a0a] border border-zinc-900 rounded-[2.5rem] p-8 flex flex-col gap-6 sticky top-8">
                {selectedLead ? (
                    <>
                        <div className="flex items-center justify-between">
                            <div className="w-16 h-16 rounded-[2rem] bg-[#E10600]/10 border border-[#E10600]/20 flex items-center justify-center text-2xl font-black text-[#E10600]">
                                {(selectedLead.name || 'P')[0]}
                            </div>
                            <div className="text-right">
                                <div className="text-xl font-black tracking-tighter">{selectedLead.name || 'Prospect'}</div>
                                <div className="text-[10px] font-black text-[#E10600] uppercase tracking-widest">Compte Actif</div>
                            </div>
                        </div>

                        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2rem] space-y-4">
                            <div className="flex items-center gap-2 text-[#E10600] mb-2">
                                <BrainCircuit size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Fiko Closer Insight</span>
                            </div>

                            {isAnalyzing ? (
                                <div className="py-8 flex flex-col items-center gap-4 opacity-50">
                                    <Loader2 className="animate-spin text-[#E10600]" size={24} />
                                    <span className="text-[10px] font-black uppercase tracking-widest animate-pulse">Analyse sémantique...</span>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5">
                                        <span className="text-[10px] font-black uppercase text-gray-500">Probabilité Closing</span>
                                        <span className="text-lg font-black text-emerald-400 font-mono">{selectedLead.score || 0}%</span>
                                    </div>
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-black uppercase text-gray-500">Meilleure Action IA</span>
                                        <p className="text-[11px] text-gray-300 leading-relaxed font-medium italic bg-[#E10600]/5 p-3 rounded-xl border border-[#E10600]/10">
                                            "Proposez une démonstration personnalisée dès ce soir pour traiter son doute sur la compatibilité."
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-black uppercase text-gray-500">Points de Blocage</span>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-md text-[9px] font-black uppercase">Prix</span>
                                            <span className="px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md text-[9px] font-black uppercase">Urgence Faible</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex flex-col items-center gap-2 hover:border-gray-500 transition-colors">
                                <MessageSquare size={18} className="text-gray-400" />
                                <span className="text-[9px] font-black uppercase tracking-widest">WhatsApp</span>
                            </button>
                            <button className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex flex-col items-center gap-2 hover:border-gray-500 transition-colors">
                                <Zap size={18} className="text-[#E10600]" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Relancer IA</span>
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="h-[400px] flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                        <Target size={48} className="text-zinc-800" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Sélectionnez un prospect pour voir les insights</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
