import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Coins, 
  TrendingUp, 
  ArrowUpRight, 
  CheckCircle, 
  XCircle, 
  Download, 
  Settings, 
  Smartphone,
  ShieldCheck,
  Building,
  RefreshCw,
  Wallet,
  Loader2
} from 'lucide-react';
import { AnalyticsService } from '../services/analytics.service';

export default function PaymentsModule({ onboardingData }: { onboardingData: any }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const companyId = onboardingData?.companyId;

  useEffect(() => {
    if (!companyId) return;
    const load = async () => {
        const s = await AnalyticsService.getPaymentStats(companyId);
        setStats(s);
        setLoading(false);
    };
    load();
  }, [companyId]);

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-[#E10600]" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#060a0b] border border-emerald-950/60 p-6 rounded-2xl relative overflow-hidden group">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest flex items-center gap-1">
              <Wallet size={12} /> Solde Mobile Money Net
            </span>
          </div>
          <p className="text-3xl font-black text-white font-mono">{(stats?.net || 0).toLocaleString()} F</p>
        </div>

        <div className="bg-[#0a0a0a] border border-gray-900 p-6 rounded-2xl relative">
          <span className="text-[10px] text-gray-500 font-extrabold uppercase block mb-1">Encaissements Totaux</span>
          <p className="text-2xl font-black text-white font-mono">{(stats?.totalRevenue || 0).toLocaleString()} F</p>
        </div>

        <div className="bg-[#0a0a0a] border border-gray-900 p-6 rounded-2xl relative">
          <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Frais Fiko (1%)</span>
          <p className="text-2xl font-black text-white font-mono">{(stats?.fees || 0).toLocaleString()} F</p>
        </div>
      </div>

      <div className="bg-[#0a0a0a] border border-gray-850 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-gray-900">
              <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">Journaux des Transactions Fiko Pay</h3>
          </div>
          <table className="w-full text-left">
            <thead className="bg-[#111] text-gray-400 text-[10px] font-black uppercase">
              <tr>
                <th className="p-4">Prospect</th>
                <th className="p-4">Montant</th>
                <th className="p-4 text-center">Statut</th>
                <th className="p-4 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-900 text-xs">
              {stats?.transactions?.map((tx: any, i: number) => (
                <tr key={i} className="hover:bg-[#111]/60 transition">
                  <td className="p-4 font-bold">{tx.phone}</td>
                  <td className="p-4 font-mono font-black">{tx.amount.toLocaleString()} F</td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${tx.status === 'SUCCESS' ? 'bg-emerald-900/20 text-emerald-400' : 'bg-red-900/20 text-red-400'}`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="p-4 text-right text-gray-500">{new Date(tx.timestamp?.seconds * 1000).toLocaleDateString()}</td>
                </tr>
              ))}
              {(!stats?.transactions || stats.transactions.length === 0) && (
                <tr><td colSpan={4} className="p-12 text-center text-gray-600 font-black uppercase tracking-widest text-[10px]">Aucune transaction réelle détectée</td></tr>
              )}
            </tbody>
          </table>
      </div>
    </div>
  );
}
