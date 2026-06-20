import { useState } from 'react';
import {
  Megaphone,
  Send,
  Users,
  Filter,
  Sparkles,
  Image as ImageIcon,
  Video,
  FileText,
  ChevronRight,
  Zap,
  Target,
  BarChart3,
  MapPin,
  Clock,
  Smartphone
} from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  status: 'Draft' | 'Running' | 'Completed';
  sent: number;
  opened: number;
  replied: number;
  lastRun: string;
}

export default function CampaignsModule() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([
    { id: '1', name: 'Promo Flash Cosmétiques Abidjan', status: 'Completed', sent: 1250, opened: 940, replied: 185, lastRun: 'Hier 14:00' },
    { id: '2', name: 'Relance Leads Inactifs Dakar', status: 'Running', sent: 420, opened: 310, replied: 42, lastRun: 'En cours' },
    { id: '3', name: 'Lancement Nouvelle Collection', status: 'Draft', sent: 0, opened: 0, replied: 0, lastRun: 'Jamais' },
  ]);

  const [isCreating, setIsCreating] = useState(false);
  const [campaignPrompt, setCampaignPrompt] = useState('');
  const [generating, setGenerating] = useState(false);

  const handleGenerate = () => {
    if (!campaignPrompt) return;
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      alert("IA FiKO : Campagne générée avec succès ! Cible : Hommes 25-40 ans à Abidjan. Message : 'Découvrez nos nouvelles chemises...'");
    }, 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">

      {/* CAMPAIGN ENGINE HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Megaphone className="text-[#E10600]" size={24} /> Campaign Engine Africa
          </h1>
          <p className="text-gray-500 text-xs">Créez et automatisez vos campagnes WhatsApp à grande échelle.</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-[#E10600] text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-red-700 transition flex items-center gap-2 shadow-lg shadow-red-950/20"
        >
          <Zap size={14} /> Créer une Campagne
        </button>
      </div>

      {/* IA CAMPAIGN BUILDER (NATURAL LANGUAGE) */}
      <div className="bg-[#0b0c15] border border-blue-900/30 p-6 rounded-3xl relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="text-blue-400 animate-spin-slow" size={18} />
          <h3 className="text-white text-sm font-black uppercase tracking-widest">IA Campaign Builder</h3>
        </div>
        <div className="space-y-4">
          <p className="text-xs text-gray-400">Décrivez votre objectif en langage naturel, FiKO s'occupe de la segmentation et du message.</p>
          <div className="flex gap-3">
            <input
              type="text"
              value={campaignPrompt}
              onChange={(e) => setCampaignPrompt(e.target.value)}
              placeholder="Ex: 'Je veux vendre mes chemises pour hommes à Abidjan ce week-end...'"
              className="flex-1 bg-black border border-zinc-800 rounded-2xl p-4 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              onClick={handleGenerate}
              disabled={generating || !campaignPrompt}
              className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {generating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Sparkles size={14} />}
              Générer
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* RECENT CAMPAIGNS LIST */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#0a0a0a] border border-zinc-900 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-zinc-900 flex justify-between items-center">
              <h3 className="text-white text-xs font-black uppercase tracking-widest">Campagnes Récentes</h3>
              <div className="flex gap-2">
                <button className="p-2 bg-zinc-900 text-gray-400 rounded-lg hover:text-white transition"><Filter size={14} /></button>
              </div>
            </div>
            <div className="divide-y divide-zinc-900">
              {campaigns.map((c) => (
                <div key={c.id} className="p-5 flex items-center justify-between hover:bg-zinc-900/30 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${c.status === 'Running' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-gray-500'}`}>
                      <Megaphone size={18} className={c.status === 'Running' ? 'animate-pulse' : ''} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-[#E10600] transition-colors">{c.name}</h4>
                      <p className="text-[10px] text-gray-500 font-mono uppercase mt-1">{c.status} • {c.lastRun}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-center hidden sm:block">
                      <span className="text-[11px] font-black text-white font-mono">{c.sent}</span>
                      <p className="text-[8px] text-gray-500 uppercase font-black">Envoyés</p>
                    </div>
                    <div className="text-center hidden sm:block">
                      <span className="text-[11px] font-black text-blue-400 font-mono">{Math.round((c.opened/c.sent)*100 || 0)}%</span>
                      <p className="text-[8px] text-gray-500 uppercase font-black">Ouverture</p>
                    </div>
                    <div className="text-center">
                      <span className="text-[11px] font-black text-emerald-400 font-mono">{Math.round((c.replied/c.sent)*100 || 0)}%</span>
                      <p className="text-[8px] text-gray-500 uppercase font-black">Réponse</p>
                    </div>
                    <button className="p-2 text-gray-600 hover:text-white transition">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SEGMENTATION RADAR */}
        <div className="bg-[#0a0a0f] border border-gray-900 rounded-3xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center gap-2 border-b border-gray-950 pb-4">
            <Users className="text-purple-400" size={18} />
            <h3 className="text-white text-xs font-black uppercase tracking-widest">Segmentation Afrique</h3>
          </div>

          <div className="space-y-5">
            <div className="space-y-3">
              <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest block">Par Région (CIV/SEN)</span>
              <div className="space-y-2">
                {[
                  { label: 'Abidjan (Cocody/Plateau)', count: 4200, color: 'bg-emerald-500' },
                  { label: 'Dakar (Plateau/Almadies)', count: 2800, color: 'bg-blue-500' },
                  { label: 'Douala (Akwa/Bonapriso)', count: 1500, color: 'bg-purple-500' }
                ].map((s) => (
                  <div key={s.label} className="space-y-1.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-300 font-medium">{s.label}</span>
                      <span className="text-white font-mono font-black">{s.count}</span>
                    </div>
                    <div className="w-full bg-black h-1 rounded-full overflow-hidden">
                      <div className={`${s.color} h-full`} style={{ width: `${(s.count/5000)*100}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-zinc-900">
              <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest block">Types de Médias supportés</span>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-zinc-950 border border-zinc-900 p-2.5 rounded-xl flex items-center gap-2 text-[10px] font-bold text-gray-400">
                  <ImageIcon size={14} className="text-blue-400" /> Image (PNG/JPG)
                </div>
                <div className="bg-zinc-950 border border-zinc-900 p-2.5 rounded-xl flex items-center gap-2 text-[10px] font-bold text-gray-400">
                  <Video size={14} className="text-red-400" /> Vidéo (MP4)
                </div>
                <div className="bg-zinc-950 border border-zinc-900 p-2.5 rounded-xl flex items-center gap-2 text-[10px] font-bold text-gray-400">
                  <FileText size={14} className="text-emerald-400" /> Document (PDF)
                </div>
                <div className="bg-zinc-950 border border-zinc-900 p-2.5 rounded-xl flex items-center gap-2 text-[10px] font-bold text-gray-400">
                  <Smartphone size={14} className="text-amber-400" /> Audio (Push)
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
