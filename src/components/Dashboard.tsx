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
  Lock,
  Globe,
  Smartphone
} from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
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
  const [wabaConfig, setWabaConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const companyId = onboardingData?.companyId;

  useEffect(() => {
    if (!companyId) return;

    const q = query(collection(db, 'leads'), where('companyId', '==', companyId), orderBy('updatedAt', 'desc'));
    const unsubscribeLeads = onSnapshot(q, (snapshot) => {
      setLeads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const fetchData = async () => {
        const [s, k, ap, wSnap] = await Promise.all([
            AnalyticsService.getExecutiveStats(companyId),
            AnalyticsService.getKnowledgeMetrics(companyId),
            DNAService.getAutopilotStatus(companyId),
            getDoc(doc(db, 'companies', companyId))
        ]);
        setStats({ ...s, mastery: k.mastery });
        setAutopilot(ap);
        setWabaConfig(wSnap.data()?.waba);
        setLoading(false);
    };
    fetchData();

    return unsubscribeLeads;
  }, [companyId]);

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-[#E10600]" size={32} /></div>;

  return (
    <div className="space-y-12 animate-in fade-in duration-700">

      {/* COMMAND CENTER HEADER: WABA STATUS */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-zinc-900/20 p-8 rounded-[2.5rem] border border-zinc-900">
          <div>
              <div className="flex items-center gap-3 mb-2">
                  <div className={`h-2 w-2 rounded-full ${wabaConfig?.status === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <h2 className="text-2xl font-black tracking-tighter uppercase italic">WABA Command Center<span className="text-[#E10600]">.</span></h2>
              </div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">WABA ID: {wabaConfig?.phoneNumberId || 'NON-LINKÉ'}</p>
          </div>
          <div className="flex gap-4">
              <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 text-center min-w-[120px]">
                  <div className="text-[9px] font-black text-gray-500 uppercase">Msg Reçus</div>
                  <div className="text-lg font-black font-mono">{stats?.totalMessages / 5 || 0}</div>
              </div>
              <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 text-center min-w-[120px]">
                  <div className="text-[9px] font-black text-gray-500 uppercase text-emerald-400">Leads</div>
                  <div className="text-lg font-black font-mono">{stats?.totalLeads || 0}</div>
              </div>
          </div>
      </div>

      <BrainTrainer onboardingData={onboardingData} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="PIPELINE (XOF)" value={(stats?.pipelineValue || 0).toLocaleString()} trend="Live" isUp={true} icon={TrendingUp} color="emerald" />
        <StatCard title="CONV. ACTIVES" value={leads.length} trend="WhatsApp" isUp={true} icon={MessageCircle} color="blue" />
        <StatCard
            title="AUTOPILOT"
            value={apStatus?.autopilotEnabled ? 'ACTIF' : 'OFF'}
            trend={apStatus?.autopilotEnabled ? 'Optimal' : `${stats?.mastery}%`}
            isUp={apStatus?.autopilotEnabled}
            icon={apStatus?.autopilotEnabled ? Zap : Lock}
            color={apStatus?.autopilotEnabled ? 'emerald' : 'gray'}
        />
        <StatCard title="CONV. RATE" value={`${stats?.conversionRate || 0}%`} trend="Target" isUp={true} icon={Target} color="red" />
        <StatCard title="MESSAGES IA" value={stats?.totalMessages || 0} trend="Semantiques" isUp={true} icon={Zap} color="amber" />
        <StatCard title="DNA STATUS" value={(stats?.mastery || 0) >= 70 ? 'ELITE' : 'LEARNING'} trend="Fiko Score" isUp={true} icon={ShieldCheck} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#0a0a0a] border border-gray-900 p-8 rounded-[2.5rem] shadow-xl h-[400px]">
            <div className="flex justify-between items-center mb-8">
                <h3 className="text-white text-sm font-black uppercase tracking-widest flex items-center gap-2"><Activity size={16} className="text-[#E10600]" /> Trafic WABA Réel</h3>
            </div>
            <ResponsiveContainer width="100%" height="80%">
              <AreaChart data={[{n: 'L', v: 400}, {n: 'M', v: 300}, {n: 'M', v: 600}, {n: 'J', v: 800}, {n: 'V', v: 500}]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#111" vertical={false} />
                <XAxis dataKey="n" stroke="#444" fontSize={10} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: '15px' }} />
                <Area type="monotone" dataKey="v" stroke="#E10600" strokeWidth={4} fill="#E10600" fillOpacity={0.05} />
              </AreaChart>
            </ResponsiveContainer>
        </div>

        <div className="bg-[#0a0a0a] border border-gray-900 p-8 rounded-[2.5rem] shadow-xl flex flex-col">
          <div className="flex items-center gap-2 mb-8"><Radar className="text-[#E10600]" size={18} /><h3 className="text-white text-sm font-black uppercase tracking-widest">Lead Analysis</h3></div>
          <div className="space-y-4 flex-1">
              <div className="bg-red-500/5 p-6 rounded-3xl border border-red-500/10 flex justify-between items-center">
                  <div>
                      <span className="text-xs font-black text-red-400 uppercase flex items-center gap-2"><Flame size={14}/> Chauds</span>
                      <p className="text-[10px] text-gray-600 mt-1 font-bold uppercase tracking-tighter">Closing immanent</p>
                  </div>
                  <span className="text-3xl font-black text-white font-mono">{leads.filter(l => l.score >= 80).length}</span>
              </div>
          </div>
          <div className="mt-8 pt-8 border-t border-zinc-900">
              <button className="w-full bg-zinc-900 hover:bg-zinc-800 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-colors">Voir Pipeline Complet</button>
          </div>
        </div>
      </div>
    </div>
  );
}
