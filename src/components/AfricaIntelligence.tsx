import { useState } from 'react';
import {
  Globe,
  TrendingUp,
  Users,
  Activity,
  MapPin,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Layers,
  Search
} from 'lucide-react';

export default function AfricaIntelligenceModule() {
  const [selectedCity, setSelectedCity] = useState('Abidjan');

  const data = {
    'Abidjan': { country: 'Côte d’Ivoire', activity: '92%', response: '11s', growth: '+14%' },
    'Dakar': { country: 'Sénégal', activity: '88%', response: '14s', growth: '+12%' },
    'Douala': { country: 'Cameroun', activity: '81%', response: '19s', growth: '+9%' },
    'Cotonou': { country: 'Bénin', activity: '77%', response: '18s', growth: '+11%' },
    'Lomé': { country: 'Togo', activity: '72%', response: '22s', growth: '+8%' }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">

      {/* AFRICA INTELLIGENCE HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Globe className="text-blue-400" size={24} /> Fiko Africa Intelligence
          </h1>
          <p className="text-gray-500 text-xs">L'observatoire en temps réel du commerce conversationnel en Afrique.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* MAP VISUALIZATION PLACEHOLDER */}
        <div className="lg:col-span-2 bg-[#0a0a0a] border border-gray-900 rounded-3xl p-10 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl min-h-[500px]">
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
          <div className="relative z-10 text-center space-y-6">
            <div className="w-64 h-64 mx-auto bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20 animate-pulse">
               <Globe size={120} className="text-blue-500/40" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white uppercase tracking-widest italic">Africa Command Board</h3>
              <p className="text-gray-500 text-sm max-w-md mx-auto">Visualisez l'expansion de votre empire commercial à travers le continent.</p>
            </div>

            {/* Dynamic Map Pins (Simulation) */}
            <div className="flex flex-wrap justify-center gap-4 pt-6">
              {Object.keys(data).map((city) => (
                <button
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedCity === city ? 'bg-blue-600 text-white border-transparent scale-110 shadow-lg shadow-blue-900/40' : 'bg-black text-gray-500 border-zinc-900 hover:text-white hover:border-blue-500/50'}`}
                >
                  <MapPin size={12} className="inline mr-1" /> {city}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CITY INSIGHTS CARD */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-zinc-900 to-black border border-gray-900 rounded-3xl p-6 shadow-xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-3xl"></div>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest block mb-1">Rapport de Ville</span>
                <h2 className="text-3xl font-black text-white">{selectedCity}</h2>
                <p className="text-xs text-gray-500">{(data as any)[selectedCity].country}</p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-emerald-400 text-[10px] font-black">
                EN LIGNE
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/60 border border-zinc-900 p-4 rounded-2xl space-y-1">
                <span className="text-[9px] text-gray-500 uppercase font-black block">Activité</span>
                <p className="text-xl font-mono font-black text-white">{(data as any)[selectedCity].activity}</p>
              </div>
              <div className="bg-black/60 border border-zinc-900 p-4 rounded-2xl space-y-1">
                <span className="text-[9px] text-gray-500 uppercase font-black block">Réponse</span>
                <p className="text-xl font-mono font-black text-purple-400">{(data as any)[selectedCity].response}</p>
              </div>
              <div className="bg-black/60 border border-zinc-900 p-4 rounded-2xl space-y-1">
                <span className="text-[9px] text-gray-500 uppercase font-black block">Croissance</span>
                <p className="text-xl font-mono font-black text-emerald-400">{(data as any)[selectedCity].growth}</p>
              </div>
              <div className="bg-black/60 border border-zinc-900 p-4 rounded-2xl space-y-1">
                <span className="text-[9px] text-gray-500 uppercase font-black block">Leads</span>
                <p className="text-xl font-mono font-black text-blue-400">+127</p>
              </div>
            </div>

            <div className="bg-blue-600/5 border border-blue-500/20 p-4 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-[10px] text-blue-400 font-black uppercase tracking-widest">
                <TrendingUp size={14} /> Tendance Locale
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
                À <strong className="text-white">{selectedCity}</strong>, les paiements par Wave ont augmenté de 22% le dimanche soir. L'IA a optimisé les relances en conséquence.
              </p>
            </div>
          </div>

          <div className="bg-[#0a0a0a] border border-gray-900 rounded-3xl p-6 space-y-4 shadow-xl">
             <div className="flex items-center gap-2 border-b border-gray-950 pb-3">
              <Layers className="text-amber-500" size={16} />
              <h3 className="text-white text-[10px] font-black uppercase tracking-widest">Index Regional UEMOA</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Indice Confiance', val: 94, color: 'bg-emerald-500' },
                { label: 'Indice Liquidité', val: 87, color: 'bg-blue-500' },
                { label: 'Indice sémantique', val: 91, color: 'bg-purple-500' }
              ].map(i => (
                <div key={i.label} className="space-y-1.5">
                  <div className="flex justify-between text-[9px] font-black text-gray-500 uppercase">
                    <span>{i.label}</span>
                    <span className="text-white">{i.val}%</span>
                  </div>
                  <div className="w-full bg-zinc-950 h-1 rounded-full overflow-hidden">
                    <div className={`${i.color} h-full`} style={{ width: `${i.val}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
