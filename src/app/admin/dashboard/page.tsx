'use client';

import { useEffect, useState } from 'react';
import { FiDollarSign, FiUsers, FiTag, FiTrendingUp, FiWifi, FiActivity } from 'react-icons/fi';
import { getWifiDashboardStats, getWifiPayments, WifiPayment } from '@/lib/supabase';

export default function DashboardPage() {
    const [stats, setStats] = useState({
        todayRevenue: 0,
        weekRevenue: 0,
        todayTransactions: 0,
        activeSessions: 0,
        unusedVouchers: 0,
    });
    const [recentPayments, setRecentPayments] = useState<WifiPayment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [dashStats, payments] = await Promise.all([
                getWifiDashboardStats().catch(() => ({
                    todayRevenue: 0, weekRevenue: 0, todayTransactions: 0, activeSessions: 0, unusedVouchers: 0
                })),
                getWifiPayments(10).catch(() => []),
            ]);
            setStats(dashStats);
            setRecentPayments(payments);
        } catch (error) {
            console.error('Dashboard data error:', error);
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        {
            label: "Today's Revenue",
            value: `KSh ${stats.todayRevenue.toLocaleString()}`,
            icon: FiDollarSign,
            color: 'text-emerald-400',
            bgColor: 'bg-emerald-400/10',
        },
        {
            label: "Week's Revenue",
            value: `KSh ${stats.weekRevenue.toLocaleString()}`,
            icon: FiTrendingUp,
            color: 'text-cyan-400',
            bgColor: 'bg-cyan-400/10',
        },
        {
            label: "Today's Sales",
            value: stats.todayTransactions.toString(),
            icon: FiActivity,
            color: 'text-blue-400',
            bgColor: 'bg-blue-400/10',
        },
        {
            label: 'Active Sessions',
            value: stats.activeSessions.toString(),
            icon: FiUsers,
            color: 'text-purple-400',
            bgColor: 'bg-purple-400/10',
        },
        {
            label: 'Unused Vouchers',
            value: stats.unusedVouchers.toString(),
            icon: FiTag,
            color: 'text-orange-400',
            bgColor: 'bg-orange-400/10',
        },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner !w-10 !h-10"></div>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-xl flex items-center justify-center">
                    <FiWifi className="text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                    <p className="text-slate-400 text-sm">WiFi billing overview</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
                {statCards.map((card) => (
                    <div key={card.label} className="stat-card">
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`w-10 h-10 ${card.bgColor} rounded-xl flex items-center justify-center`}>
                                <card.icon className={card.color} size={20} />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-white">{card.value}</p>
                        <p className="text-slate-400 text-xs mt-1">{card.label}</p>
                    </div>
                ))}
            </div>

            {/* Recent Transactions */}
            <div className="glass-card p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Recent Transactions</h2>

                {recentPayments.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        <FiDollarSign size={40} className="mx-auto mb-3 opacity-50" />
                        <p>No transactions yet</p>
                        <p className="text-xs mt-1">Payments will appear here when customers buy packages</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>Phone</th>
                                    <th>Package</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Reference</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentPayments.map((payment) => (
                                    <tr key={payment.id}>
                                        <td className="text-xs text-slate-400">
                                            {new Date(payment.created_at).toLocaleString('en-KE', {
                                                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </td>
                                        <td className="font-mono text-sm">{payment.phone_number}</td>
                                        <td className="text-sm">{payment.package_name}</td>
                                        <td className="font-semibold text-emerald-400">KSh {payment.amount}</td>
                                        <td>
                                            <span className={`badge ${payment.status === 'completed' ? 'badge-success' :
                                                    payment.status === 'pending' ? 'badge-warning' :
                                                        'badge-error'
                                                }`}>
                                                {payment.status}
                                            </span>
                                        </td>
                                        <td className="text-xs font-mono text-slate-400">
                                            {payment.payment_reference || payment.jenga_reference || '-'}
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
