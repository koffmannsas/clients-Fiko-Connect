import { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  where,
  getDocs,
  limit,
  addDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AiOmegaService } from '../services/ai-omega.service';
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
  MoreVertical,
  Sparkles,
  Loader2,
  History
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
  const [isScoring, setIsScoring] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [auditTrail, setAuditTrail] = useState<any[]>([]);

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
          ...data,
          lastActivity: data.updatedAt?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '...'
        };
      }) as Lead[];
      setLeads(leadsList);
    });
    return unsubscribe;
  }, [companyId]);

  const runOmegaScoring = async (leadId: string) => {
    setIsScoring(leadId);
    try {
      const messagesSnap = await getDocs(query(
        collection(db, 'messages'),
        where('conversationId', '==', leadId),
        orderBy('timestamp', 'desc'),
        limit(5)
      ));
      const history = messagesSnap.docs.map(d => `${d.data().sender}: ${d.data().content}`);
      const lead = leads.find(l => l.id === leadId);
      const newScore = await AiOmegaService.calculateAIScore(companyId, leadId, lead, history);

      await updateDoc(doc(db, 'leads', leadId), {
        score: newScore,
        purchaseProbability: newScore,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Scoring failed", err);
    }
    setIsScoring(null);
  };

  const moveLead = async (leadId: string, newStatus: Lead['status']) => {
    const oldStatus = leads.find(l => l.id === leadId)?.status;
    try {
      await updateDoc(doc(db, 'leads', leadId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      // Add to audit trail
      await addDoc(collection(db, 'audit_trail'), {
          companyId,
          entityId: leadId,
          entityType: 'lead',
          action: 'status_change',
          from: oldStatus,
          to: newStatus,
          timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error("Error moving lead:", err);
    }
  };

  const fetchHistory = async (leadId: string) => {
      setShowHistory(leadId);
      const q = query(collection(db, 'audit_trail'), where('entityId', '==', leadId), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      setAuditTrail(snap.docs.map(d => d.data()));
  };

  const filteredLeads = leads.filter(lead =>
    lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.phone?.includes(searchTerm)
  );

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
            <Target className="text-[#E10600]" size={24} /> Industrial Sales OS
          </h1>
          <p className="text-gray-500 text-xs">Pipeline commercial certifié v1.1. Synchronisation Firestore native.</p>
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
            const totalValue = laneLeads.reduce((sum, l) => sum + (l.dealValue || 0), 0);

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
                            {(lead.name || lead.phone || 'P')[0]}
                          </div>
                          <span className="font-bold text-xs text-white group-hover:text-[#E10600] transition-colors">{lead.name || lead.phone}</span>
                        </div>
                        <div className="flex gap-1">
                            <button
                                onClick={() => fetchHistory(lead.id)}
                                className="text-gray-700 hover:text-blue-400"
                            >
                                <History size={14} />
                            </button>
                            <button
                                onClick={() => runOmegaScoring(lead.id)}
                                disabled={isScoring === lead.id}
                                className="text-gray-700 hover:text-purple-400"
                            >
                            {isScoring === lead.id ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                            </button>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-gray-500">Probabilité</span>
                          <span className="text-emerald-400 font-black">{lead.purchaseProbability || 50}%</span>
                        </div>
                        <div className="w-full bg-zinc-950 h-1 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${lead.purchaseProbability || 50}%` }}></div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-zinc-900/50">
                        <span className="text-[10px] text-emerald-400 font-mono font-black">{(lead.dealValue || 0).toLocaleString()} F</span>
                        <div className="flex gap-2">
                            {STAGES.indexOf(lead.status) < STAGES.length - 1 && (
                                <button
                                    onClick={() => moveLead(lead.id, STAGES[STAGES.indexOf(lead.status) + 1])}
                                    className="p-1 bg-zinc-900 rounded hover:bg-[#E10600] transition"
                                >
                                    <ChevronRight size={10} />
                                </button>
                            )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
          <div className="bg-[#0a0a0a] border border-zinc-900 rounded-2xl overflow-hidden shadow-xl text-center p-12 text-gray-500 font-mono text-xs">
              VUE LISTE GÉNÉRÉE SUR DEMANDE
          </div>
      )}

      {/* AUDIT TRAIL OVERLAY */}
      {showHistory && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#0b0c15] border border-zinc-800 p-6 rounded-3xl max-w-lg w-full space-y-4">
                  <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
                    <h3 className="font-black text-white text-sm uppercase">Audit Trail - Lead History</h3>
                    <button onClick={() => setShowHistory(null)} className="text-gray-500 hover:text-white">✕</button>
                  </div>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {auditTrail.map((log, i) => (
                        <div key={i} className="bg-black/40 border border-zinc-900 p-3 rounded-xl flex justify-between items-center text-[10px]">
                            <div className="flex items-center gap-2">
                                <span className="bg-zinc-800 px-2 py-0.5 rounded text-gray-400">{log.from}</span>
                                <ChevronRight size={10} className="text-gray-600" />
                                <span className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded">{log.to}</span>
                            </div>
                            <span className="text-gray-600 font-mono">{log.timestamp?.toDate?.()?.toLocaleString() || '...'}</span>
                        </div>
                    ))}
                    {auditTrail.length === 0 && <p className="text-center py-8 text-gray-600 italic text-[11px]">Aucun historique de changement de statut.</p>}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
