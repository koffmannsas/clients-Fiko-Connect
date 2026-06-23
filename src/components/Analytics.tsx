import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Globe2, 
  Percent,
  Loader2,
  BrainCircuit,
  BookOpen,
  ShieldCheck,
  Zap,
  Target
} from 'lucide-react';
import { 
  CartesianGrid,
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { AnalyticsService } from '../services/analytics.service';

export default function AnalyticsModule({ onboardingData }: { onboardingData: any }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const companyId = onboardingData?.companyId;

  useEffect(() => {
    if (!companyId) return;
    const load = async () => {
        const [s, k] = await Promise.all([
            AnalyticsService.getExecutiveStats(companyId),
            AnalyticsService.getKnowledgeMetrics(companyId)
        ]);
        setStats({ ...s, knowledge: k });
        setLoading(false);
    };
    load();
  }, [companyId]);

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-[#E10600]" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-12">
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#0a0a0a] border border-zinc-900 p-6 rounded-2xl relative group hover:border-[#E10600]/30 transition-colors">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-gray-500 font-extrabold uppercase block">Fiko Knowledge Score</span>
            <BrainCircuit className="text-[#E10600]" size={16} />
          </div>
          <p className="text-3xl font-black text-white font-mono">{stats?.knowledge?.mastery}%</p>
          <div className="mt-3">
              <span className="text-[10px] text-emerald-400 font-bold uppercase">Expertise: {stats?.knowledge?.mastery > 70 ? 'Élite' : 'Apprenti'}</span>
          </div>
        </div>

        <div className="bg-[#0a0a0a] border border-zinc-900 p-6 rounded-2xl relative">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-gray-500 font-extrabold uppercase block">Infos ADN Apprises</span>
            <BookOpen className="text-blue-500" size={16} />
          </div>
          <p className="text-3xl font-black text-white font-mono">{stats?.knowledge?.count}</p>
          <p className="text-[10px] text-gray-400 mt-3 font-medium">Extraites du Knowledge Engine™</p>
        </div>

        <div className="bg-[#0a0a0a] border border-zinc-900 p-6 rounded-2xl relative">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-gray-500 font-extrabold uppercase block">Taux de Conversion</span>
            <Target className="text-fiko-red" size={16} />
          </div>
          <p className="text-3xl font-black text-white font-mono">{stats?.conversionRate}%</p>
          <p className="text-[10px] text-emerald-400 font-semibold mt-3">Live WhatsApp</p>
        </div>

        <div className="bg-[#060a0b] border border-emerald-950/60 p-6 rounded-2xl relative">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-emerald-400 font-extrabold uppercase block">Valeur Pipeline</span>
            <TrendingUp className="text-[#25D366]" size={16} />
          </div>
          <p className="text-3xl font-black text-white font-mono">{(stats?.pipelineValue || 0).toLocaleString()} F</p>
          <p className="text-[10px] text-[#25D366] font-bold mt-3">CA Potentiel Détecté</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#0a0a0a] border border-gray-850 p-6 rounded-3xl shadow-xl">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-white text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <Zap size={16} className="text-[#E10600]" /> Croissance Maîtrise IA
            </h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[{day: 'L', v: 15}, {day: 'M', v: 22}, {day: 'M', v: 35}, {day: 'J', v: 48}, {day: 'V', v: 62}]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#161616" vertical={false} />
                <XAxis dataKey="day" stroke="#444" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#050505', border: '1px solid #1f2937' }} />
                <Area type="monotone" dataKey="v" stroke="#E10600" strokeWidth={3} fill="#E10600" fillOpacity={0.05} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-zinc-900/30 border border-zinc-800 p-8 rounded-3xl space-y-6 flex flex-col justify-center">
            <div className="text-center space-y-2">
                <ShieldCheck className="mx-auto text-emerald-400" size={40} />
                <h4 className="text-white font-black uppercase tracking-tighter text-lg">Statut Autopilot</h4>
                <p className="text-xs text-gray-500 font-medium">Activation automatique du closing à 90% de maîtrise.</p>
            </div>
            <div className="space-y-2">
                <div className="h-2 bg-zinc-800 rounded-full">
                    <div className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)]" style={{ width: `${stats?.knowledge?.mastery}%` }}></div>
                </div>
                <div className="flex justify-between text-[10px] font-black uppercase text-gray-600">
                    <span>{stats?.knowledge?.mastery}% Appris</span>
                    <span>90% Seuil</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
