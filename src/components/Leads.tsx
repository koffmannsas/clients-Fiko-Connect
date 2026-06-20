import { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Search, 
  KanbanSquare, 
  ListFilter, 
  Clock, 
  CheckCircle, 
  ChevronRight, 
  Wand2, 
  AlertCircle,
  TrendingUp,
  Zap,
  Target,
  MoreVertical
} from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  phone: string;
  score: number;
  status: 'Nouveau' | 'Qualifié' | 'Intéressé' | 'Négociation' | 'Client' | 'Perdu';
  lastActivity: string;
  dealValue: number;
  lastMessage: string;
  purchaseProbability: number;
  bestAction: string;
}

const STAGES = ['Nouveau', 'Qualifié', 'Intéressé', 'Négociation', 'Client', 'Perdu'] as const;

export default function LeadsModule({ onboardingData }: { onboardingData: any }) {
  const [viewMode, setViewMode] = useState<'pipeline' | 'table'>('pipeline');
  const [searchTerm, setSearchTerm] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const companyId = onboardingData?.companyId || 'fiko_prod_68469';

  useEffect(() => {
    const q = query(
      collection(db, 'leads'),
      where('companyId', '==', companyId),
      orderBy('updatedAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leadsList = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || data.phone,
          phone: data.phone,
          score: data.score || 50,
          status: data.status || 'Nouveau',
          lastActivity: data.updatedAt?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '...',
          dealValue: data.dealValue || (Math.floor(Math.random() * 50000) + 15000),
          lastMessage: data.lastMessage || 'Aucun message',
          purchaseProbability: data.purchaseProbability || (data.score || 50),
          bestAction: data.bestAction || 'Relancer par WhatsApp'
        };
      }) as Lead[];
      setLeads(leadsList);
    });
    return unsubscribe;
  }, [companyId]);

  const filteredLeads = leads.filter(lead => 
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.phone.includes(searchTerm)
  );

  const moveLead = async (leadId: string, newStatus: Lead['status']) => {
    try {
      await updateDoc(doc(db, 'leads', leadId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error moving lead:", err);
    }
  };

  const laneStyles = {
    'Nouveau': 'border-t-blue-500',
    'Qualifié': 'border-t-emerald-500',
    'Intéressé': 'border-t-purple-500',
    'Négociation': 'border-t-amber-500',
    'Client': 'border-t-[#25D366]',
    'Perdu': 'border-t-red-500'
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">

      {/* SALES COMMAND CENTER HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Target className="text-[#E10600]" size={24} /> Sales Command Center
          </h1>
          <p className="text-gray-500 text-xs">Pilotez votre pipeline commercial augmenté par l'IA FiKO.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-3 text-gray-650" size={14} />
            <input 
              type="text" 
              placeholder="Chercher un prospect..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-900 rounded-xl p-2.5 pl-9 text-[11px] text-white focus:outline-none focus:border-[#E10600]"
            />
          </div>

          <div className="bg-black border border-zinc-900 rounded-xl p-1 flex gap-1">
            <button
              onClick={() => setViewMode('pipeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black transition ${viewMode === 'pipeline' ? 'bg-[#E10600] text-white' : 'text-gray-500 hover:text-white'}`}
            >
              <KanbanSquare size={14} /> Pipeline
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black transition ${viewMode === 'table' ? 'bg-[#E10600] text-white' : 'text-gray-500 hover:text-white'}`}
            >
              <ListFilter size={14} /> Liste
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'pipeline' ? (
        <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide">
          {STAGES.map((stage) => {
            const laneLeads = filteredLeads.filter(l => l.status === stage);
            const totalValue = laneLeads.reduce((sum, l) => sum + l.dealValue, 0);

            return (
              <div
                key={stage}
                className={`flex-shrink-0 w-80 bg-[#070707] rounded-2xl border border-zinc-900/50 flex flex-col min-h-[600px] border-t-2 ${laneStyles[stage]}`}
              >
                <div className="p-4 border-b border-zinc-900/30 flex justify-between items-center">
                  <div>
                    <span className="font-black text-[10px] text-gray-300 uppercase tracking-widest">{stage}</span>
                    <p className="text-[9px] text-gray-600 font-mono mt-0.5">{totalValue.toLocaleString()} FCFA</p>
                  </div>
                  <span className="text-[10px] font-black bg-zinc-900 text-gray-500 px-2 py-0.5 rounded-md">
                    {laneLeads.length}
                  </span>
                </div>

                <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                  {laneLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="bg-[#0d0d0d] border border-zinc-900 hover:border-zinc-700 p-4 rounded-xl cursor-pointer transition group relative"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[9px] font-black text-white uppercase border border-zinc-700">
                            {(lead.name || lead.phone)[0]}
                          </div>
                          <span className="font-bold text-xs text-white group-hover:text-[#E10600] transition-colors">{lead.name}</span>
                        </div>
                        <button className="text-gray-700 hover:text-white">
                          <MoreVertical size={14} />
                        </button>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-gray-500">Probabilité</span>
                          <span className="text-emerald-400 font-black">{lead.purchaseProbability}%</span>
                        </div>
                        <div className="w-full bg-zinc-950 h-1 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full" style={{ width: `${lead.purchaseProbability}%` }}></div>
                        </div>
                      </div>

                      <div className="bg-black/40 border border-zinc-900 p-2.5 rounded-lg mb-3">
                        <span className="text-[8px] text-gray-600 uppercase font-black block mb-1">Meilleure Action IA</span>
                        <p className="text-[10px] text-gray-300 font-medium flex items-center gap-1.5">
                          <Wand2 size={10} className="text-purple-400" /> {lead.bestAction}
                        </p>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-zinc-900/50">
                        <span className="text-[10px] text-emerald-400 font-mono font-black">{lead.dealValue.toLocaleString()} F</span>
                        <span className="text-[9px] text-gray-600 flex items-center gap-1">
                          <Clock size={10} /> {lead.lastActivity}
                        </span>
                      </div>
                    </div>
                  ))}
                  {laneLeads.length === 0 && (
                    <div className="h-32 border border-dashed border-zinc-900 rounded-xl flex items-center justify-center text-[10px] text-gray-700 uppercase font-black">
                      Aucun lead
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#0a0a0a] border border-zinc-900 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left">
            <thead className="bg-black/50 text-gray-500 text-[9px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Prospect</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Score IA</th>
                <th className="px-6 py-4">Valeur Potentielle</th>
                <th className="px-6 py-4">Dernier Contact</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-900">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-zinc-900/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] font-black text-[#E10600]">
                        {(lead.name || lead.phone)[0]}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{lead.name}</p>
                        <p className="text-[10px] text-gray-600 font-mono">{lead.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-[9px] font-black px-2 py-1 rounded uppercase">
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-[11px] font-black text-white font-mono">{lead.score}%</span>
                  </td>
                  <td className="px-6 py-4 font-mono text-emerald-400 text-xs font-black">
                    {lead.dealValue.toLocaleString()} FCFA
                  </td>
                  <td className="px-6 py-4 text-[10px] text-gray-500 font-mono uppercase">
                    {lead.lastActivity}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="bg-zinc-950 border border-zinc-900 text-white p-2 rounded-lg hover:bg-zinc-900 transition">
                      <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
