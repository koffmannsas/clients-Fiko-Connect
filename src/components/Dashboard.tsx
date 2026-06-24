import { useState, useEffect } from 'react';
import { 
  TrendingUp,
  Users,
  MessageCircle,
  Target, 
  Zap, 
  Activity,
  Radar,
  Flame,
  ShieldCheck,
  Loader2,
  Lock
} from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AnalyticsService } from '../services/analytics.service';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import BrainTrainer from './BrainTrainer';
import { DNAService } from '../services/dna.service';

const StatCard = ({ title, value, trend, isUp, icon: Icon, color }: any) => (
  <div className="bg-[#0a0a0a] border border-gray-900 p-5 rounded-2xl relative overflow-hidden group hover:border-gray-800 transition-all">
    <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}-500/5 rounded-full blur-3xl pointer-events-none`}></div>
    <div className="flex justify-between items-start mb-4">
      <div className={`p-2 rounded-xl bg-${color}-500/10 text-${color}-500 border border-${color}-500/20`}>
        <Icon size={20} />
      </div>
      <div className={`text-[10px] font-black ${isUp ? 'text-emerald-400' : 'text-gray-500'}`}>
        {trend}
      </div>
    </div>
    <div>
      <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-1">{title}</span>
      <p className="text-2xl font-black text-white font-mono">{value}</p>
    </div>
  </div>
);

export default function Dashboard({ onboardingData }: { onboardingData: any }) {
  const [leads, setLeads] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [apStatus, setAutopilot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const companyId = onboardingData?.companyId;

  useEffect(() => {
    if (!companyId) return;
    const q = query(collection(db, 'leads'), where('companyId', '==', companyId), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLeads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const fetchData = async () => {
        const [s, k, ap] = await Promise.all([
            AnalyticsService.getExecutiveStats(companyId),
            AnalyticsService.getKnowledgeMetrics(companyId),
            DNAService.getAutopilotStatus(companyId)
        ]);
        setStats({ ...s, mastery: k.mastery });
        setAutopilot(ap);
        setLoading(false);
    };
    fetchData();
    return unsubscribe;
  }, [companyId]);

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-[#E10600]" size={32} /></div>;

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <BrainTrainer onboardingData={onboardingData} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="PIPELINE (XOF)" value={(stats?.pipelineValue || 0).toLocaleString()} trend="Live" isUp={true} icon={TrendingUp} color="emerald" />
        <StatCard title="PROSPECTS" value={stats?.totalLeads || 0} trend="Sync" isUp={true} icon={Users} color="blue" />
        <StatCard
            title="AUTOPILOT"
            value={apStatus?.autopilotEnabled ? 'ACTIF' : 'OFF'}
            trend={apStatus?.autopilotEnabled ? 'Optimal' : `${stats?.mastery}%`}
            isUp={apStatus?.autopilotEnabled}
            icon={apStatus?.autopilotEnabled ? Zap : Lock}
            color={apStatus?.autopilotEnabled ? 'emerald' : 'gray'}
        />
        <StatCard title="CONV. RATE" value={`${stats?.conversionRate || 0}%`} trend="AI Target" isUp={true} icon={Target} color="red" />
        <StatCard title="MESSAGES IA" value={stats?.totalMessages || 0} trend="Real-time" isUp={true} icon={MessageCircle} color="purple" />
        <StatCard title="STATUS" value={stats?.mastery >= 70 ? 'ELITE' : 'LEARNING'} trend="Fiko Score" isUp={true} icon={ShieldCheck} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#0a0a0a] border border-gray-900 p-6 rounded-3xl shadow-xl h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[{n: 'L', v: 400}, {n: 'M', v: 300}, {n: 'M', v: 600}, {n: 'J', v: 800}, {n: 'V', v: 500}]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#111" vertical={false} />
                <XAxis dataKey="n" stroke="#444" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#000', border: 'none' }} />
                <Area type="monotone" dataKey="v" stroke="#E10600" fill="#E10600" fillOpacity={0.05} />
              </AreaChart>
            </ResponsiveContainer>
        </div>
        <div className="bg-[#0a0a0a] border border-gray-900 p-6 rounded-3xl shadow-xl">
          <div className="flex items-center gap-2 mb-6"><Radar className="text-[#E10600]" size={18} /><h3 className="text-white text-sm font-black uppercase">Température IA</h3></div>
          <div className="space-y-4">
              <div className="bg-red-500/5 p-4 rounded-2xl border border-red-500/10 flex justify-between items-center">
                  <span className="text-xs font-black text-red-400 uppercase flex items-center gap-2"><Flame size={14}/> Chauds</span>
                  <span className="text-white font-mono font-black">{leads.filter(l => l.score >= 80).length}</span>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}
