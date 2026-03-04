'use client';

import { useEffect, useState } from 'react';
import { FiUsers, FiXCircle, FiRefreshCw, FiWifi } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getActiveSessions, endWifiSession, WifiSession } from '@/lib/supabase';

export default function SessionsPage() {
    const [sessions, setSessions] = useState<WifiSession[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadSessions(); }, []);

    const loadSessions = async () => {
        setLoading(true);
        try {
            const data = await getActiveSessions();
            setSessions(data);
        } catch { console.error('Failed to load sessions'); }
        finally { setLoading(false); }
    };

    const handleDisconnect = async (session: WifiSession) => {
        if (!confirm(`Disconnect ${session.username}?`)) return;
        try {
            await endWifiSession(session.id);
            // Also try to remove from MikroTik
            try {
                await fetch('/api/mikrotik/remove-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: session.username }),
                });
            } catch { /* MikroTik might not be reachable */ }
            toast.success('User disconnected');
            loadSessions();
        } catch { toast.error('Failed to disconnect'); }
    };

    const getTimeRemaining = (expiresAt: string) => {
        const diff = new Date(expiresAt).getTime() - Date.now();
        if (diff <= 0) return 'Expired';
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
        return `${hours}h ${mins}m`;
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                        <FiUsers className="text-purple-400" size={20} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Active Sessions</h1>
                        <p className="text-sm text-slate-400">{sessions.length} active connections</p>
                    </div>
                </div>
                <button onClick={loadSessions} className="flex items-center gap-2 px-4 py-2 bg-dark-surface border border-dark-border text-slate-300 rounded-xl text-sm hover:bg-dark-hover">
                    <FiRefreshCw size={14} /> Refresh
                </button>
            </div>

            <div className="glass-card overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16"><div className="spinner !w-8 !h-8" /></div>
                ) : sessions.length === 0 ? (
                    <div className="text-center py-16 text-slate-500">
                        <FiWifi size={40} className="mx-auto mb-3 opacity-50" />
                        <p>No active sessions</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead><tr><th>User</th><th>Package</th><th>Started</th><th>Time Left</th><th>MAC</th><th>Actions</th></tr></thead>
                        <tbody>
                            {sessions.map((s) => (
                                <tr key={s.id}>
                                    <td className="font-mono text-sm font-medium">{s.username}</td>
                                    <td className="text-sm">{s.package_name}</td>
                                    <td className="text-xs text-slate-400">{new Date(s.started_at).toLocaleString('en-KE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                                    <td><span className={`badge ${getTimeRemaining(s.expires_at) === 'Expired' ? 'badge-error' : 'badge-success'}`}>{getTimeRemaining(s.expires_at)}</span></td>
                                    <td className="font-mono text-xs text-slate-400">{s.mac_address || '-'}</td>
                                    <td>
                                        <button onClick={() => handleDisconnect(s)} className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-xs hover:bg-red-500/20">
                                            <FiXCircle size={12} /> Disconnect
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
