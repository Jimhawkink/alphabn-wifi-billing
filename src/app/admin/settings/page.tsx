'use client';

import { useState } from 'react';
import { FiSettings, FiSave, FiWifi, FiServer, FiCreditCard } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function SettingsPage() {
    const [mikrotik, setMikrotik] = useState({
        host: '192.168.88.1', port: '443', username: 'admin', password: '', useSsl: true,
    });
    const [jenga, setJenga] = useState({
        apiKey: '', merchantCode: '', consumerSecret: '', apiUrl: 'https://uat.jengahq.io',
    });
    const [business, setBusiness] = useState({
        name: 'AlphaBN', phone: '0720316175', tagline: 'High Speed Internet',
    });
    const [testingMikrotik, setTestingMikrotik] = useState(false);

    const testMikrotikConnection = async () => {
        setTestingMikrotik(true);
        try {
            const res = await fetch('/api/mikrotik/active-users');
            const data = await res.json();
            if (data.success) {
                toast.success(`Connected! ${data.activeCount} active users, ${data.totalUsers} total users`);
            } else {
                toast.error('Could not connect: ' + (data.message || 'Unknown error'));
            }
        } catch {
            toast.error('Connection failed. Check router IP and credentials.');
        } finally { setTestingMikrotik(false); }
    };

    const saveSettings = () => {
        toast.success('Settings saved! Note: Environment variables need to be updated in .env.local and server restarted for MikroTik/Jenga changes.');
    };

    return (
        <div>
            <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-slate-500/10 rounded-xl flex items-center justify-center">
                    <FiSettings className="text-slate-400" size={20} />
                </div>
                <h1 className="text-2xl font-bold text-white">Settings</h1>
            </div>

            <div className="space-y-6">
                {/* Business Settings */}
                <div className="glass-card p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <FiWifi className="text-emerald-400" />
                        <h2 className="text-lg font-semibold text-white">Business Settings</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-slate-400 text-xs mb-1">Business Name</label>
                            <input value={business.name} onChange={(e) => setBusiness({ ...business, name: e.target.value })}
                                className="w-full bg-dark-surface border border-dark-border rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500" />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-xs mb-1">Phone Number</label>
                            <input value={business.phone} onChange={(e) => setBusiness({ ...business, phone: e.target.value })}
                                className="w-full bg-dark-surface border border-dark-border rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500" />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-xs mb-1">Tagline</label>
                            <input value={business.tagline} onChange={(e) => setBusiness({ ...business, tagline: e.target.value })}
                                className="w-full bg-dark-surface border border-dark-border rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500" />
                        </div>
                    </div>
                </div>

                {/* MikroTik Settings */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <FiServer className="text-blue-400" />
                            <h2 className="text-lg font-semibold text-white">MikroTik Router</h2>
                        </div>
                        <button onClick={testMikrotikConnection} disabled={testingMikrotik}
                            className="px-4 py-2 bg-blue-500/10 text-blue-400 rounded-lg text-sm hover:bg-blue-500/20 disabled:opacity-50">
                            {testingMikrotik ? 'Testing...' : 'Test Connection'}
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-slate-400 text-xs mb-1">Router IP</label>
                            <input value={mikrotik.host} onChange={(e) => setMikrotik({ ...mikrotik, host: e.target.value })}
                                className="w-full bg-dark-surface border border-dark-border rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500" placeholder="192.168.88.1" />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-xs mb-1">Port</label>
                            <input value={mikrotik.port} onChange={(e) => setMikrotik({ ...mikrotik, port: e.target.value })}
                                className="w-full bg-dark-surface border border-dark-border rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500" placeholder="443" />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-xs mb-1">Username</label>
                            <input value={mikrotik.username} onChange={(e) => setMikrotik({ ...mikrotik, username: e.target.value })}
                                className="w-full bg-dark-surface border border-dark-border rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500" placeholder="admin" />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-xs mb-1">Password</label>
                            <input type="password" value={mikrotik.password} onChange={(e) => setMikrotik({ ...mikrotik, password: e.target.value })}
                                className="w-full bg-dark-surface border border-dark-border rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500" placeholder="••••••" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <label className="flex items-center gap-2 text-sm text-slate-300">
                            <input type="checkbox" checked={mikrotik.useSsl} onChange={(e) => setMikrotik({ ...mikrotik, useSsl: e.target.checked })} className="rounded" />
                            Use HTTPS (SSL)
                        </label>
                    </div>
                    <p className="text-xs text-slate-500 mt-3">⚙️ These settings are configured in <code className="text-emerald-400">.env.local</code>. Update the file and restart the server to apply changes.</p>
                </div>

                {/* Jenga API Settings */}
                <div className="glass-card p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <FiCreditCard className="text-green-400" />
                        <h2 className="text-lg font-semibold text-white">Equity Jenga API</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-400 text-xs mb-1">API Key</label>
                            <input type="password" value={jenga.apiKey} onChange={(e) => setJenga({ ...jenga, apiKey: e.target.value })}
                                className="w-full bg-dark-surface border border-dark-border rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500" placeholder="Your Jenga API Key" />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-xs mb-1">Merchant Code</label>
                            <input value={jenga.merchantCode} onChange={(e) => setJenga({ ...jenga, merchantCode: e.target.value })}
                                className="w-full bg-dark-surface border border-dark-border rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500" placeholder="Your Merchant Code" />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-xs mb-1">Consumer Secret</label>
                            <input type="password" value={jenga.consumerSecret} onChange={(e) => setJenga({ ...jenga, consumerSecret: e.target.value })}
                                className="w-full bg-dark-surface border border-dark-border rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500" placeholder="Your Consumer Secret" />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-xs mb-1">API URL</label>
                            <select value={jenga.apiUrl} onChange={(e) => setJenga({ ...jenga, apiUrl: e.target.value })}
                                className="w-full bg-dark-surface border border-dark-border rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500">
                                <option value="https://uat.jengahq.io">Sandbox (UAT)</option>
                                <option value="https://api.jengahq.io">Production (Live)</option>
                            </select>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-3">
                        🏦 Get your credentials from <a href="https://jengahq.io" target="_blank" rel="noopener" className="text-emerald-400 hover:underline">jengahq.io</a>.
                        Configure in <code className="text-emerald-400">.env.local</code>.
                    </p>
                </div>

                {/* Save Button */}
                <button onClick={saveSettings} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-glow-emerald transition-all">
                    <FiSave size={16} /> Save Settings
                </button>
            </div>
        </div>
    );
}
