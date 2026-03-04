'use client';

import { useEffect, useState } from 'react';
import { FiDollarSign, FiSearch, FiRefreshCw } from 'react-icons/fi';
import { getWifiPayments, WifiPayment } from '@/lib/supabase';

export default function TransactionsPage() {
    const [payments, setPayments] = useState<WifiPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => { loadPayments(); }, []);

    const loadPayments = async () => {
        setLoading(true);
        try {
            const data = await getWifiPayments(100);
            setPayments(data);
        } catch { console.error('Failed to load payments'); }
        finally { setLoading(false); }
    };

    const filtered = payments.filter(p =>
        !search || p.phone_number?.includes(search) || p.package_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.payment_reference?.includes(search) || p.jenga_reference?.includes(search)
    );

    const totals = {
        total: filtered.reduce((sum, p) => sum + (p.status === 'completed' ? p.amount : 0), 0),
        count: filtered.filter(p => p.status === 'completed').length,
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                        <FiDollarSign className="text-emerald-400" size={20} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Transactions</h1>
                        <p className="text-sm text-slate-400">Total: KSh {totals.total.toLocaleString()} ({totals.count} completed)</p>
                    </div>
                </div>
                <button onClick={loadPayments} className="flex items-center gap-2 px-4 py-2 bg-dark-surface border border-dark-border text-slate-300 rounded-xl text-sm hover:bg-dark-hover">
                    <FiRefreshCw size={14} /> Refresh
                </button>
            </div>

            {/* Search */}
            <div className="mb-4">
                <div className="relative max-w-md">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by phone, reference, package..."
                        className="w-full bg-dark-surface border border-dark-border rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-emerald-500 placeholder-slate-500" />
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16"><div className="spinner !w-8 !h-8" /></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead><tr>
                                <th>Date/Time</th><th>Phone</th><th>Package</th><th>Amount</th><th>Method</th><th>Status</th><th>Reference</th>
                            </tr></thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={7} className="text-center py-12 text-slate-500">No transactions found</td></tr>
                                ) : (
                                    filtered.map((p) => (
                                        <tr key={p.id}>
                                            <td className="text-xs text-slate-400 whitespace-nowrap">
                                                {new Date(p.created_at).toLocaleString('en-KE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="font-mono text-sm">{p.phone_number}</td>
                                            <td className="text-sm">{p.package_name}</td>
                                            <td className="font-semibold text-emerald-400">KSh {p.amount}</td>
                                            <td className="text-xs text-slate-400">{p.payment_method}</td>
                                            <td>
                                                <span className={`badge ${p.status === 'completed' ? 'badge-success' : p.status === 'pending' ? 'badge-warning' : 'badge-error'}`}>
                                                    {p.status}
                                                </span>
                                            </td>
                                            <td className="text-xs font-mono text-slate-400">{p.payment_reference || p.jenga_reference || '-'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
