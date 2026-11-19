import { useState, useEffect } from 'react';
import { 
  Search, 
  MapPin, 
  Filter, 
  Phone, 
  MessageSquare, 
  KanbanSquare, 
  ListFilter, 
  Sparkles, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Coins, 
  ChevronRight, 
  Wand2, 
  AlertCircle, 
  ArrowRight, 
  UserCheck, 
  Send, 
  Play,
  Lock,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  RefreshCw,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { Lead } from '../types';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { apiUpdateLeadStage } from '../lib/api';
import { useCurrency } from '../lib/currency';

const DEFAULT_INITIAL_LEADS: Lead[] = [
  { id: '1', name: 'Marie Koné', phone: '+225 07 48 93 11 20', score: 95, status: 'Négociation', lastActivity: 'Il y a 5 min', dealValue: 45000, provider: 'Paystack', notes: 'Intéressée par le pack Luxe. Attend le lien de paiement Paystack.', lastMessage: 'Je veux acheter le pack, vous prenez Wave ou Carte ?' },
  { id: '2', name: 'Koffi Yao', phone: '+225 05 92 84 77 15', score: 91, status: 'Qualifié', lastActivity: 'Il y a 12 min', dealValue: 24900, provider: 'Paystack', notes: 'Demande des détails sur la livraison à Cocody.', lastMessage: 'D’accord, transmettez-moi le lien Paystack sécurisé.' },
  { id: '3', name: 'Awa Diallo', phone: '+225 01 02 03 04 05', score: 88, status: 'Nouveau', lastActivity: 'Il y a 25 min', dealValue: 19900, provider: 'Paystack', notes: 'A cliqué sur la pub WhatsApp, attend la réponse de l’IA.', lastMessage: 'Bonjour, je souhaite connaître vos tarifs.' },
  { id: '4', name: 'Zadi Simplice', phone: '+225 05 60 70 80 90', score: 65, status: 'Payé', lastActivity: 'Hier', dealValue: 49900, provider: 'Paystack', notes: 'Paiement Paystack confirmé côté serveur.', lastMessage: 'Merci ! Reçu Paystack bien validé.', paidTransactionReference: 'FIKO_TX_92841_XOF', paidAmount: 49900, paidAt: '2026-06-08T14:22:00Z' },
  { id: '5', name: 'Christian Gnamien', phone: '+225 07 11 22 33 44', score: 82, status: 'Proposition', lastActivity: 'Il y a 2 jours', dealValue: 99000, provider: 'Paystack', notes: 'Devis envoyé par l’IA. En attente de feedback du client.', lastMessage: 'J’examine le montant avec mon associé.' },
  { id: '6', name: 'Aicha Touré', phone: '+225 01 44 55 66 77', score: 45, status: 'Nouveau', lastActivity: 'Hier', dealValue: 19900, provider: 'Paystack', notes: 'A demandé les conditions de vente.', lastMessage: 'Ok merci, je vais réfléchir.' },
];

export default function LeadsModule() {
  const { formatMoney, formatFcfa, isBaseFcfa } = useCurrency();
  const [viewMode, setViewMode] = useState<'pipeline' | 'table'>('pipeline');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leads, setLeads] = useState<Lead[]>(DEFAULT_INITIAL_LEADS);
  const [updatingLeadId, setUpdatingLeadId] = useState<string | number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Subscribe to real Firestore leads
  useEffect(() => {
    try {
      const q = query(collection(db, 'leads'), orderBy('updatedAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const loadedLeads: Lead[] = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name || doc.id,
              phone: data.phone || doc.id,
              email: data.email,
              score: data.score || 70,
              status: data.status || 'Nouveau',
              lastActivity: data.lastActivity || 'Récemment',
              dealValue: data.dealValue || (data.paidAmount || 0),
              provider: 'Paystack',
              notes: data.notes || '',
              lastMessage: data.lastMessage || '',
              companyId: data.companyId,
              lastClientMessageTimestamp: data.lastClientMessageTimestamp,
              paidTransactionReference: data.paidTransactionReference,
              paidAmount: data.paidAmount,
              paidAt: data.paidAt,
              isTestPayment: data.isTestPayment,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt
            };
          });
          setLeads(loadedLeads);
        }
      }, (err) => {
        console.warn('[Leads Firestore listener] Running in cached / local fallback mode:', err.message);
      });
      return unsubscribe;
    } catch (e) {
      console.warn('[Leads Firestore] Fallback active:', e);
    }
  }, []);

  // Search filter
  const filteredLeads = leads.filter(lead => 
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.phone.includes(searchTerm) ||
    lead.notes.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Grouping for Pipeline Lanes
  const lanes = [
    { key: 'Nouveau', label: 'Nouveau prospect', countBg: 'bg-blue-950 text-blue-400 border-blue-900', borderTop: 'border-t-blue-500' },
    { key: 'Qualifié', label: 'Prospect Qualifié', countBg: 'bg-emerald-950 text-emerald-400 border-emerald-900', borderTop: 'border-t-emerald-500' },
    { key: 'Proposition', label: 'Offre envoyée', countBg: 'bg-amber-950 text-amber-400 border-amber-900', borderTop: 'border-t-amber-500' },
    { key: 'Négociation', label: 'En Négociation', countBg: 'bg-purple-950 text-purple-400 border-purple-900', borderTop: 'border-t-purple-500' },
    { key: 'Payé', label: 'Payé (Vérifié Paystack) 🎉', countBg: 'bg-green-950 text-green-400 border-green-900', borderTop: 'border-t-[#25D366]' }
  ] as const;

  // Change lead stage with server-side validation and optimistic UI
  const handleStageChange = async (leadId: string | number, newStatus: Lead['status']) => {
    setErrorMessage(null);
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    // Rule: "Payé" requires confirmed payment!
    if (newStatus === 'Payé' && !lead.paidTransactionReference) {
      setErrorMessage("Le statut 'Payé' requiert obligatoirement un paiement Paystack vérifié. Envoyez un lien Paystack au client dans le module Conversations.");
      return;
    }

    const previousStatus = lead.status;
    setUpdatingLeadId(leadId);

    // Optimistic UI update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus, lastActivity: 'À l’instant' } : l));
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead(prev => prev ? { ...prev, status: newStatus } : null);
    }

    try {
      await apiUpdateLeadStage(leadId, newStatus);
    } catch (err: any) {
      // Rollback on server error
      console.error('[Leads Stage Update Error]', err);
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: previousStatus } : l));
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead(prev => prev ? { ...prev, status: previousStatus } : null);
      }
      setErrorMessage(err.message || "Impossible de mettre à jour l'étape du lead.");
    } finally {
      setUpdatingLeadId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      
      {/* ERROR / VALIDATION BANNER */}
      {errorMessage && (
        <div className="bg-red-950/60 border border-red-900 p-4 rounded-2xl flex items-center justify-between text-red-200 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-red-400 shrink-0" size={18} />
            <span>{errorMessage}</span>
          </div>
          <button 
            onClick={() => setErrorMessage(null)} 
            className="text-red-400 hover:text-white font-bold px-2 py-1"
          >
            Fermer
          </button>
        </div>
      )}

      {/* HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#09090c] p-4 rounded-2xl border border-gray-900">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase text-zinc-400 tracking-wider">Vue CRM :</span>
          <div className="bg-zinc-950 border border-zinc-800 p-1 rounded-xl flex gap-1">
            <button
              onClick={() => setViewMode('pipeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition ${
                viewMode === 'pipeline' ? 'bg-[#E10600] text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <KanbanSquare size={14} /> Pipeline Kanban
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition ${
                viewMode === 'table' ? 'bg-[#E10600] text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ListFilter size={14} /> Liste ({leads.length})
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom, tél ou note..."
            className="w-full bg-black border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-fiko-red"
          />
          <Search size={14} className="absolute left-3 top-2.5 text-zinc-500" />
        </div>
      </div>

      {/* PIPELINE KANBAN VIEW */}
      {viewMode === 'pipeline' && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {lanes.map((lane) => {
            const laneLeads = filteredLeads.filter(l => l.status === lane.key);
            const laneRevenue = laneLeads.reduce((acc, l) => acc + (l.dealValue || 0), 0);

            return (
              <div 
                key={lane.key} 
                className={`bg-[#0a0a0f] border border-gray-900 rounded-2xl flex flex-col min-w-[240px] max-h-[720px] ${lane.borderTop} border-t-2 overflow-hidden shadow-lg`}
              >
                {/* Lane Header */}
                <div className="p-3.5 border-b border-gray-900 bg-black/40 flex justify-between items-center">
                  <div>
                    <h4 className="font-black text-xs text-white">{lane.label}</h4>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {formatMoney(laneRevenue)}
                    </span>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${lane.countBg}`}>
                    {laneLeads.length}
                  </span>
                </div>

                {/* Cards List */}
                <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                  {laneLeads.map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className="bg-[#0f1017] hover:bg-[#141522] border border-zinc-850 hover:border-zinc-700 p-3.5 rounded-xl cursor-pointer transition space-y-2 group relative"
                    >
                      <div className="flex justify-between items-start">
                        <p className="font-extrabold text-xs text-white group-hover:text-red-400 transition">
                          {lead.name}
                        </p>
                        <span className="text-[9px] font-mono font-bold bg-zinc-900 text-zinc-400 px-1.5 py-0.5 rounded">
                          {lead.score}/100
                        </span>
                      </div>

                      <p className="text-[11px] text-zinc-400 font-mono truncate">
                        {lead.phone}
                      </p>

                      <div className="flex justify-between items-center pt-2 border-t border-zinc-900 text-[10px]">
                        <span className="font-mono font-black text-emerald-400">
                          {formatMoney(lead.paidAmount || lead.dealValue || 0)}
                        </span>
                        
                        {lead.paidTransactionReference ? (
                          <span className="text-[8px] bg-emerald-950 text-[#25D366] border border-emerald-900 font-mono font-bold px-1 rounded flex items-center gap-0.5">
                            <ShieldCheck size={9} /> Paystack
                          </span>
                        ) : (
                          <span className="text-[8px] text-zinc-500 font-mono">
                            {lead.lastActivity}
                          </span>
                        )}
                      </div>

                      {/* Stage Advance Selector */}
                      <div className="pt-2 flex justify-between items-center">
                        <select
                          value={lead.status}
                          disabled={updatingLeadId === lead.id}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleStageChange(lead.id, e.target.value as Lead['status'])}
                          className="bg-black border border-zinc-800 text-[10px] text-zinc-300 rounded px-2 py-1 font-sans focus:outline-none focus:border-red-500"
                        >
                          <option value="Nouveau">Nouveau</option>
                          <option value="Qualifié">Qualifié</option>
                          <option value="Proposition">Proposition</option>
                          <option value="Négociation">Négociation</option>
                          <option value="Payé" disabled={!lead.paidTransactionReference}>
                            {lead.paidTransactionReference ? 'Payé ✓' : 'Payé (Requis Paystack 🔒)'}
                          </option>
                        </select>

                        {updatingLeadId === lead.id && (
                          <Loader2 size={12} className="text-red-500 animate-spin" />
                        )}
                      </div>
                    </div>
                  ))}

                  {laneLeads.length === 0 && (
                    <div className="text-center py-8 text-zinc-600 text-[10px] font-mono">
                      Aucun prospect
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="bg-[#09090c] border border-gray-900 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-black/60 border-b border-gray-900 text-gray-500 font-mono uppercase text-[9px]">
                <tr>
                  <th className="p-3.5">Prospect</th>
                  <th className="p-3.5">Téléphone</th>
                  <th className="p-3.5">Étape CRM</th>
                  <th className="p-3.5">Valeur estimée / encaissée</th>
                  <th className="p-3.5">Paiement Paystack</th>
                  <th className="p-3.5">Dernière Activité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-950 text-zinc-300">
                {filteredLeads.map((lead) => (
                  <tr 
                    key={lead.id} 
                    onClick={() => setSelectedLead(lead)}
                    className="hover:bg-zinc-900/40 cursor-pointer transition"
                  >
                    <td className="p-3.5 font-bold text-white">{lead.name}</td>
                    <td className="p-3.5 font-mono text-zinc-400">{lead.phone}</td>
                    <td className="p-3.5">
                      <select
                        value={lead.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleStageChange(lead.id, e.target.value as Lead['status'])}
                        className="bg-black border border-zinc-800 text-[10px] text-zinc-200 rounded px-2 py-1"
                      >
                        <option value="Nouveau">Nouveau</option>
                        <option value="Qualifié">Qualifié</option>
                        <option value="Proposition">Proposition</option>
                        <option value="Négociation">Négociation</option>
                        <option value="Payé" disabled={!lead.paidTransactionReference}>
                          {lead.paidTransactionReference ? 'Payé (Confirmé)' : 'Payé (Requis Paystack)'}
                        </option>
                      </select>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-emerald-400">
                      {formatMoney(lead.paidAmount || lead.dealValue || 0)}
                    </td>
                    <td className="p-3.5">
                      {lead.paidTransactionReference ? (
                        <span className="bg-emerald-950 border border-emerald-900 text-[#25D366] text-[9px] font-mono px-2 py-0.5 rounded font-bold">
                          Réf: {lead.paidTransactionReference}
                        </span>
                      ) : (
                        <span className="text-zinc-600 font-mono text-[10px]">Non payé</span>
                      )}
                    </td>
                    <td className="p-3.5 text-zinc-500 font-mono text-[10px]">{lead.lastActivity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LEAD DETAIL DRAWER / MODAL */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0c14] border border-gray-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-start border-b border-gray-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-white">{selectedLead.name}</h3>
                <p className="text-xs text-zinc-400 font-mono">{selectedLead.phone}</p>
              </div>
              <button 
                onClick={() => setSelectedLead(null)}
                className="text-zinc-500 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-black rounded-xl border border-zinc-800 space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Statut CRM :</span>
                  <span className="font-bold text-white">{selectedLead.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Score IA Fiko :</span>
                  <span className="font-bold text-[#25D366]">{selectedLead.score}/100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Dernier message :</span>
                  <span className="text-zinc-300 italic truncate max-w-xs">"{selectedLead.lastMessage}"</span>
                </div>
              </div>

              {/* Paystack Payment Status */}
              <div className="p-3.5 rounded-xl border border-sky-900/50 bg-[#060c14] space-y-2">
                <div className="flex items-center gap-2">
                  <CreditCard size={14} className="text-[#00C3F8]" />
                  <span className="text-[10px] font-black uppercase text-[#00C3F8] tracking-wider">
                    Statut Règlement Paystack (XOF)
                  </span>
                </div>

                {selectedLead.paidTransactionReference ? (
                  <div className="space-y-1 font-mono text-[11px]">
                    <p className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <CheckCircle size={14} /> Paiement Confirmé et Vérifié Côté Serveur
                    </p>
                    <p className="text-zinc-400">Réf : {selectedLead.paidTransactionReference}</p>
                    <p className="text-zinc-400">
                      Montant : {formatMoney(selectedLead.paidAmount || 0)}
                      {!isBaseFcfa && selectedLead.paidAmount ? ` (${formatFcfa(selectedLead.paidAmount)})` : ''}
                    </p>
                    {selectedLead.paidAt && <p className="text-zinc-500">Date : {new Date(selectedLead.paidAt).toLocaleString()}</p>}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-zinc-400 text-[11px]">
                      Aucun encaissement Paystack n'a encore été confirmé pour ce prospect.
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      Rendez-vous dans le module <strong>Conversations</strong> pour lui envoyer un lien de paiement Paystack en direct.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLead(null)}
                className="bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2 rounded-xl text-xs font-bold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
