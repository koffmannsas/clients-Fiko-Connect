import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Users, 
  Sparkles, 
  Globe2, 
  CheckCircle, 
  Layers, 
  HelpCircle,
  Percent,
  Timer,
  Loader2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { AnalyticsService } from '../services/analytics.service';

export default function AnalyticsModule({ onboardingData }: { onboardingData: any }) {
  const [activeRange, setActiveRange] = useState<'7d' | '30d' | 'all'>('30d');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const companyId = onboardingData?.companyId;

  useEffect(() => {
    if (!companyId) return;
    const load = async () => {
        const s = await AnalyticsService.getExecutiveStats(companyId);
        setStats(s);
        setLoading(false);
    };
    load();
  }, [companyId]);

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-[#E10600]" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-12">
      
      {/* KPI STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="bg-[#0a0a0a] border border-gray-900 p-6 rounded-2xl relative">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-gray-500 font-extrabold uppercase block">Vitesse de Réponse IA</span>
            <Timer className="text-[#E10600]" size={16} />
          </div>
          <p className="text-3xl font-black text-white font-mono">1.8s</p>
          <p className="text-[10px] text-gray-400 mt-3">Temps moyen de réponse sémantique</p>
        </div>

        <div className="bg-[#0a0a0a] border border-gray-900 p-6 rounded-2xl relative">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-gray-500 font-extrabold uppercase block">Taux Conversion</span>
            <Percent className="text-[#E10600]" size={16} />
          </div>
          <p className="text-3xl font-black text-white font-mono">{stats?.conversionRate}%</p>
          <p className="text-[10px] text-[#25D366] font-semibold mt-3">Calculé sur {stats?.totalLeads} prospects</p>
        </div>

        <div className="bg-[#0a0a0a] border border-gray-900 p-6 rounded-2xl relative">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-gray-500 font-extrabold uppercase block">Volume IA</span>
            <Clock className="text-[#25D366]" size={16} />
          </div>
          <p className="text-3xl font-black text-white font-mono">{stats?.totalMessages}</p>
          <p className="text-[10px] text-gray-400 mt-3">Messages gérés par Fiko Brain</p>
        </div>

        <div className="bg-[#060a0b] border border-emerald-950/60 p-6 rounded-2xl relative">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-emerald-400 font-extrabold uppercase block">Pipeline Value</span>
            <TrendingUp className="text-[#25D366]" size={16} />
          </div>
          <p className="text-3xl font-black text-white font-mono">{(stats?.pipelineValue || 0).toLocaleString()} F</p>
          <p className="text-[10px] text-[#25D366] font-bold mt-3">Potentiel de vente détecté</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#0a0a0a] border border-gray-850 p-6 rounded-2xl shadow-xl">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-white text-base font-black uppercase tracking-wider flex items-center gap-2">
                <BarChart3 size={18} className="text-[#E10600]" /> Progression de l'Acquisition IA
              </h3>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[{month: 'L', v: 10}, {month: 'M', v: 25}, {month: 'M', v: 45}, {month: 'J', v: 30}, {month: 'V', v: 60}]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#161616" vertical={false} />
                <XAxis dataKey="month" stroke="#444" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#050505', border: '1px solid #1f2937' }} />
                <Area type="monotone" dataKey="v" stroke="#E10600" fill="#E10600" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#0a0a0a] border border-gray-850 p-6 rounded-2xl shadow-xl">
            <h3 className="text-white text-base font-black mb-4 flex items-center gap-2">
              <Globe2 size={18} className="text-[#25D366]" /> Expansion Marché
            </h3>
            <div className="space-y-3">
              {[
                { country: 'Côte d’Ivoire 🇨🇮', status: 'ACTIF', color: 'text-[#25D366]' },
                { country: 'Sénégal 🇸🇳', status: 'BETA', color: 'text-blue-400' },
                { country: 'Cameroun 🇨🇲', status: 'WIP', color: 'text-gray-500' }
              ].map((c) => (
                <div key={c.country} className="p-3 rounded-xl border border-gray-900 flex justify-between items-center text-xs">
                  <span className="font-bold">{c.country}</span>
                  <span className={`font-black ${c.color}`}>{c.status}</span>
                </div>
              ))}
            </div>
        </div>
      </div>
    </div>
  );
}
