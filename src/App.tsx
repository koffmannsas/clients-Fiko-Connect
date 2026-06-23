import { useState, useEffect, lazy, Suspense } from 'react';
import { 
  LayoutDashboard, 
  MessageSquareText, 
  Bot, 
  CreditCard, 
  BarChart3, 
  Settings, ShieldCheck,
  Power, 
  User, 
  Megaphone, 
  Lock,
  LogOut,
  AlertTriangle,
  Zap,
  Bell,
  Menu,
  X,
  Globe,
  BrainCircuit
} from 'lucide-react';
import { AuthService } from './services/auth.service';

// Lazy loading for performance optimization (Phase 9)
const Dashboard = lazy(() => import('./components/Dashboard'));
const LeadsModule = lazy(() => import('./components/Leads'));
const CampaignsModule = lazy(() => import('./components/Campaigns'));
const ConversationsModule = lazy(() => import('./components/Conversations'));
const FikoBrainModule = lazy(() => import('./components/FikoBrain'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const AfricaIntelligenceModule = lazy(() => import('./components/AfricaIntelligence'));
const PaymentsModule = lazy(() => import('./components/Payments'));
const AnalyticsModule = lazy(() => import('./components/Analytics'));
const QuantumGate = lazy(() => import('./components/QuantumGate'));

export default function App() {
  const [view, setView] = useState<'quantum' | 'dashboard' | 'loading'>('loading');
  const [activeItem, setActiveItem] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [onboardingData, setOnboardingData] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = AuthService.onAuthChange((user) => {
      if (user) {
        setOnboardingData({
            companyId: user.uid,
            connectedNumber: localStorage.getItem('fiko_phone') || 'Numéro lié'
        });
        setView('dashboard');
      } else {
        setView('quantum');
      }
    });
    return unsubscribe;
  }, []);

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Sales Pipeline', icon: User },
    { name: 'Campaigns', icon: Megaphone },
    { name: 'Conversations', icon: MessageSquareText },
    { name: 'Fiko Brain', icon: BrainCircuit },
    { name: 'Africa Intelligence', icon: Globe },
    { name: 'Payments', icon: CreditCard },
    { name: 'Analytics', icon: BarChart3 },
    { name: 'Settings', icon: Settings },
    { name: 'Admin', icon: ShieldCheck },
  ];

  const handleEnterPlatform = (data: any) => {
    if (data) setOnboardingData(data);
    setView('dashboard');
  };

  const handleLogout = async () => {
    await AuthService.logout();
  };

  if (view === 'loading') {
    return <div className="h-screen bg-black flex items-center justify-center text-[#E10600] font-black animate-pulse">FIKO.</div>;
  }

  if (view === 'quantum') {
    return (
      <Suspense fallback={<div className="h-screen bg-black flex items-center justify-center text-[#E10600] font-black animate-pulse">FIKO.</div>}>
        <QuantumGate onEnter={handleEnterPlatform} />
      </Suspense>
    );
  }

  return (
    <div className="flex bg-[#050505] text-white min-h-screen font-sans overflow-x-hidden">
      
      {/* MOBILE HEADER */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#0a0a0a] border-b border-gray-900 z-50 flex items-center justify-between px-6">
        <h2 className="text-xl font-black tracking-tighter">FIKO<span className="text-[#E10600]">.</span></h2>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-400 hover:text-white transition">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* SIDEBAR */}
      <div className={`
        fixed inset-y-0 left-0 w-64 bg-[#0a0a0a] border-r border-gray-900 p-6 flex flex-col z-40 transition-transform duration-300 lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <h2 className="text-2xl font-black mb-8 text-white tracking-tighter hidden lg:block">
          FIKO<span className="text-[#E10600]">.</span>
        </h2>
        
        <ul className="space-y-1.5 flex-1 mt-12 lg:mt-0">
          {menuItems.map((item) => (
            <li
              key={item.name}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer font-bold text-xs tracking-wide transition-all ${
                activeItem === item.name ? 'bg-[#E10600] text-white shadow-lg shadow-red-950/20' : 'text-gray-400 hover:text-white hover:bg-[#111]'
              }`}
              onClick={() => { setActiveItem(item.name); setIsSidebarOpen(false); }}
            >
              <item.icon size={16} />
              {item.name}
            </li>
          ))}
        </ul>
        
        <div className="pt-4 border-t border-gray-900 mt-auto space-y-3">
          <div className="p-3.5 rounded-xl border border-gray-900 bg-[#050505]">
            <p className="text-[10px] font-black uppercase text-gray-500 mb-1">WhatsApp Status</p>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[11px] font-mono text-gray-300 truncate">{onboardingData?.connectedNumber || '+225...'}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-zinc-900/60 hover:bg-red-900/10 border border-white/5 text-zinc-400 hover:text-white py-3 rounded-xl transition text-[11px] font-black uppercase">
            <LogOut size={13} /> <span>Quitter</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 w-full max-w-[100vw]">
        <Suspense fallback={<div className="h-full flex items-center justify-center text-gray-500 font-black animate-pulse uppercase tracking-widest text-xs">Chargement du module...</div>}>
          {activeItem === 'Dashboard' && <Dashboard onboardingData={onboardingData} />}
          {activeItem === 'Sales Pipeline' && <LeadsModule onboardingData={onboardingData} />}
          {activeItem === 'Campaigns' && <CampaignsModule />}
          {activeItem === 'Conversations' && <ConversationsModule onboardingData={onboardingData} />}
          {activeItem === 'Fiko Brain' && <FikoBrainModule />}
          {activeItem === 'Africa Intelligence' && <AfricaIntelligenceModule />}
          {activeItem === 'Payments' && <PaymentsModule />}
          {activeItem === 'Analytics' && <AnalyticsModule />}
          {activeItem === 'Admin' && <AdminPanel />}
          {activeItem === 'Settings' && <div className="p-8 bg-zinc-950 border border-zinc-900 rounded-3xl text-gray-500 font-mono text-xs">PROCHAINEMENT...</div>}
        </Suspense>
      </div>
    </div>
  );
}
