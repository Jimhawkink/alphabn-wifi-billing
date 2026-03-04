'use client';

import { useEffect, useState } from 'react';
import { FiTag, FiPlus, FiCopy, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getWifiVouchers, generateBulkVouchers, getAllWifiPackages, WifiVoucher, WifiPackage } from '@/lib/supabase';

export default function VouchersPage() {
    const [vouchers, setVouchers] = useState<WifiVoucher[]>([]);
    const [packages, setPackages] = useState<WifiPackage[]>([]);
    const [loading, setLoading] = useState(true);
    const [showGenerate, setShowGenerate] = useState(false);
    const [genPkgId, setGenPkgId] = useState(0);
    const [genCount, setGenCount] = useState(10);
    const [filter, setFilter] = useState('all');
    const [generating, setGenerating] = useState(false);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [v, p] = await Promise.all([
                getWifiVouchers().catch(() => []),
                getAllWifiPackages().catch(() => []),
            ]);
            setVouchers(v);
            setPackages(p);
            if (p.length > 0 && !genPkgId) setGenPkgId(p[0].id);
        } catch { console.error('Failed to load data'); }
        finally { setLoading(false); }
    };

    const handleGenerate = async () => {
        const pkg = packages.find(p => p.id === genPkgId);
        if (!pkg) { toast.error('Select a package'); return; }
        setGenerating(true);
        try {
            const newVouchers = await generateBulkVouchers(pkg.id, pkg.name, pkg.duration_hours, genCount, 'admin');
            toast.success(`${newVouchers.length} vouchers generated`);
            setShowGenerate(false);
            loadData();
        } catch (err) {
            toast.error('Failed to generate: ' + (err as Error).message);
        } finally { setGenerating(false); }
    };

    const copyVoucher = (code: string, password: string) => {
        navigator.clipboard.writeText(`Code: ${code} | Password: ${password}`);
        toast.success('Copied to clipboard');
    };

    const filtered = filter === 'all' ? vouchers : vouchers.filter(v => v.status === filter);

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
                        <FiTag className="text-orange-400" size={20} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Vouchers</h1>
                        <p className="text-sm text-slate-400">{vouchers.filter(v => v.status === 'unused').length} unused / {vouchers.length} total</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowGenerate(!showGenerate)} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-xl font-medium text-sm hover:shadow-glow-emerald">
                        <FiPlus size={16} /> Generate Vouchers
                    </button>
                    <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 bg-dark-surface border border-dark-border text-slate-300 rounded-xl text-sm hover:bg-dark-hover">
                        <FiRefreshCw size={14} />
                    </button>
                </div>
            </div>

            {/* Generate Form */}
            {showGenerate && (
                <div className="glass-card p-6 mb-6">
                    <h3 className="text-white font-semibold mb-4">Generate Bulk Vouchers</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-slate-400 text-xs mb-1">Package</label>
                            <select value={genPkgId} onChange={(e) => setGenPkgId(parseInt(e.target.value))}
                                className="w-full bg-dark-surface border border-dark-border rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500">
                                {packages.map(p => <option key={p.id} value={p.id}>{p.name} - KSh {p.price}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-slate-400 text-xs mb-1">Quantity</label>
                            <input type="number" value={genCount} min={1} max={100} onChange={(e) => setGenCount(parseInt(e.target.value))}
                                className="w-full bg-dark-surface border border-dark-border rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500" />
                        </div>
                        <div className="flex items-end">
                            <button onClick={handleGenerate} disabled={generating}
                                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                                {generating ? 'Generating...' : 'Generate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Filter tabs */}
            <div className="flex gap-2 mb-4">
                {['all', 'unused', 'active', 'expired'].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === f ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-dark-surface text-slate-400 border border-dark-border hover:bg-dark-hover'}`}>
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            <div className="glass-card overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16"><div className="spinner !w-8 !h-8" /></div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16 text-slate-500">
                        <FiTag size={40} className="mx-auto mb-3 opacity-50" />
                        <p>No vouchers found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead><tr><th>Code</th><th>Password</th><th>Package</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
                            <tbody>
                                {filtered.map((v) => (
                                    <tr key={v.id}>
                                        <td className="font-mono font-bold text-emerald-400 tracking-wider">{v.code}</td>
                                        <td className="font-mono text-sm">{v.password}</td>
                                        <td className="text-sm">{v.package_name}</td>
                                        <td><span className={`badge ${v.status === 'unused' ? 'badge-info' : v.status === 'active' ? 'badge-success' : 'badge-error'}`}>{v.status}</span></td>
                                        <td className="text-xs text-slate-400">{new Date(v.created_at).toLocaleDateString('en-KE')}</td>
                                        <td>
                                            <button onClick={() => copyVoucher(v.code, v.password)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg text-xs hover:bg-blue-500/20">
                                                <FiCopy size={12} /> Copy
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
