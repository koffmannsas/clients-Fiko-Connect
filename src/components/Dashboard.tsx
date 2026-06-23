import { useState, useEffect } from 'react';
import { 
  TrendingUp,
  Users,
  MessageCircle,
  Target, 
  Zap, 
  ArrowUpRight,
  Activity,
  Radar,
  Flame,
  Snowflake,
  Sun,
  ShieldCheck,
  Loader2,
  Lock
} from 'lucide-react';
import { collection, query, where, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AnalyticsService } from '../services/analytics.service';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import BrainTrainer from './BrainTrainer';

interface StatCardProps {
  title: string;
  value: string | number;
  trend: string;
  isUp: boolean;
  icon: any;
  color: string;
}

const StatCard = ({ title, value, trend, isUp, icon: Icon, color }: StatCardProps) => (
  <div className="bg-[#0a0a0a] border border-gray-900 p-5 rounded-2xl relative overflow-hidden group hover:border-gray-800 transition-all">
    <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}-500/5 rounded-full blur-3xl pointer-events-none`}></div>
    <div className="flex justify-between items-start mb-4">
      <div className={`p-2 rounded-xl bg-${color}-500/10 text-${color}-500 border border-${color}-500/20`}>
        <Icon size={20} />
      </div>
      <div className={`flex items-center gap-1 text-[10px] font-black ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
        {isUp ? <ArrowUpRight size={12} /> : ''}
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
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const companyId = onboardingData?.companyId;

  useEffect(() => {
    if (!companyId) return;
    const q = query(
      collection(db, 'leads'),
      where('companyId', '==', companyId),
      orderBy('updatedAt', 'desc'),
      limit(10)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLeads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const fetchData = async () => {
        const [s, h, k] = await Promise.all([
            AnalyticsService.getExecutiveStats(companyId),
            AnalyticsService.getHistoricalVolume(companyId),
            AnalyticsService.getKnowledgeMetrics(companyId)
        ]);
        setStats({ ...s, mastery: k.mastery });
        setHistory(h);
        setLoading(false);
    };
    fetchData();

    return unsubscribe;
  }, [companyId]);

  const hotLeads = leads.filter(l => (l.score || 0) >= 80);
  const warmLeads = leads.filter(l => (l.score || 0) >= 40 && (l.score || 0) < 80);
  const coldLeads = leads.filter(l => (l.score || 0) < 40);

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-[#E10600]" size={32} /></div>;

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      
      <section>
          <BrainTrainer onboardingData={onboardingData} />
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="CA GÉNÉRÉ (XOF)"
          value={stats?.pipelineValue.toLocaleString() + ' F'}
          trend="Live"
          isUp={true}
          icon={TrendingUp}
          color="emerald"
        />
        <StatCard
          title="LEADS ENTRANTS"
          value={stats?.totalLeads || 0}
          trend="Sync"
          isUp={true}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="AUTOPILOT"
          value={stats?.mastery >= 90 ? 'ACTIF' : 'OFF'}
          trend={stats?.mastery >= 90 ? 'Full' : `${stats?.mastery}%`}
          isUp={stats?.mastery >= 90}
          icon={stats?.mastery >= 90 ? Zap : Lock}
          color={stats?.mastery >= 90 ? 'emerald' : 'gray'}
        />
        <StatCard
          title="TAUX CONV."
          value={`${stats?.conversionRate || 0}%`}
          trend="AI Optimized"
          isUp={true}
          icon={Target}
          color="red"
        />
        <StatCard
          title="MESSAGES IA"
          value={stats?.totalMessages || 0}
          trend="Semantiques"
          isUp={true}
          icon={Zap}
          color="amber"
        />
        <StatCard
          title="STATUS"
          value={stats?.mastery >= 70 ? 'ELITE' : 'APPRENTI'}
          trend="Progression"
          isUp={true}
          icon={ShieldCheck}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#0a0a0a] border border-gray-900 p-6 rounded-3xl shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-white text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Activity size={16} className="text-[#E10600]" /> Volume d'Activité Réel
            </h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E10600" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#E10600" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#161616" vertical={false} />
                <XAxis dataKey="name" stroke="#444" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#444" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#050505', border: '1px solid #1f2937', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="sales" stroke="#E10600" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#0a0a0a] border border-gray-900 p-6 rounded-3xl shadow-xl flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <Radar className="text-[#E10600] animate-pulse" size={18} />
            <h3 className="text-white text-sm font-black uppercase tracking-widest">Radar IA de Conversion</h3>
          </div>
          <div className="space-y-4 flex-1">
            <div className="bg-gradient-to-r from-red-950/20 to-transparent border border-red-900/30 p-4 rounded-2xl relative overflow-hidden">
              <div className="flex justify-between items-center mb-1">
                <span className="text-red-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"><Flame size={14} /> Prospects Chauds</span>
                <span className="text-white font-mono font-black">{hotLeads.length}</span>
              </div>
              <div className="flex -space-x-2 mt-3">
                {hotLeads.map((l, i) => <div key={i} className="w-7 h-7 rounded-full bg-red-900 border-2 border-[#0a0a0a] flex items-center justify-center text-[10px] font-black text-white">{(l.name || 'P')[0]}</div>)}
              </div>
            </div>
            {/* Warm/Cold sectors same logic ... */}
          </div>
        </div>
      </div>
    </div>
  );
}
