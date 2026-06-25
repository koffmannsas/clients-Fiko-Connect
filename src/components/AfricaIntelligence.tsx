import { useState, useEffect } from 'react';
import { Globe, Loader2, ArrowUpRight, Sparkles } from 'lucide-react';
import { AnalyticsService } from '../services/analytics.service';

export default function AfricaIntelligenceModule() {
  const [marketTrends, setMarketTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTrends = async () => {
        try {
            const data = await AnalyticsService.getMarketInsights();
            setMarketTrends(Array.isArray(data) ? data : []);
        } catch (e) {
            setMarketTrends([]);
        } finally {
            setLoading(false);
        }
    };
    loadTrends();
  }, []);

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-[#E10600]" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="bg-gradient-to-r from-[#0a0a0a] to-[#111] border border-zinc-800 p-8 rounded-[2.5rem] relative overflow-hidden">
        <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-4">
                <Globe size={12} /> Fiko Intelligence Network™
            </div>
            <h2 className="text-4xl font-black tracking-tighter">Africa Market Insights<span className="text-blue-500">.</span></h2>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {marketTrends.map((t, i) => (
              <div key={i} className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-[2rem] hover:border-blue-500/30 transition-all group">
                  <div className="flex justify-between items-start mb-6">
                      <h4 className="text-lg font-black tracking-tight">{t.sector}</h4>
                      <div className="flex items-center gap-1 text-emerald-400 text-xs font-black"><ArrowUpRight size={14} /> {t.trend}</div>
                  </div>
                  <div className="space-y-4">
                      <div className="space-y-1">
                          <div className="text-[9px] font-black uppercase text-gray-500 tracking-widest">Objection n°1</div>
                          <div className="text-xs font-bold text-gray-200 bg-black/40 p-3 rounded-xl border border-white/5">{t.topObjection}</div>
                      </div>
                  </div>
              </div>
          ))}
          {marketTrends.length === 0 && (
              <div className="lg:col-span-3 p-12 text-center text-gray-600 font-black uppercase tracking-widest text-[10px] border border-zinc-900 rounded-3xl">Synchronisation des données marché...</div>
          )}
      </div>
    </div>
  );
}
