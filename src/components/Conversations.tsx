import { useState, useEffect, useRef, Dispatch, SetStateAction } from 'react';
import { 
  MessageSquare, 
  Send, 
  Bot, 
  Smartphone, 
  ShieldCheck, 
  CreditCard,
  CheckCheck,
  Zap,
  CheckCircle2,
  ExternalLink,
  Copy,
  Clock,
  AlertTriangle,
  RefreshCw,
  Loader2,
  X,
  FileCheck
} from 'lucide-react';
import { Thread, ChatMessage, PaystackWidgetData } from '../types';
export type { Thread };
import { checkWhatsAppServiceWindow } from '../lib/whatsapp';
import { apiPaystackInitialize, apiPaystackVerify, apiWhatsAppSend } from '../lib/api';
import { useCurrency } from '../lib/currency';

export const INITIAL_THREADS: Thread[] = [
  {
    id: 1,
    name: 'Marie Koné',
    avatar: 'M',
    lastMsg: 'Je veux acheter le pack Luxe. Est-ce que vous prenez Wave ou Carte ?',
    time: '12:04',
    unread: true,
    score: 95,
    mobile: '+225 07 48 93 11 20',
    category: 'Client VIP',
    customerEmail: 'marie.kone@example.ci',
    lastClientMessageTimestamp: Date.now() - 1000 * 60 * 35, // 35 minutes ago
    messages: [
      { id: 1, sender: 'client', text: 'Bonjour ! J’ai vu vos offres de closing Fiko OS.', timestamp: '12:00', deliveryStatus: 'received' },
      { id: 2, sender: 'ai', text: 'Bonjour Marie ! Bienvenue chez Fiko Connect. Comment puis-je vous accompagner ? Notre catalogue professionnel est à votre disposition.', timestamp: '12:01', deliveryStatus: 'read' },
      { id: 3, sender: 'client', text: 'Je veux acheter le pack Luxe. Est-ce que vous prenez Wave ou Carte ?', timestamp: '12:04', deliveryStatus: 'received' }
    ]
  },
  {
    id: 2,
    name: 'Koffi Yao (Cocody)',
    avatar: 'K',
    lastMsg: 'D’accord, transmettez-moi le lien Paystack sécurisé.',
    time: '11:45',
    unread: false,
    score: 91,
    mobile: '+225 05 92 84 77 15',
    category: 'Boutique Phys.',
    customerEmail: 'koffi.yao@example.ci',
    lastClientMessageTimestamp: Date.now() - 1000 * 60 * 180, // 3 hours ago
    messages: [
      { id: 1, sender: 'client', text: 'Bonjour, faites-vous des livraisons sur Cocody Saint-Jean ?', timestamp: '11:40', deliveryStatus: 'received' },
      { id: 2, sender: 'ai', text: 'Oui Koffi ! La livraison est de 1 500 FCFA sur Cocody Saint-Jean, assurée sous 2h.', timestamp: '11:41', deliveryStatus: 'read' },
      { id: 3, sender: 'client', text: 'D’accord, transmettez-moi le lien Paystack sécurisé.', timestamp: '11:45', deliveryStatus: 'received' }
    ]
  },
  {
    id: 3,
    name: 'Awa Diallo',
    avatar: 'A',
    lastMsg: 'Combien coûte votre kit de formation de mode ?',
    time: 'Hier',
    unread: false,
    score: 88,
    mobile: '+225 01 02 03 04 05',
    category: 'Formation',
    customerEmail: 'awa.diallo@example.ci',
    lastClientMessageTimestamp: Date.now() - 1000 * 60 * 60 * 30, // 30 hours ago (Service Window Expired!)
    messages: [
      { id: 1, sender: 'client', text: 'Hello, je cherche vos tarifs pour la formation de couture.', timestamp: 'Hier 15:30', deliveryStatus: 'received' },
      { id: 2, sender: 'ai', text: 'Bonjour Awa ! Notre formation de couture est proposée à 19 900 FCFA avec accès complet.', timestamp: 'Hier 15:32', deliveryStatus: 'read' },
      { id: 3, sender: 'client', text: 'Combien coûte votre kit de formation de mode ?', timestamp: 'Hier 15:35', deliveryStatus: 'received' }
    ]
  }
];

interface ConversationsModuleProps {
  threads?: Thread[];
  onThreadsChange?: Dispatch<SetStateAction<Thread[]>>;
}

export default function ConversationsModule({ 
  threads: externalThreads, 
  onThreadsChange 
}: ConversationsModuleProps = {}) {
  const { formatMoney, formatFcfa, isBaseFcfa } = useCurrency();
  const [internalThreads, setInternalThreads] = useState<Thread[]>(INITIAL_THREADS);
  const threads = externalThreads ?? internalThreads;
  const setThreads = onThreadsChange ?? setInternalThreads;

  const [activeThreadId, setActiveThreadId] = useState<string | number>(1);
  const [typedMessage, setTypedMessage] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [verifyingRef, setVerifyingRef] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // Paystack Modal State
  const [showPaystackModal, setShowPaystackModal] = useState(false);
  const [paystackAmount, setPaystackAmount] = useState<number>(25000);
  const [paystackEmail, setPaystackEmail] = useState('');
  const [paystackDesc, setPaystackDesc] = useState('');
  const [isCreatingPaystack, setIsCreatingPaystack] = useState(false);
  const [paystackError, setPaystackError] = useState('');

  const activeThread = threads.find(t => t.id === activeThreadId) || threads[0];
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeThread?.messages, isAiTyping]);

  // Check 24h WhatsApp Service Window
  const serviceWindow = checkWhatsAppServiceWindow(activeThread?.lastClientMessageTimestamp);

  // Handle Paystack Link Generation
  const handleGeneratePaystackLink = async () => {
    setPaystackError('');
    if (!paystackAmount || paystackAmount <= 0) {
      setPaystackError('Le montant doit être supérieur à zéro.');
      return;
    }
    const targetEmail = paystackEmail.trim() || activeThread.customerEmail || `${activeThread.mobile.replace(/[^0-9]/g, '')}@fiko.ci`;
    if (!targetEmail.includes('@')) {
      setPaystackError('Une adresse email client valide est requise par Paystack.');
      return;
    }

    setIsCreatingPaystack(true);
    try {
      const result = await apiPaystackInitialize({
        leadId: activeThread.id,
        customerEmail: targetEmail,
        customerName: activeThread.name,
        customerPhone: activeThread.mobile,
        amountCommercial: Number(paystackAmount),
        description: paystackDesc.trim() || `Facture ${activeThread.name} - Fiko OS`
      });

      const paymentData: PaystackWidgetData = {
        reference: result.reference,
        amountCommercial: Number(paystackAmount),
        currency: 'XOF',
        authorizationUrl: result.authorizationUrl,
        isPaid: false,
        status: 'PENDING',
        mode: result.mode,
        customerEmail: targetEmail
      };

      const linkMessage: ChatMessage = {
        id: 'msg_pay_' + Date.now(),
        sender: 'admin',
        text: `Voici votre lien de règlement Paystack sécurisé (${Number(paystackAmount).toLocaleString()} FCFA) : ${result.authorizationUrl}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        deliveryStatus: 'sent',
        paystackPayment: paymentData
      };

      setThreads(prev => prev.map(t => {
        if (t.id === activeThread.id) {
          return {
            ...t,
            lastMsg: `Lien Paystack envoyé : ${Number(paystackAmount).toLocaleString()} FCFA`,
            messages: [...t.messages, linkMessage]
          };
        }
        return t;
      }));

      setShowPaystackModal(false);
      setPaystackDesc('');
    } catch (err: any) {
      setPaystackError(err.message || 'Erreur lors de la génération du lien Paystack.');
    } finally {
      setIsCreatingPaystack(false);
    }
  };

  // Re-verify a Paystack transaction status
  const handleVerifyPaystack = async (reference: string) => {
    setVerifyingRef(reference);
    try {
      const verifyRes = await apiPaystackVerify(reference);
      if (verifyRes.isPaid) {
        setThreads(prev => prev.map(t => ({
          ...t,
          paidTransactionReference: reference,
          messages: t.messages.map(m => {
            if (m.paystackPayment && m.paystackPayment.reference === reference) {
              return {
                ...m,
                paystackPayment: {
                  ...m.paystackPayment,
                  isPaid: true,
                  status: 'SUCCESS',
                  paidAt: verifyRes.paidAt || new Date().toISOString()
                }
              };
            }
            return m;
          })
        })));
      } else {
        alert(`Statut Paystack actuel : ${verifyRes.gatewayStatus || 'En attente'}`);
      }
    } catch (err: any) {
      alert(`Vérification : ${err.message}`);
    } finally {
      setVerifyingRef(null);
    }
  };

  // Copy authorization link to clipboard
  const handleCopyLink = (url: string, ref: string) => {
    navigator.clipboard.writeText(url);
    setCopySuccess(ref);
    setTimeout(() => setCopySuccess(null), 2500);
  };

  // Handle manual sender actions
  const handleSend = async () => {
    if (!typedMessage.trim() || sendingMessage) return;

    const messageText = typedMessage.trim();
    setTypedMessage('');
    setSendingMessage(true);

    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      sender: 'admin',
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      deliveryStatus: 'sent'
    };

    setThreads(prev => prev.map(t => {
      if (t.id === activeThread.id) {
        return {
          ...t,
          lastMsg: messageText,
          unread: false,
          messages: [...t.messages, userMsg]
        };
      }
      return t;
    }));

    // Dispatch via real WhatsApp Cloud API if configured
    try {
      await apiWhatsAppSend({
        phone: activeThread.mobile,
        text: messageText,
        leadId: activeThread.id
      });
    } catch (sendErr: any) {
      console.warn('[WhatsApp Cloud API notification]:', sendErr.message);
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500 min-h-[640px]">
      
      {/* THREADS LIST - LEFT COLUMN */}
      <div className="bg-[#09090c] border border-gray-850 rounded-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-900 bg-black/40 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-fiko-red" />
            <h3 className="font-black text-xs uppercase tracking-wider text-white">Discussions WhatsApp</h3>
          </div>
          <span className="text-[10px] bg-red-950 text-fiko-red font-mono font-bold px-2 py-0.5 rounded-full border border-red-900/50">
            {threads.filter(t => t.unread).length} Nouveau(x)
          </span>
        </div>

        {/* List of active leads/threads */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-950">
          {threads.map((thread) => {
            const isSelected = thread.id === activeThreadId;
            return (
              <div 
                key={thread.id}
                onClick={() => {
                  setActiveThreadId(thread.id);
                  setThreads(prev => prev.map(t => t.id === thread.id ? { ...t, unread: false } : t));
                }}
                className={`p-4 cursor-pointer transition flex justify-between gap-3 items-start relative ${
                  isSelected ? 'bg-zinc-900/60 border-l-4 border-fiko-red' : 'hover:bg-zinc-950/40'
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-850 to-gray-950 border border-gray-800 flex items-center justify-center font-black text-sm text-fiko-red">
                    {thread.avatar}
                  </div>
                  {thread.unread && (
                    <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#E10600] rounded-full border-2 border-black animate-pulse"></div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <span className="font-extrabold text-xs text-white truncate">{thread.name}</span>
                    <span className="text-[9px] font-mono text-gray-500 shrink-0">{thread.time}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 font-sans truncate leading-snug">
                    {thread.lastMsg}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[8px] bg-zinc-800 text-zinc-300 font-bold px-1.5 py-0.5 rounded uppercase">
                      {thread.category}
                    </span>
                    {thread.paidTransactionReference && (
                      <span className="text-[8px] bg-emerald-950 text-[#25D366] border border-emerald-900 font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                        <CheckCheck size={10} /> Payé
                      </span>
                    )}
                    <span className="text-[8px] text-gray-500 font-mono font-semibold ml-auto">
                      {thread.mobile}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CHAT INTERACTIVE WINDOW - CENTER */}
      <div className="lg:col-span-2 bg-[#09090c] border border-gray-850 rounded-2xl flex flex-col overflow-hidden relative">
        
        {/* Dynamic header with WhatsApp 24h service window status */}
        <div className="p-4 border-b border-gray-900 bg-black/40 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-red-950 border border-red-900/45 text-fiko-red flex items-center justify-center font-black text-xs">
              {activeThread.avatar}
            </div>
            <div>
              <p className="font-black text-xs text-white flex items-center gap-2">
                {activeThread.name}
                <span className="text-[10px] text-zinc-500 font-mono">({activeThread.mobile})</span>
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {serviceWindow.isOpen ? (
                  <span className="text-[9px] text-[#25D366] font-extrabold uppercase flex items-center gap-1.5 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-pulse"></span>
                    Fenêtre WhatsApp 24h Ouverte (Réponse autorisée)
                  </span>
                ) : (
                  <span className="text-[9px] text-amber-400 font-extrabold uppercase flex items-center gap-1.5 font-mono">
                    <Clock size={10} />
                    Fenêtre 24h Expirée (Modèle Meta requis)
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => {
              setPaystackEmail(activeThread.customerEmail || '');
              setShowPaystackModal(true);
            }}
            className="flex items-center gap-1.5 bg-[#00C3F8] hover:bg-[#00A8D6] text-black font-black text-[10px] uppercase px-3 py-1.5 rounded-xl transition shadow-[0_2px_12px_rgba(0,195,248,0.2)]"
          >
            <CreditCard size={12} />
            Lien Paystack
          </button>
        </div>

        {/* 24-Hour Service Window Warning Banner if Expired */}
        {!serviceWindow.isOpen && (
          <div className="bg-amber-950/40 border-b border-amber-900/60 p-2.5 px-4 text-[10px] text-amber-200 flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-400 shrink-0" />
            <span>
              {serviceWindow.warningMessage || 'Fenêtre de service de 24h WhatsApp fermée. Les messages libres ne peuvent pas être distribués par Meta.'}
            </span>
          </div>
        )}

        {/* Chat screen */}
        <div 
          className="flex-1 p-4 overflow-y-auto space-y-4"
          style={{ 
            backgroundImage: `radial-gradient(ellipse at bottom, rgba(50,15,15,0.08) 0%, rgba(5,5,5,0) 100%)`
          }}
        >
          {activeThread.messages.map((message) => {
            const isAdmin = message.sender === 'admin';
            const isAI = message.sender === 'ai';
            const paystackWidget = message.paystackPayment;
            
            return (
              <div 
                key={message.id}
                className={`flex flex-col max-w-[85%] ${
                  isAdmin ? 'ml-auto items-end' : 'mr-auto items-start'
                }`}
              >
                {/* Message Bubble */}
                <div className={`p-3.5 rounded-2xl ${
                  isAdmin 
                    ? 'bg-fiko-red text-white rounded-tr-none' 
                    : isAI 
                      ? 'bg-zinc-900 border border-zinc-800 text-gray-200 rounded-tl-none relative overflow-hidden' 
                      : 'bg-zinc-950 border border-zinc-900 text-white rounded-tl-none'
                }`}>
                  {isAI && (
                    <div className="flex items-center gap-1 mb-1.5 text-[8px] uppercase tracking-widest font-black text-red-400">
                      <Bot size={10} /> <span>Fiko AI Commercial</span>
                    </div>
                  )}
                  <p className="text-xs font-medium leading-relaxed font-sans">{message.text}</p>

                  {/* REAL PAYSTACK PAYMENT WIDGET */}
                  {paystackWidget && (
                    <div className="mt-3 p-3.5 rounded-xl bg-black border border-sky-900/60 flex flex-col gap-2.5 shadow-xl">
                      <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#00C3F8]"></span>
                          <span className="text-[9px] uppercase font-black tracking-widest text-[#00C3F8]">
                            Passerelle Paystack ({paystackWidget.currency})
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-xs font-black text-white block">
                            {formatMoney(paystackWidget.amountCommercial)}
                          </span>
                          {!isBaseFcfa && (
                            <span className="font-mono text-[9px] text-zinc-500 block">
                              {formatFcfa(paystackWidget.amountCommercial)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-[10px] text-zinc-400 space-y-1 font-mono">
                        <p className="flex justify-between">
                          <span>Réf Fiko :</span>
                          <span className="text-zinc-200">{paystackWidget.reference}</span>
                        </p>
                        <p className="flex justify-between">
                          <span>Client :</span>
                          <span className="text-zinc-200">{paystackWidget.customerEmail || activeThread.customerEmail}</span>
                        </p>
                        {paystackWidget.mode && (
                          <p className="flex justify-between">
                            <span>Mode :</span>
                            <span className={paystackWidget.mode === 'test' ? 'text-amber-400' : 'text-emerald-400'}>
                              {paystackWidget.mode === 'test' ? 'TEST (Sandbox)' : 'LIVE (Réel)'}
                            </span>
                          </p>
                        )}
                      </div>

                      {/* Payment Status State */}
                      {paystackWidget.status === 'SUCCESS' || paystackWidget.isPaid ? (
                        <div className="bg-emerald-950/60 border border-emerald-900 p-2.5 rounded-lg text-emerald-300 font-black text-[11px] flex items-center justify-center gap-2">
                          <CheckCircle2 size={16} className="text-[#25D366]" />
                          <span>Paiement Paystack Confirmé ✓</span>
                        </div>
                      ) : (
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center justify-between text-[10px] bg-zinc-900/80 p-2 rounded-lg border border-zinc-800">
                            <span className="text-amber-400 font-bold flex items-center gap-1.5">
                              <Clock size={12} className="animate-spin" />
                              En attente de règlement client
                            </span>
                          </div>

                          <div className="flex gap-2">
                            {paystackWidget.authorizationUrl && (
                              <>
                                <a 
                                  href={paystackWidget.authorizationUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex-1 bg-[#00C3F8] hover:bg-[#00A8D6] text-black font-black text-[10px] py-2 rounded-lg flex items-center justify-center gap-1 uppercase transition"
                                >
                                  Payer <ExternalLink size={12} />
                                </a>
                                <button 
                                  onClick={() => handleCopyLink(paystackWidget.authorizationUrl!, paystackWidget.reference)}
                                  className="bg-zinc-800 hover:bg-zinc-700 text-white px-2.5 py-2 rounded-lg text-[10px] font-bold flex items-center gap-1 transition"
                                  title="Copier le lien de paiement"
                                >
                                  <Copy size={12} />
                                  {copySuccess === paystackWidget.reference ? 'Copié !' : 'Copier'}
                                </button>
                              </>
                            )}

                            <button 
                              onClick={() => handleVerifyPaystack(paystackWidget.reference)}
                              disabled={verifyingRef === paystackWidget.reference}
                              className="bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 px-3 py-2 rounded-lg text-[10px] font-bold flex items-center gap-1 transition disabled:opacity-50"
                              title="Vérifier l'état auprès de Paystack"
                            >
                              <RefreshCw size={12} className={verifyingRef === paystackWidget.reference ? 'animate-spin' : ''} />
                              Vérifier
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Meta details */}
                <span className="text-[8px] text-gray-500 font-mono mt-1 px-1 flex items-center gap-1.5">
                  <span>{message.timestamp}</span>
                  <span>•</span>
                  <span>{isAdmin ? 'Agent Commercial' : isAI ? 'Fiko AI' : 'Client WhatsApp'}</span>
                  {message.deliveryStatus && (
                    <>
                      <span>•</span>
                      <span className="capitalize">{message.deliveryStatus}</span>
                    </>
                  )}
                </span>
              </div>
            );
          })}

          {isAiTyping && (
            <div className="mr-auto flex gap-1.5 items-center p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs">
              <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-75"></span>
              <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-150"></span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* INPUT AND ACTIONS */}
        <div className="p-4 border-t border-gray-900 bg-black/40 space-y-3">
          <div className="flex gap-2">
            <input 
              value={typedMessage} 
              onChange={e => setTypedMessage(e.target.value)} 
              onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
              placeholder={serviceWindow.isOpen ? "Répondez au client WhatsApp..." : "Fenêtre 24h expirée (message libre non garanti)..."} 
              className="flex-1 p-2.5 pl-4 bg-gray-950 border border-gray-900 text-white rounded-xl text-xs focus:outline-none focus:border-fiko-red" 
            />
            <button 
              onClick={handleSend}
              disabled={sendingMessage || !typedMessage.trim()}
              className="bg-[#E10600] text-white p-2.5 px-4 rounded-xl font-bold hover:bg-red-700 transition disabled:opacity-40 flex items-center gap-1.5 text-xs"
            >
              {sendingMessage ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              <span>Envoyer</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: GENERATE PAYSTACK PAYMENT LINK */}
      {showPaystackModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0c10] border border-sky-900/60 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <button 
              onClick={() => setShowPaystackModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-sky-950 border border-sky-900 rounded-xl text-[#00C3F8]">
                <CreditCard size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Générer un Lien Paystack</h3>
                <p className="text-[11px] text-zinc-400">Encaissement sécurisé en Franc CFA (XOF)</p>
              </div>
            </div>

            {paystackError && (
              <div className="bg-red-950/40 border border-red-900/60 p-3 rounded-xl text-red-300 text-xs mb-4">
                {paystackError}
              </div>
            )}

            <div className="space-y-4 text-xs font-sans">
              <div>
                <label className="text-zinc-400 font-bold block mb-1">Montant commercial (FCFA / XOF) *</label>
                <div className="relative">
                  <input 
                    type="number"
                    value={paystackAmount}
                    onChange={e => setPaystackAmount(Number(e.target.value))}
                    min={100}
                    step={100}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white font-mono text-sm focus:outline-none focus:border-[#00C3F8]"
                    placeholder="25000"
                  />
                  <span className="absolute right-3 top-3 text-zinc-500 font-mono font-bold text-xs">FCFA</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1 font-mono">
                  Équivalent envoyé à Paystack : {(paystackAmount * 100).toLocaleString('fr-FR')} centimes/subunits
                  {!isBaseFcfa ? ` • Aperçu : ${formatMoney(paystackAmount)}` : ''}
                </p>
              </div>

              <div>
                <label className="text-zinc-400 font-bold block mb-1">Email du client (requis par Paystack) *</label>
                <input 
                  type="email"
                  value={paystackEmail}
                  onChange={e => setPaystackEmail(e.target.value)}
                  placeholder="client@example.ci"
                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-[#00C3F8]"
                />
              </div>

              <div>
                <label className="text-zinc-400 font-bold block mb-1">Description / Motif de facturation</label>
                <input 
                  type="text"
                  value={paystackDesc}
                  onChange={e => setPaystackDesc(e.target.value)}
                  placeholder="Ex: Commande VIP - Vente WhatsApp"
                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-[#00C3F8]"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowPaystackModal(false)}
                  className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 py-3 rounded-xl font-bold uppercase text-[10px]"
                >
                  Annuler
                </button>
                <button 
                  type="button"
                  onClick={handleGeneratePaystackLink}
                  disabled={isCreatingPaystack}
                  className="flex-1 bg-[#00C3F8] hover:bg-[#00A8D6] text-black py-3 rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isCreatingPaystack ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                  <span>Créer le lien</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
