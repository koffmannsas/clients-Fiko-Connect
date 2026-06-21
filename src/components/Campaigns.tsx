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
  Smartphone,
  Loader2
} from 'lucide-react';
import { AiOmegaService } from '../services/ai-omega.service';

interface Campaign {
  id: string;
  name: string;
  status: 'Draft' | 'Running' | 'Completed';
  sent: number;
  opened: number;
  replied: number;
  lastRun: string;
  message?: string;
  cta?: string;
  segmentation?: string;
}

export default function CampaignsModule({ onboardingData }: { onboardingData: any }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([
    { id: '1', name: 'Promo Flash Cosmétiques Abidjan', status: 'Completed', sent: 1250, opened: 940, replied: 185, lastRun: 'Hier 14:00' },
    { id: '2', name: 'Relance Leads Inactifs Dakar', status: 'Running', sent: 420, opened: 310, replied: 42, lastRun: 'En cours' },
    { id: '3', name: 'Lancement Nouvelle Collection', status: 'Draft', sent: 0, opened: 0, replied: 0, lastRun: 'Jamais' },
  ]);

  const [isCreating, setIsCreating] = useState(false);
  const [campaignPrompt, setCampaignPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const companyId = onboardingData?.companyId || 'fiko_prod_68469';

  const handleGenerate = async () => {
    if (!campaignPrompt || generating) return;
    setGenerating(true);

    const result = await AiOmegaService.generateCampaign(companyId, campaignPrompt);

    const newCampaign: Campaign = {
        id: Date.now().toString(),
        name: result.name,
        status: 'Draft',
        sent: 0,
        opened: 0,
        replied: 0,
        lastRun: 'À l\'instant',
        message: result.message,
        cta: result.cta,
        segmentation: result.segmentation
    };

    setCampaigns(prev => [newCampaign, ...prev]);
    setCampaignPrompt('');
    setGenerating(false);
    alert(`FiKO OMEGA : Campagne "${result.name}" générée !\nCible : ${result.segmentation}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
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
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={14} />}
              Générer
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#0a0a0a] border border-zinc-900 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-zinc-900 flex justify-between items-center">
              <h3 className="text-white text-xs font-black uppercase tracking-widest">Campagnes Récentes</h3>
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
                    <div className="text-center">
                      <span className="text-[11px] font-black text-white font-mono">{c.sent}</span>
                      <p className="text-[8px] text-gray-500 uppercase font-black">Envoyés</p>
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
      </div>
    </div>
  );
}
