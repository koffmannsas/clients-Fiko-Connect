import { useState, useEffect } from 'react';
import { 
  TrendingUp,
  Users,
  MessageCircle,
  Target, 
  Zap, 
  Megaphone,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Radar,
  Flame,
  Snowflake,
  Sun,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Loader2
} from 'lucide-react';
import { collection, query, where, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AnalyticsService } from '../services/analytics.service';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const graphData = [
  { name: 'Lun', sales: 420000 },
  { name: 'Mar', sales: 580000 },
  { name: 'Mer', sales: 720000 },
  { name: 'Jeu', sales: 640000 },
  { name: 'Ven', sales: 910000 },
  { name: 'Sam', sales: 1250000 },
  { name: 'Dim', sales: 1850000 },
];

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
        {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
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
  const [loading, setLoading] = useState(true);
  const companyId = onboardingData?.companyId || 'fiko_prod_68469';

  useEffect(() => {
    const q = query(
      collection(db, 'leads'),
      where('companyId', '==', companyId),
      orderBy('updatedAt', 'desc'),
      limit(10)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLeads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const fetchStats = async () => {
        const s = await AnalyticsService.getExecutiveStats(companyId);
        setStats(s);
        setLoading(false);
    };
    fetchStats();

    return unsubscribe;
  }, [companyId]);

  const hotLeads = leads.filter(l => (l.score || 0) >= 80);
  const warmLeads = leads.filter(l => (l.score || 0) >= 40 && (l.score || 0) < 80);
  const coldLeads = leads.filter(l => (l.score || 0) < 40);

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-[#E10600]" size={32} /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      
      {/* VUE CEO - REAL DATA KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="CA GÉNÉRÉ (XOF)"
          value="Calcul en cours"
          trend="+0%"
          isUp={true}
          icon={TrendingUp}
          color="emerald"
        />
        <StatCard
          title="LEADS ENTRANTS"
          value={stats?.totalLeads || 0}
          trend="Live"
          isUp={true}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="CONV. ACTIVES"
          value={stats?.activeConversations || 0}
          trend="WhatsApp"
          isUp={true}
          icon={MessageCircle}
          color="purple"
        />
        <StatCard
          title="TAUX DE CONV."
          value={stats?.conversionRate || '0%'}
          trend="Objectif 20%"
          isUp={true}
          icon={Target}
          color="fiko-red"
        />
        <StatCard
          title="MESSAGES IA"
          value={stats?.totalMessages || 0}
          trend="Sémantique"
          isUp={true}
          icon={Zap}
          color="amber"
        />
        <StatCard
          title="CAMPAGNES"
          value="0"
          trend="Module Beta"
          isUp={true}
          icon={Megaphone}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* REVENUE GROWTH GRAPH */}
        <div className="lg:col-span-2 bg-[#0a0a0a] border border-gray-900 p-6 rounded-3xl shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-white text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Activity size={16} className="text-[#E10600]" /> Croissance de l'Activité
              </h3>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={graphData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E10600" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#E10600" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#161616" vertical={false} />
                <XAxis dataKey="name" stroke="#444" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#444" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#050505', border: '1px solid #1f2937', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#E10600" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RADAR IA - REALTIME TEMPERATURE */}
        <div className="bg-[#0a0a0a] border border-gray-900 p-6 rounded-3xl shadow-xl flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <Radar className="text-[#E10600] animate-pulse" size={18} />
            <h3 className="text-white text-sm font-black uppercase tracking-widest">Radar IA de Conversion</h3>
          </div>
          
          <div className="space-y-4 flex-1">
            <div className="bg-gradient-to-r from-red-950/20 to-transparent border border-red-900/30 p-4 rounded-2xl relative overflow-hidden">
              <div className="flex justify-between items-center mb-1">
                <span className="text-red-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Flame size={14} /> Prospects Chauds
                </span>
                <span className="text-white font-mono font-black">{hotLeads.length}</span>
              </div>
              <p className="text-[10px] text-gray-500 mb-3 leading-tight">Intention d'achat imminente détectée par Fiko Brain.</p>
              <div className="flex -space-x-2">
                {hotLeads.map((l, i) => (
                  <div key={i} className="w-7 h-7 rounded-full bg-red-900 border-2 border-[#0a0a0a] flex items-center justify-center text-[10px] font-black text-white uppercase">
                    {(l.name || l.phone)[0]}
                  </div>
                ))}
                {hotLeads.length === 0 && <div className="text-[10px] text-gray-650 italic">Aucun en ce moment</div>}
              </div>
            </div>

            <div className="bg-gradient-to-r from-amber-950/20 to-transparent border border-amber-900/30 p-4 rounded-2xl relative overflow-hidden">
              <div className="flex justify-between items-center mb-1">
                <span className="text-amber-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Sun size={14} /> Prospects Tièdes
                </span>
                <span className="text-white font-mono font-black">{warmLeads.length}</span>
              </div>
              <p className="text-[10px] text-gray-500 mb-3 leading-tight">Engagement actif, demande d'informations ou de tarifs.</p>
              <div className="flex -space-x-2">
                {warmLeads.map((l, i) => (
                  <div key={i} className="w-7 h-7 rounded-full bg-amber-900 border-2 border-[#0a0a0a] flex items-center justify-center text-[10px] font-black text-white uppercase">
                    {(l.name || l.phone)[0]}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-950/20 to-transparent border border-blue-900/30 p-4 rounded-2xl relative overflow-hidden">
              <div className="flex justify-between items-center mb-1">
                <span className="text-blue-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Snowflake size={14} /> Prospects Froids
                </span>
                <span className="text-white font-mono font-black">{coldLeads.length}</span>
              </div>
              <p className="text-[10px] text-gray-500 mb-3 leading-tight">Inactifs ou simple prise de contact sans suite.</p>
              <div className="flex -space-x-2">
                {coldLeads.map((l, i) => (
                  <div key={i} className="w-7 h-7 rounded-full bg-blue-900 border-2 border-[#0a0a0a] flex items-center justify-center text-[10px] font-black text-white uppercase">
                    {(l.name || l.phone)[0]}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
