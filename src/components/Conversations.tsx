import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  MessageSquare,
  Send,
  Bot,
  Sparkles,
  Zap,
  Target,
  AlertCircle,
  TrendingUp,
  Smile,
  Meh,
  Frown,
  BrainCircuit,
  Search
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'client' | 'ai' | 'admin';
  content: string;
  timestamp: string;
}

interface Thread {
  id: string;
  name: string;
  avatar: string;
  lastMsg: string;
  time: string;
  score: number;
  mobile: string;
  status: string;
  aiSummary?: string;
  detectedObjections?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  recommendedAction?: string;
}

export default function ConversationsModule({ onboardingData }: { onboardingData: any }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<ChatMessage[]>([]);
  const [typedMessage, setTypedMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const companyId = onboardingData?.companyId || 'fiko_prod_68469';
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'leads'),
      where('companyId', '==', companyId),
      orderBy('updatedAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leadsList = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || data.phone,
          avatar: (data.name || 'P')[0],
          lastMsg: data.lastMessage || '...',
          time: data.updatedAt?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '...',
          score: data.score || 50,
          mobile: data.phone,
          status: data.status || 'NEW',
          aiSummary: data.aiSummary || "Le client souhaite des informations sur les tarifs et la disponibilité.",
          detectedObjections: data.detectedObjections || (data.score < 60 ? ["Prix", "Confiance"] : []),
          sentiment: data.sentiment || (data.score > 70 ? 'positive' : 'neutral'),
          recommendedAction: data.recommendedAction || "Envoyer le devis Wave immédiatement."
        };
      }) as Thread[];
      setThreads(leadsList);
      if (!activeThreadId && leadsList.length > 0) {
        setActiveThreadId(leadsList[0].id);
      }
    });
    return unsubscribe;
  }, [companyId]);

  useEffect(() => {
    if (!activeThreadId) return;
    const q = query(
      collection(db, 'messages'),
      where('companyId', '==', companyId),
      where('conversationId', '==', activeThreadId),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '...'
      })) as ChatMessage[];
      setActiveMessages(msgs);
    });
    return unsubscribe;
  }, [activeThreadId, companyId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages]);

  const handleSend = async () => {
    if (!typedMessage.trim() || !activeThreadId) return;
    const content = typedMessage;
    setTypedMessage('');
    await addDoc(collection(db, 'messages'), {
      companyId,
      conversationId: activeThreadId,
      sender: 'admin',
      content,
      timestamp: serverTimestamp()
    });
  };

  const activeThread = threads.find(t => t.id === activeThreadId);
  const filteredThreads = threads.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.mobile.includes(searchTerm));

  const SentimentIcon = ({ type }: { type?: string }) => {
    if (type === 'positive') return <Smile className="text-emerald-400" size={16} />;
    if (type === 'negative') return <Frown className="text-red-400" size={16} />;
    return <Meh className="text-amber-400" size={16} />;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)] text-white animate-in fade-in duration-700">

      {/* THREADS LISTING */}
      <div className="lg:col-span-1 bg-[#0a0a0a] border border-gray-900 rounded-3xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-900 bg-black/40 space-y-3">
          <h3 className="font-black text-xs uppercase tracking-widest text-gray-500">Inbox WhatsApp</h3>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 text-gray-600" size={14} />
            <input
              type="text"
              placeholder="Chercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-900 rounded-xl py-2 pl-8 pr-3 text-[10px] focus:outline-none focus:border-[#E10600]"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-950 scrollbar-hide">
          {filteredThreads.map((thread) => (
            <div
              key={thread.id}
              onClick={() => setActiveThreadId(thread.id)}
              className={`p-4 cursor-pointer transition flex gap-3 items-start relative border-l-4 ${thread.id === activeThreadId ? 'bg-zinc-900/40 border-[#E10600]' : 'hover:bg-zinc-950 border-transparent'}`}
            >
              <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-black text-[#E10600] shrink-0">
                {thread.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <p className="font-bold text-xs truncate">{thread.name}</p>
                  <span className="text-[8px] text-gray-600 font-mono">{thread.time}</span>
                </div>
                <p className="text-[10px] text-gray-500 truncate leading-relaxed italic">"{thread.lastMsg}"</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${thread.score >= 80 ? 'bg-emerald-950 text-emerald-500' : 'bg-zinc-950 text-gray-500'}`}>
                    Score {thread.score}
                  </span>
                  <SentimentIcon type={thread.sentiment} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CHAT WINDOW */}
      <div className="lg:col-span-2 bg-[#09090c] border border-gray-900 rounded-3xl flex flex-col overflow-hidden relative">
        {activeThread ? (
          <>
            <div className="p-4 border-b border-gray-900 bg-black/40 flex justify-between items-center z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-red-950 border border-red-900/45 text-[#E10600] flex items-center justify-center font-black text-xs">
                  {activeThread.avatar}
                </div>
                <div>
                  <p className="font-black text-xs">{activeThread.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Client en ligne</span>
                  </div>
                </div>
              </div>
              <button className="bg-zinc-900 border border-zinc-800 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-zinc-800 transition">
                Prendre la main 👋
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-zinc-900/20 via-transparent to-transparent">
              {activeMessages.map((message) => (
                <div key={message.id} className={`flex flex-col max-w-[80%] ${message.sender === 'admin' ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                  <div className={`p-3.5 rounded-2xl text-[12px] leading-relaxed shadow-sm ${message.sender === 'admin' ? 'bg-[#E10600] text-white rounded-tr-none' : message.sender === 'ai' ? 'bg-zinc-900 border border-zinc-800 text-gray-200 rounded-tl-none' : 'bg-zinc-950 border border-zinc-900 text-white rounded-tl-none'}`}>
                    {message.sender === 'ai' && (
                      <div className="flex items-center gap-1 mb-1.5 text-[8px] uppercase tracking-widest font-black text-purple-400">
                        <Bot size={10} /> <span>Fiko Brain Assistant</span>
                      </div>
                    )}
                    <p className="font-medium">{message.content}</p>
                  </div>
                  <span className="text-[8px] text-gray-600 mt-1 px-1 font-mono uppercase">{message.timestamp}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-gray-900 bg-black/40">
              <div className="flex gap-2 bg-zinc-950 border border-zinc-900 rounded-2xl p-1 focus-within:border-[#E10600] transition-colors">
                <input
                  value={typedMessage}
                  onChange={e => setTypedMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Écrire un message..."
                  className="flex-1 p-3 bg-transparent text-white text-xs focus:outline-none"
                />
                <button onClick={handleSend} className="bg-[#E10600] text-white p-3 rounded-xl font-bold hover:bg-red-700 transition active:scale-95">
                  <Send size={16}/>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-4 opacity-50">
            <MessageSquare size={48} />
            <p className="font-black text-xs uppercase tracking-widest font-mono">Sélectionnez une conversation</p>
          </div>
        )}
      </div>

      {/* ULTRA PREMIUM IA INSIGHTS PANEL */}
      <div className="lg:col-span-1 space-y-6">

        {/* SUMMARY & SENTIMENT */}
        <div className="bg-[#0a0a0f] border border-gray-900 rounded-3xl p-5 space-y-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-3xl"></div>
          <div className="flex items-center gap-2 pb-3 border-b border-gray-950">
            <BrainCircuit className="text-purple-400" size={18} />
            <h4 className="font-black text-[10px] text-white uppercase tracking-widest">Intelligence sémantique</h4>
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-2">Résumé IA du besoin</span>
              <p className="text-[11px] text-gray-300 leading-relaxed italic bg-black/40 p-3 rounded-xl border border-zinc-900">
                "{activeThread?.aiSummary}"
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/60 p-3 rounded-xl border border-zinc-900 text-center">
                <span className="text-[8px] text-gray-500 uppercase font-black block mb-1">Sentiment</span>
                <div className="flex justify-center items-center gap-1.5">
                  <SentimentIcon type={activeThread?.sentiment} />
                  <span className="text-[10px] font-bold text-white capitalize">{activeThread?.sentiment}</span>
                </div>
              </div>
              <div className="bg-black/60 p-3 rounded-xl border border-zinc-900 text-center">
                <span className="text-[8px] text-gray-500 uppercase font-black block mb-1">Score Engagement</span>
                <span className="text-[10px] font-mono font-black text-emerald-400">{activeThread?.score}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* OBJECTIONS DETECTED */}
        <div className="bg-[#0a0a0f] border border-gray-900 rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center gap-2">
            <AlertCircle className="text-amber-500" size={16} />
            <h4 className="font-black text-[10px] text-white uppercase tracking-widest">Objections détectées</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeThread?.detectedObjections?.map((obj, i) => (
              <span key={i} className="bg-amber-950/30 text-amber-500 border border-amber-900/50 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-amber-500"></span> {obj}
              </span>
            ))}
            {(!activeThread?.detectedObjections || activeThread.detectedObjections.length === 0) && (
              <span className="text-[10px] text-gray-600 font-medium italic">Aucune objection majeure identifiée.</span>
            )}
          </div>
        </div>

        {/* RECOMMENDED ACTION */}
        <div className="bg-gradient-to-br from-emerald-950/20 to-zinc-950 border border-emerald-900/30 rounded-3xl p-5 space-y-4 shadow-xl relative overflow-hidden">
          <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl"></div>
          <div className="flex items-center gap-2">
            <Sparkles className="text-emerald-400" size={16} />
            <h4 className="font-black text-[10px] text-white uppercase tracking-widest">Meilleure Action (Next Step)</h4>
          </div>
          <p className="text-[11px] text-gray-200 font-bold leading-relaxed">
            {activeThread?.recommendedAction}
          </p>
          <button className="w-full bg-[#25D366] text-black py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20">
            Exécuter via WhatsApp ⚡
          </button>
        </div>

      </div>

    </div>
  );
}
