import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  Clock,
  ShieldCheck, 
  Smartphone,
  RefreshCw,
  Wallet,
  ExternalLink,
  Filter,
  AlertCircle
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import { apiVerifyPaystackPayment, apiGetPaystackStatus } from '../lib/api';
import { PaymentTransactionRecord } from '../types';

export default function PaymentsModule() {
  const [transactions, setTransactions] = useState<PaymentTransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingRef, setVerifyingRef] = useState<string | null>(null);
  const [verifyMessage, setVerifyMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [modeFilter, setModeFilter] = useState<'all' | 'live' | 'test'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'SUCCESS' | 'PENDING' | 'FAILED'>('all');
  const [paystackConfig, setPaystackConfig] = useState<{
    configured: boolean;
    mode: 'live' | 'test';
    publicKey: string;
    currency: string;
  } | null>(null);

  // Load Paystack backend config status
  useEffect(() => {
    let isMounted = true;
    apiGetPaystackStatus()
      .then(res => {
        if (isMounted) setPaystackConfig(res);
      })
      .catch(err => {
        console.warn("Could not load Paystack status:", err);
      });
    return () => { isMounted = false; };
  }, []);

  // Listen to Firestore transactions for this user's company
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupListener = async () => {
      const user = auth.currentUser;
      if (!user) {
        // Fallback demo transactions
        setTransactions([
          {
            id: 'tx_demo_01',
            reference: 'FIKO_DEMO_WAVE_01',
            paystackReference: 'PSTK_CIV_DEMO_01',
            companyId: 'sandbox_demo_reviewer_68',
            amount: 45000,
            currency: 'XOF',
            customerName: 'Marie Koné (Démo)',
            customerEmail: 'marie.kone@example.com',
            channel: 'Wave (via Paystack)',
            status: 'SUCCESS',
            mode: 'test',
            createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
            paidAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          },
          {
            id: 'tx_demo_02',
            reference: 'FIKO_DEMO_OM_02',
            paystackReference: 'PSTK_CIV_DEMO_02',
            companyId: 'sandbox_demo_reviewer_68',
            amount: 24900,
            currency: 'XOF',
            customerName: 'Koffi Yao (Démo)',
            customerEmail: 'koffi.yao@example.com',
            channel: 'Orange Money (via Paystack)',
            status: 'SUCCESS',
            mode: 'test',
            createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
            paidAt: new Date(Date.now() - 3600000 * 5).toISOString(),
          }
        ]);
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const companyId = userDoc.exists() ? userDoc.data()?.companyId : null;

        if (!companyId) {
          setLoading(false);
          return;
        }

        const q = query(
          collection(db, 'transactions'),
          where('companyId', '==', companyId),
          orderBy('createdAt', 'desc')
        );

        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const list: PaymentTransactionRecord[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              list.push({
                id: docSnap.id,
                reference: data.reference || docSnap.id,
                paystackReference: data.paystackReference,
                companyId: data.companyId,
                leadId: data.leadId,
                amount: data.amount || 0,
                currency: data.currency || 'XOF',
                customerName: data.customerName || 'Client',
                customerEmail: data.customerEmail || '',
                channel: data.channel || 'Paystack',
                status: data.status || 'PENDING',
                mode: data.mode || (data.reference?.includes('_TEST_') ? 'test' : 'live'),
                checkoutUrl: data.checkoutUrl,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || new Date().toISOString(),
                paidAt: data.paidAt?.toDate ? data.paidAt.toDate().toISOString() : data.paidAt,
                gatewayResponse: data.gatewayResponse,
              });
            });
            setTransactions(list);
            setLoading(false);
          },
          (err) => {
            console.warn("Firestore transactions snapshot error (using empty/fallback):", err);
            setLoading(false);
          }
        );
      } catch (err) {
        console.warn("Error setting up transactions listener:", err);
        setLoading(false);
      }
    };

    setupListener();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleManualVerify = async (reference: string) => {
    setVerifyingRef(reference);
    setVerifyMessage(null);
    try {
      const res = await apiVerifyPaystackPayment(reference);
      if (res.status === 'SUCCESS') {
        setVerifyMessage({
          text: `Paiement vérifié avec succès auprès de Paystack ! Montant : ${res.amount.toLocaleString()} ${res.currency}.`,
          type: 'success'
        });
      } else if (res.status === 'PENDING') {
        setVerifyMessage({
          text: `Transaction toujours en attente de validation client sur Paystack (${res.reference}).`,
          type: 'info'
        });
      } else {
        setVerifyMessage({
          text: `Statut retourné par Paystack : ${res.status}. ${res.gatewayResponse || ''}`,
          type: 'error'
        });
      }
    } catch (err: any) {
      setVerifyMessage({
        text: err.message || "Erreur lors de la vérification sur Paystack.",
        type: 'error'
      });
    } finally {
      setVerifyingRef(null);
    }
  };

  // Calculations with strict Live vs Test separation
  const liveSuccessful = transactions.filter(t => t.status === 'SUCCESS' && t.mode === 'live');
  const testSuccessful = transactions.filter(t => t.status === 'SUCCESS' && t.mode === 'test');
  const pendingTransactions = transactions.filter(t => t.status === 'PENDING');

  const liveRevenue = liveSuccessful.reduce((sum, t) => sum + t.amount, 0);
  const testRevenue = testSuccessful.reduce((sum, t) => sum + t.amount, 0);

  // Filtered view
  const filteredTransactions = transactions.filter(t => {
    if (modeFilter === 'live' && t.mode !== 'live') return false;
    if (modeFilter === 'test' && t.mode !== 'test') return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-12">
      
      {/* GATEWAY MODE BANNER */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
        paystackConfig?.mode === 'live' 
          ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-300' 
          : 'bg-amber-950/20 border-amber-900/50 text-amber-300'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full animate-ping ${paystackConfig?.mode === 'live' ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-xs uppercase tracking-wider font-mono">
                {paystackConfig?.mode === 'live' ? '● PASSERELLE PAYSTACK PRODUCTION (LIVE)' : '● PASSERELLE PAYSTACK TEST SANDBOX'}
              </span>
              <span className="text-[10px] bg-black/60 px-2 py-0.5 rounded border border-white/10 uppercase font-mono font-bold">
                Devise : {paystackConfig?.currency || 'XOF'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Encaissements unifiés : Wave, Orange Money, MTN MoMo et Cartes bancaires avec conversion automatique en sous-unités Paystack (centimes).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-zinc-400 font-mono">Isolation stricte :</span>
          <span className="text-[10px] font-black uppercase px-2 py-1 rounded bg-black/80 border border-white/10 text-white font-mono">
            Ledger Justifié ✓
          </span>
        </div>
      </div>

      {/* VERIFICATION FEEDBACK BANNER */}
      {verifyMessage && (
        <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
          verifyMessage.type === 'success' 
            ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
            : verifyMessage.type === 'info'
            ? 'bg-blue-950/40 border-blue-800 text-blue-300'
            : 'bg-red-950/40 border-red-800 text-red-300'
        }`}>
          <span>{verifyMessage.text}</span>
          <button onClick={() => setVerifyMessage(null)} className="text-zinc-400 hover:text-white font-bold px-2 py-0.5">×</button>
        </div>
      )}

      {/* METRICS COUNTERS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Live Confirmed Revenue */}
        <div className="bg-[#060a0b] border border-emerald-950/60 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest flex items-center gap-1">
              <Wallet size={12} /> CA Paystack Réel (Live)
            </span>
            <span className="bg-emerald-950 border border-emerald-800 text-[#25D366] text-[8px] font-black uppercase px-2 py-0.5 rounded font-mono">
              Vérifié
            </span>
          </div>
          <p className="text-2xl font-black text-white font-mono">{liveRevenue.toLocaleString()} FCFA</p>
          <div className="text-[10px] text-zinc-500 mt-3 pt-3 border-t border-zinc-900 flex justify-between">
            <span>Transactions Live : <strong className="text-white font-mono">{liveSuccessful.length}</strong></span>
            <span className="text-[#25D366] font-bold">100% encaissé</span>
          </div>
        </div>

        {/* Test Revenue */}
        <div className="bg-[#0a0a0a] border border-amber-950/40 p-5 rounded-2xl relative">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-amber-400 font-extrabold uppercase tracking-widest flex items-center gap-1">
              <CreditCard size={12} /> Volume Test Sandbox
            </span>
            <span className="bg-amber-950 border border-amber-800 text-amber-300 text-[8px] font-black uppercase px-2 py-0.5 rounded font-mono">
              Test
            </span>
          </div>
          <p className="text-2xl font-black text-amber-200 font-mono">{testRevenue.toLocaleString()} FCFA</p>
          <div className="text-[10px] text-zinc-500 mt-3 pt-3 border-t border-zinc-900">
            <span>Transactions Test : <strong className="text-amber-300 font-mono">{testSuccessful.length}</strong> (isolées du CA réel)</span>
          </div>
        </div>

        {/* Pending Transactions */}
        <div className="bg-[#0a0a0a] border border-zinc-900 p-5 rounded-2xl relative">
          <span className="text-[10px] text-zinc-500 font-extrabold uppercase block mb-1">En Attente de Paiement</span>
          <p className="text-2xl font-black text-white font-mono">{pendingTransactions.length}</p>
          <p className="text-[10px] text-amber-400 mt-3 flex items-center gap-1">
            <Clock size={12} /> Liens envoyés non encore clôturés
          </p>
        </div>

        {/* Global Conversion Rate */}
        <div className="bg-[#0a0a0a] border border-zinc-900 p-5 rounded-2xl relative">
          <span className="text-[10px] text-zinc-500 font-extrabold uppercase block mb-1">Taux Clôture Paystack</span>
          <p className="text-2xl font-black text-white font-mono">
            {transactions.length > 0 
              ? `${Math.round(((liveSuccessful.length + testSuccessful.length) / transactions.length) * 100)}%` 
              : '0%'}
          </p>
          <p className="text-[10px] text-emerald-400 mt-3 flex items-center gap-1">
            <TrendingUp size={12} /> Sur l'ensemble des liens émis
          </p>
        </div>
      </div>

      {/* MAIN SECTION: LEDGER & INTEGRATION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEDGER TABLE (2 COLS) */}
        <div className="col-span-1 lg:col-span-2 bg-[#0a0a0a] border border-zinc-850 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-zinc-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#E10600]" /> Grand Livre des Transactions Paystack
              </h3>
              <p className="text-zinc-500 text-xs mt-0.5">
                Historique auditable justifié par signature de webhook et vérification d'API
              </p>
            </div>
            
            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Mode filter */}
              <div className="bg-black p-1 rounded-xl border border-zinc-900 flex gap-1">
                {(['all', 'live', 'test'] as const).map((m) => (
                  <button 
                    key={m}
                    onClick={() => setModeFilter(m)}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition ${
                      modeFilter === m ? 'bg-[#E10600] text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {m === 'all' ? 'Tous' : m}
                  </button>
                ))}
              </div>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-black border border-zinc-900 text-zinc-300 text-[10px] font-bold rounded-xl px-2.5 py-1.5 focus:outline-none"
              >
                <option value="all">Tous statuts</option>
                <option value="SUCCESS">Succès (Payé)</option>
                <option value="PENDING">En attente</option>
                <option value="FAILED">Échoué</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-zinc-500 text-xs font-mono">
              Chargement des transactions depuis Firestore...
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-xs">
              <p className="font-bold text-zinc-400 mb-1">Aucune transaction trouvée</p>
              <p className="text-[11px]">
                Générez un lien Paystack dans le module "Conversations" pour initier un paiement réel.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#111] text-zinc-400 text-[9px] font-black uppercase">
                  <tr>
                    <th className="p-3.5">Réf Fiko / Client</th>
                    <th className="p-3.5">Montant</th>
                    <th className="p-3.5">Mode</th>
                    <th className="p-3.5">Canal</th>
                    <th className="p-3.5 text-center">Statut</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 text-xs font-sans">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id || tx.reference} className="hover:bg-zinc-950/60 transition">
                      <td className="p-3.5">
                        <p className="font-extrabold text-white text-[11px]">{tx.customerName}</p>
                        <p className="text-[9.5px] text-zinc-500 font-mono tracking-tight">
                          {tx.reference}
                        </p>
                        {tx.customerEmail && (
                          <p className="text-[9px] text-zinc-600 font-mono">{tx.customerEmail}</p>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="font-black text-white font-mono text-xs">
                          {tx.amount.toLocaleString()} FCFA
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase font-mono border ${
                          tx.mode === 'live' 
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-900' 
                            : 'bg-amber-950/60 text-amber-400 border-amber-900'
                        }`}>
                          {tx.mode || 'test'}
                        </span>
                      </td>
                      <td className="p-3.5 text-zinc-400 text-[10px]">
                        {tx.channel || 'Paystack'}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase font-mono ${
                          tx.status === 'SUCCESS' 
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                            : tx.status === 'PENDING' 
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : 'bg-red-950 text-red-400 border border-red-800'
                        }`}>
                          {tx.status === 'SUCCESS' ? <CheckCircle size={10} /> : tx.status === 'PENDING' ? <Clock size={10} /> : <XCircle size={10} />}
                          {tx.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {tx.status === 'PENDING' && (
                            <button
                              onClick={() => handleManualVerify(tx.reference)}
                              disabled={verifyingRef === tx.reference}
                              className="bg-zinc-800 hover:bg-zinc-700 text-white text-[9px] font-bold px-2 py-1 rounded transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              title="Interroger directement l'API Paystack pour confirmer l'encaissement"
                            >
                              <RefreshCw size={10} className={verifyingRef === tx.reference ? 'animate-spin' : ''} />
                              <span>Vérifier</span>
                            </button>
                          )}
                          {tx.checkoutUrl && (
                            <a
                              href={tx.checkoutUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-zinc-400 hover:text-white p-1 rounded transition"
                              title="Ouvrir la page de paiement Paystack"
                            >
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RIGHT SIDE: CONFIGURATION & INTEGRITY */}
        <div className="space-y-4">
          
          {/* PAYSTACK OFFICIAL INTEGRATION CARD */}
          <div className="bg-[#0a0a0a] border border-zinc-850 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-900">
              <ShieldCheck className="text-emerald-400 shrink-0" size={18} />
              <div>
                <h4 className="font-extrabold text-xs text-white uppercase tracking-wider">
                  Passerelle Officielle Paystack
                </h4>
                <span className="text-[9px] text-emerald-400 font-mono">Protocole HMAC SHA512 Actif</span>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Toutes les transactions sont initiées via les serveurs sécurisés Paystack. Les clés secrètes marchandes sont conservées strictement côté serveur (<span className="font-mono text-zinc-300">PAYSTACK_SECRET_KEY</span>) et ne sont jamais exposées au navigateur.
            </p>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-black border border-zinc-900 flex justify-between items-center">
                <span className="text-zinc-500 text-[10px]">WEBHOOK URL :</span>
                <span className="text-zinc-300 text-[10px] select-all">/api/paystack/webhook</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black border border-zinc-900 flex justify-between items-center">
                <span className="text-zinc-500 text-[10px]">SIGNATURE :</span>
                <span className="text-emerald-400 text-[10px] font-bold">x-paystack-signature</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black border border-zinc-900 flex justify-between items-center">
                <span className="text-zinc-500 text-[10px]">SOUS-UNITÉS XOF :</span>
                <span className="text-emerald-400 text-[10px] font-bold">Montant × 100</span>
              </div>
            </div>
          </div>

          {/* SUPPORTED CHANNELS */}
          <div className="bg-[#0a0a0a] border border-zinc-850 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-900">
              <Smartphone className="text-blue-400 shrink-0" size={16} />
              <h4 className="font-extrabold text-xs text-white uppercase tracking-wider">
                Canaux Activés via Paystack
              </h4>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center bg-black/60 p-2.5 rounded-xl border border-zinc-900">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span className="font-bold text-zinc-200">Wave Côte d’Ivoire</span>
                </div>
                <span className="text-[9px] font-mono text-emerald-400 font-bold">ACTIF</span>
              </div>

              <div className="flex justify-between items-center bg-black/60 p-2.5 rounded-xl border border-zinc-900">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  <span className="font-bold text-zinc-200">Orange Money CIV</span>
                </div>
                <span className="text-[9px] font-mono text-emerald-400 font-bold">ACTIF</span>
              </div>

              <div className="flex justify-between items-center bg-black/60 p-2.5 rounded-xl border border-zinc-900">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                  <span className="font-bold text-zinc-200">MTN Mobile Money CIV</span>
                </div>
                <span className="text-[9px] font-mono text-emerald-400 font-bold">ACTIF</span>
              </div>

              <div className="flex justify-between items-center bg-black/60 p-2.5 rounded-xl border border-zinc-900">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  <span className="font-bold text-zinc-200">Cartes Bancaires (Visa / Mastercard)</span>
                </div>
                <span className="text-[9px] font-mono text-emerald-400 font-bold">ACTIF</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
