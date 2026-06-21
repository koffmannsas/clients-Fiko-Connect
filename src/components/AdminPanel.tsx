import { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Users, Shield, Activity, Search, ChevronRight } from 'lucide-react';

export default function AdminPanel() {
  const [companies, setCompanies] = useState<any[]>([]);

  useEffect(() => {
    const fetchCompanies = async () => {
      const snap = await getDocs(collection(db, 'companies'));
      setCompanies(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchCompanies();
  }, []);

  const toggleStatus = async (id: string, current: string) => {
      await updateDoc(doc(db, 'companies', id), {
          status: current === 'active' ? 'suspended' : 'active',
          updatedAt: serverTimestamp()
      });
      setCompanies(prev => prev.map(c => c.id === id ? { ...c, status: current === 'active' ? 'suspended' : 'active' } : c));
  };

  return (
    <div className="space-y-6 text-white p-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-2 tracking-tighter">
            <Shield className="text-purple-400" size={24} /> FIKO INTERNAL COMMAND
          </h2>
          <p className="text-gray-500 text-xs">Super Admin Access - Managed Accounts.</p>
        </div>
      </div>

      <div className="bg-[#0a0a0a] border border-zinc-900 rounded-3xl overflow-hidden shadow-xl">
        <table className="w-full text-left">
          <thead className="bg-black/50 text-gray-500 text-[9px] font-black uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4">Organisation</th>
              <th className="px-6 py-4">WhatsApp</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-900">
            {companies.map((c) => (
              <tr key={c.id} className="hover:bg-zinc-900/30 transition-colors">
                <td className="px-6 py-4">
                  <p className="text-xs font-bold text-white">{c.id}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-xs font-mono text-gray-400">{c.whatsappNumber}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${c.status === 'active' ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
                    {c.status || 'active'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => toggleStatus(c.id, c.status || 'active')}
                    className="text-[10px] font-black text-purple-400 hover:underline"
                  >
                    {c.status === 'suspended' ? 'Réactiver' : 'Suspendre'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
