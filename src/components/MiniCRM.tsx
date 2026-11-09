import React, { useState, useEffect } from 'react';
import {
  Users,
  TrendingUp,
  DollarSign,
  Target,
  CheckCircle2,
  Lock,
  Sparkles,
  Brain,
  BarChart3,
  Flame,
  PhoneCall,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { PlanTier } from '../services/subscription.service';
import { CRMLead, CRMInsight, CRMMetrics, MiniCRMService } from '../services/mini-crm.service';

interface MiniCRMProps {
  plan: PlanTier;
  companyId: string;
  authToken?: string;
}

export const MiniCRM: React.FC<MiniCRMProps> = ({ plan, companyId, authToken }) => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<CRMMetrics | null>(null);
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [insights, setInsights] = useState<CRMInsight[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'pipeline' | 'command'>('overview');

  const entitlements = MiniCRMService.getEntitlements(plan);

  useEffect(() => {
    const fetchCRMData = async () => {
      setLoading(true);
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

        const res = await fetch(`/api/crm/overview?companyId=${companyId}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setMetrics(data.metrics);
          setLeads(data.leads || []);
          setInsights(data.insights || []);
        }
      } catch (err) {
        console.error('[MINI_CRM] Fetch Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCRMData();
  }, [companyId, plan, authToken]);

  if (loading) {
    return (
      <div className="p-8 bg-zinc-950 border border-white/10 rounded-2xl text-center space-y-3">
        <div className="w-8 h-8 border-2 border-[#E10600] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-mono text-zinc-400">Chargement de Fiko Connect Mini CRM...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border border-white/10 p-6 rounded-2xl gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#E10600]/20 text-[#E10600] border border-[#E10600]/30 uppercase">
              Formule {plan.toUpperCase()}
            </span>
            <span className="text-xs text-zinc-500 font-mono">• Fiko Connect OS V1.3</span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Brain className="text-[#E10600]" size={22} />
            Mini CRM Performance Engine
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Visualisez et pilotez votre acquisition commerciale WhatsApp en temps réel.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-black/60 p-1 border border-white/10 rounded-xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'overview' ? 'bg-[#E10600] text-white' : 'text-zinc-400 hover:text-white'}`}
          >
            Aperçu
          </button>
          <button
            onClick={() => setActiveTab('leads')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'leads' ? 'bg-[#E10600] text-white' : 'text-zinc-400 hover:text-white'}`}
          >
            Prospects ({leads.length})
          </button>
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${activeTab === 'pipeline' ? 'bg-[#E10600] text-white' : 'text-zinc-400 hover:text-white'}`}
          >
            Pipeline {!entitlements.pipeline && <Lock size={10} />}
          </button>
          <button
            onClick={() => setActiveTab('command')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${activeTab === 'command' ? 'bg-[#E10600] text-white' : 'text-zinc-400 hover:text-white'}`}
          >
            Revenue Command {!entitlements.revenueCommandCenter && <Lock size={10} />}
          </button>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-zinc-900/60 border border-white/5 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Total Contacts</span>
            <Users size={16} className="text-[#E10600]" />
          </div>
          <p className="text-2xl font-black text-white font-mono">{metrics?.totalContacts || 0}</p>
          <p className="text-[10px] text-emerald-400 font-medium">Capturés automatiquement</p>
        </div>

        <div className="p-4 bg-zinc-900/60 border border-white/5 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Opportunités Qualifiées</span>
            <Target size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black text-white font-mono">{metrics?.qualifiedLeads || 0}</p>
          <p className="text-[10px] text-zinc-400 font-medium">Saisie intention d'achat</p>
        </div>

        <div className="p-4 bg-zinc-900/60 border border-white/5 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Valeur Pipeline</span>
            <DollarSign size={16} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-white font-mono">{(metrics?.pipelineValueFCFA || 0).toLocaleString()} <span className="text-xs text-zinc-500">FCFA</span></p>
          <p className="text-[10px] text-emerald-400 font-medium">Ventes en cours</p>
        </div>

        <div className="p-4 bg-zinc-900/60 border border-white/5 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Ventes Influencées Fiko</span>
            <Sparkles size={16} className="text-[#E10600]" />
          </div>
          <p className="text-2xl font-black text-white font-mono">{(metrics?.fikoRevenueFCFA || 0).toLocaleString()} <span className="text-xs text-zinc-500">FCFA</span></p>
          <p className="text-[10px] text-zinc-400 font-medium">Closing IA autonome</p>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Recent Prospects List */}
          <div className="md:col-span-2 p-5 bg-zinc-900/40 border border-white/10 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Users size={16} className="text-[#E10600]" />
                Derniers Prospects Capturés
              </h3>
              <button onClick={() => setActiveTab('leads')} className="text-xs text-[#E10600] font-bold hover:underline flex items-center gap-1">
                Voir tout <ArrowRight size={12} />
              </button>
            </div>

            <div className="divide-y divide-white/5">
              {leads.slice(0, 5).map((lead) => (
                <div key={lead.id} className="py-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-white">{lead.name}</p>
                    <p className="text-[10px] font-mono text-zinc-400">{lead.phone}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-zinc-800 text-zinc-300">
                      {lead.status}
                    </span>
                    <p className="text-xs font-mono font-bold text-emerald-400">
                      {(lead.dealValue || 0).toLocaleString()} FCFA
                    </p>
                  </div>
                </div>
              ))}
              {leads.length === 0 && (
                <p className="py-6 text-center text-xs text-zinc-500 font-mono">Aucun prospect enregistré pour le moment.</p>
              )}
            </div>
          </div>

          {/* Performance & ROI Widget */}
          <div className="p-5 bg-zinc-900/40 border border-white/10 rounded-2xl space-y-4">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-500" />
              Impact Commercial Fiko
            </h3>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-zinc-400">Conversations autonomes</span>
                <span className="text-white font-bold">{metrics?.fikoHandledCount || 0}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-zinc-400">Taux de conversion</span>
                <span className="text-emerald-400 font-bold">{metrics?.conversionRate || 0}%</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-zinc-400">Chiffre d'affaires géré</span>
                <span className="text-white font-bold">{(metrics?.wonDealsValueFCFA || 0).toLocaleString()} FCFA</span>
              </div>
            </div>

            {!entitlements.performanceMetrics && (
              <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-xl flex items-center gap-2 text-[10px] text-amber-400">
                <Lock size={12} className="shrink-0" />
                <span>Passez à la formule Pro ou Elite pour débloquer le closing coach et l'analyse avancée.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leads Tab */}
      {activeTab === 'leads' && (
        <div className="p-6 bg-zinc-900/40 border border-white/10 rounded-2xl space-y-4">
          <h3 className="text-sm font-extrabold text-white">Liste des Contacts & Prospects ({leads.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px] border-b border-white/10">
                <tr>
                  <th className="p-3">Nom</th>
                  <th className="p-3">Téléphone</th>
                  <th className="p-3">Statut</th>
                  <th className="p-3">Valeur Estimée</th>
                  <th className="p-3">Ville</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3 font-bold text-white">{lead.name}</td>
                    <td className="p-3">{lead.phone}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-zinc-800 text-zinc-200">
                        {lead.status}
                      </span>
                    </td>
                    <td className="p-3 text-emerald-400 font-bold">{(lead.dealValue || 0).toLocaleString()} FCFA</td>
                    <td className="p-3">{lead.city || 'Non renseigné'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pipeline Tab with Feature Gate */}
      {activeTab === 'pipeline' && (
        <div className="relative p-6 bg-zinc-900/40 border border-white/10 rounded-2xl">
          {!entitlements.pipeline ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 bg-amber-950/40 border border-amber-800/60 rounded-2xl flex items-center justify-center text-amber-500 mx-auto">
                <Lock size={24} />
              </div>
              <h3 className="text-base font-extrabold text-white">Pipeline Commercial Verrouillé</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Le pipeline visuel nécessite la formule <strong className="text-white">Growth</strong>, <strong className="text-white">Pro</strong> ou <strong className="text-white">Elite</strong>.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <BarChart3 size={16} className="text-[#E10600]" />
                Pipeline Ventes Visual Engine
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {(['QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON'] as const).map((stage) => {
                  const stageLeads = leads.filter(l => l.status === stage);
                  return (
                    <div key={stage} className="bg-zinc-950 p-4 border border-white/10 rounded-xl space-y-3">
                      <div className="flex justify-between items-center text-xs font-bold text-white border-b border-white/5 pb-2">
                        <span>{stage}</span>
                        <span className="text-[10px] font-mono text-zinc-500">{stageLeads.length}</span>
                      </div>
                      <div className="space-y-2">
                        {stageLeads.map(lead => (
                          <div key={lead.id} className="p-2.5 bg-zinc-900 border border-white/5 rounded-lg space-y-1">
                            <p className="text-xs font-bold text-white">{lead.name}</p>
                            <p className="text-[10px] font-mono text-emerald-400">{(lead.dealValue || 0).toLocaleString()} FCFA</p>
                          </div>
                        ))}
                        {stageLeads.length === 0 && <p className="text-[10px] text-zinc-600 font-mono italic">Aucun prospect</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Revenue Command Center Tab */}
      {activeTab === 'command' && (
        <div className="p-6 bg-zinc-900/40 border border-white/10 rounded-2xl space-y-6">
          {!entitlements.revenueCommandCenter ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 bg-red-950/40 border border-red-800/60 rounded-2xl flex items-center justify-center text-[#E10600] mx-auto">
                <Lock size={24} />
              </div>
              <h3 className="text-base font-extrabold text-white">Revenue Command Center Verrouillé</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                L'analyse d'intelligence commerciale et les recommandations directes nécessitent la formule <strong className="text-white">Elite</strong> (342 200 FCFA/mois).
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/20 border border-emerald-900/50 px-3 py-1.5 rounded-lg w-fit">
                <Flame size={14} />
                <span>ANALYSE IA EXÉCUTIVE EN TEMPS RÉEL</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights.map(ins => (
                  <div key={ins.id} className="p-4 bg-zinc-950 border border-white/10 rounded-xl space-y-2">
                    <h4 className="text-xs font-black text-white flex items-center gap-2">
                      <Sparkles size={14} className="text-[#E10600]" />
                      {ins.title}
                    </h4>
                    <p className="text-xs text-zinc-400">{ins.description}</p>
                    <div className="pt-2 border-t border-white/5 text-[11px] font-bold text-emerald-400">
                      💡 Action Recommandée : {ins.recommendedAction}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
