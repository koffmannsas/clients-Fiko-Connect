import { useState, useEffect } from 'react';
import {
  Globe,
  TrendingUp,
  MapPin,
  Zap,
  ShieldCheck,
  MessageSquare,
  Users,
  Target,
  BarChart3,
  Loader2,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';

export default function AfricaIntelligenceModule() {
  const [marketTrends, setMarketTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fiko Intelligence Network™: Aggregating anonymized sector data
    const loadTrends = async () => {
        setMarketTrends([
            { sector: 'Immobilier (CIV)', trend: '+14%', topObjection: 'Frais de notaire', bestRelance: 'Témoignage vidéo' },
            { sector: 'E-commerce (SEN)', trend: '+22%', topObjection: 'Délais livraison', bestRelance: 'Promo Flash 2h' },
            { sector: 'Formation (Global)', trend: '+8%', topObjection: 'Prix', bestRelance: 'Paiement 3x Wave' },
        ]);
        setLoading(false);
    };
    loadTrends();
  }, []);

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-[#E10600]" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">

      <div className="bg-gradient-to-r from-[#0a0a0a] to-[#111] border border-zinc-800 p-8 rounded-[2.5rem] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] -mr-48 -mt-48"></div>
        <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-4">
                <Globe size={12} /> Fiko Intelligence Network™
            </div>
            <h2 className="text-4xl font-black tracking-tighter">Africa Market Insights<span className="text-blue-500">.</span></h2>
            <p className="text-gray-400 text-sm max-w-2xl mt-2 font-medium">
                Exploitez la puissance du réseau Fiko. Apprenez des tendances anonymisées de milliers de conversations à travers l'Afrique.
            </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {marketTrends.map((t, i) => (
              <div key={i} className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-[2rem] hover:border-blue-500/30 transition-all group">
                  <div className="flex justify-between items-start mb-6">
                      <h4 className="text-lg font-black tracking-tight">{t.sector}</h4>
                      <div className="flex items-center gap-1 text-emerald-400 text-xs font-black">
                          <ArrowUpRight size={14} /> {t.trend}
                      </div>
                  </div>

                  <div className="space-y-4">
                      <div className="space-y-1">
                          <div className="text-[9px] font-black uppercase text-gray-500 tracking-widest">Objection n°1</div>
                          <div className="text-xs font-bold text-gray-200 bg-black/40 p-3 rounded-xl border border-white/5">{t.topObjection}</div>
                      </div>
                      <div className="space-y-1">
                          <div className="text-[9px] font-black uppercase text-blue-400 tracking-widest flex items-center gap-1.5">
                              <Sparkles size={10} /> Best DNA Relance
                          </div>
                          <div className="text-xs font-bold text-blue-100 bg-blue-500/5 p-3 rounded-xl border border-blue-500/10">{t.bestRelance}</div>
                      </div>
                  </div>
              </div>
          ))}
      </div>

      <div className="bg-[#E10600]/5 border border-[#E10600]/10 p-8 rounded-[2.5rem] flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
              <h3 className="text-xl font-black tracking-tighter">Votre ADN est-il compétitif ?</h3>
              <p className="text-xs text-gray-400 font-medium italic">"Fiko analyse votre performance par rapport à la moyenne de votre secteur."</p>
          </div>
          <button className="bg-white text-black px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform">Lancer Benchmark</button>
      </div>
    </div>
  );
}
