import React, { useState, useEffect } from 'react';
import { Shield, Activity, Zap, Server, Globe, Database, AlertTriangle, CheckCircle } from 'lucide-react';
import { db } from '../config/firebase'; // Matches src/config/firebase.ts
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

export const OperationCenter: React.FC = () => {
    const [latestAudit, setAudit] = useState<any>(null);
    const [incidents, setIncidents] = useState<any[]>([]);

    useEffect(() => {
        const qAudit = query(collection(db, 'kcg_health_audits'), orderBy('timestamp', 'desc'), limit(1));
        const unsubscribeAudit = onSnapshot(qAudit, (snap) => {
            if (!snap.empty) setAudit(snap.docs[0].data());
        });

        const qIncidents = query(collection(db, 'kcg_incidents'), orderBy('timestamp', 'desc'), limit(5));
        const unsubscribeIncidents = onSnapshot(qIncidents, (snap) => {
            setIncidents(snap.docs.map(d => d.data()));
        });

        return () => { unsubscribeAudit(); unsubscribeIncidents(); };
    }, []);

    const StatusCard = ({ title, status, latency, icon: Icon }: any) => (
        <div className="bg-black/40 border border-white/10 rounded-xl p-4">
            <div className="flex justify-between items-start mb-2">
                <Icon size={20} className={status === 'UP' ? 'text-green-400' : 'text-red-400'} />
                <span className={}>
                    {status}
                </span>
            </div>
            <h3 className="text-sm font-medium text-white/60">{title}</h3>
            <p className="text-xl font-bold text-white">{latency}ms</p>
        </div>
    );

    return (
        <div className="p-8 max-w-7xl mx-auto text-white">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-blue-500/20 rounded-2xl">
                    <Shield className="text-blue-400" size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">KCG Operation Center</h1>
                    <p className="text-white/40">Real-time SRE Sentinel Engine active</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <StatusCard title="Phoenix API" status={latestAudit?.api?.status} latency={latestAudit?.api?.latency} icon={Activity} />
                <StatusCard title="Firestore" status={latestAudit?.firestore?.status} latency={latestAudit?.firestore?.latency} icon={Database} />
                <StatusCard title="AI Providers" status={latestAudit?.ai?.status} latency={latestAudit?.ai?.latency} icon={Zap} />
                <StatusCard title="Global Health" status={latestAudit?.overall === 'HEALTHY' ? 'UP' : 'DOWN'} latency="--" icon={Globe} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <AlertTriangle size={20} className="text-yellow-400" />
                        Recent Incidents
                    </h2>
                    <div className="space-y-4">
                        {incidents.length === 0 && <p className="text-white/20 italic">No critical incidents detected</p>}
                        {incidents.map((inc, i) => (
                            <div key={i} className="flex items-start gap-4 p-3 bg-white/5 rounded-lg border-l-4 border-red-500">
                                <div>
                                    <p className="font-medium">{inc.type}</p>
                                    <p className="text-xs text-white/40">{inc.timestamp?.toDate().toLocaleString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Server size={20} className="text-blue-400" />
                        Infrastructure Manifest
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-black/20 rounded-lg">
                            <p className="text-xs text-white/40">Environment</p>
                            <p className="font-mono">PREPROD-KCG</p>
                        </div>
                        <div className="p-3 bg-black/20 rounded-lg">
                            <p className="text-xs text-white/40">Version</p>
                            <p className="font-mono">5.0-PHOENIX</p>
                        </div>
                        <div className="p-3 bg-black/20 rounded-lg">
                            <p className="text-xs text-white/40">Load Avg</p>
                            <p className="font-mono">{latestAudit?.infra?.load[0]?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div className="p-3 bg-black/20 rounded-lg">
                            <p className="text-xs text-white/40">Uptime</p>
                            <p className="font-mono">{(latestAudit?.infra?.uptime / 3600).toFixed(1) || '0.0'}h</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
