'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    FiWifi, FiGrid, FiPackage, FiDollarSign, FiUsers,
    FiTag, FiSettings, FiLogOut, FiMenu, FiX
} from 'react-icons/fi';

interface AdminUser {
    id: number;
    username: string;
    name: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [admin, setAdmin] = useState<AdminUser | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const stored = sessionStorage.getItem('wifi_admin');
        if (stored) {
            setAdmin(JSON.parse(stored));
        } else {
            router.push('/admin');
        }
    }, [router]);

    const handleLogout = () => {
        sessionStorage.removeItem('wifi_admin');
        router.push('/admin');
    };

    const navItems = [
        { href: '/admin/dashboard', icon: FiGrid, label: 'Dashboard' },
        { href: '/admin/packages', icon: FiPackage, label: 'Packages' },
        { href: '/admin/transactions', icon: FiDollarSign, label: 'Transactions' },
        { href: '/admin/sessions', icon: FiUsers, label: 'Active Sessions' },
        { href: '/admin/vouchers', icon: FiTag, label: 'Vouchers' },
        { href: '/admin/settings', icon: FiSettings, label: 'Settings' },
    ];

    if (!admin) return null;

    return (
        <div className="min-h-screen bg-dark-bg">
            {/* Mobile toggle */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden fixed top-4 left-4 z-50 bg-dark-card border border-dark-border p-2 rounded-lg text-white"
            >
                {sidebarOpen ? <FiX size={20} /> : <FiMenu size={20} />}
            </button>

            {/* Sidebar */}
            <aside className={`admin-sidebar transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                {/* Brand */}
                <div className="flex items-center gap-3 px-2 mb-8">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-xl flex items-center justify-center">
                        <FiWifi className="text-white text-lg" />
                    </div>
                    <div>
                        <h1 className="text-white font-bold text-sm">AlphaBN WiFi</h1>
                        <p className="text-xs text-slate-500">Admin Panel</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="space-y-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
                            onClick={() => setSidebarOpen(false)}
                        >
                            <item.icon size={18} />
                            {item.label}
                        </Link>
                    ))}
                </nav>

                {/* User / Logout */}
                <div className="absolute bottom-6 left-4 right-4">
                    <div className="border-t border-dark-border pt-4">
                        <div className="flex items-center gap-3 px-2 mb-3">
                            <div className="w-8 h-8 bg-dark-surface rounded-full flex items-center justify-center text-emerald-400 text-sm font-bold">
                                {admin.name?.charAt(0) || 'A'}
                            </div>
                            <div>
                                <p className="text-white text-sm font-medium">{admin.name}</p>
                                <p className="text-slate-500 text-xs">{admin.username}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="sidebar-link text-red-400 hover:text-red-300 w-full"
                        >
                            <FiLogOut size={18} />
                            Sign Out
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="admin-content">
                {children}
            </main>

            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
}
