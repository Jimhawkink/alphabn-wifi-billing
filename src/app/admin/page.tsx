'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiWifi, FiLock, FiUser } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { adminLogin } from '@/lib/supabase';

export default function AdminLogin() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password) {
            toast.error('Please enter username and password');
            return;
        }

        setIsLoading(true);
        try {
            const admin = await adminLogin(username, password);
            if (admin) {
                // Store admin session
                sessionStorage.setItem('wifi_admin', JSON.stringify({
                    id: admin.id,
                    username: admin.username,
                    name: admin.name,
                }));
                toast.success(`Welcome, ${admin.name || admin.username}!`);
                router.push('/admin/dashboard');
            } else {
                toast.error('Invalid credentials');
            }
        } catch {
            // Default admin for initial setup
            if (username === 'admin' && password === 'admin123') {
                sessionStorage.setItem('wifi_admin', JSON.stringify({
                    id: 1,
                    username: 'admin',
                    name: 'Administrator',
                }));
                toast.success('Welcome, Administrator! Please change default password in settings.');
                router.push('/admin/dashboard');
            } else {
                toast.error('Invalid credentials');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-dark-bg flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-glow-emerald">
                        <FiWifi className="text-white text-3xl" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">AlphaBN WiFi</h1>
                    <p className="text-slate-400 text-sm mt-1">Admin Dashboard</p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleLogin} className="glass-card p-8">
                    <h2 className="text-lg font-semibold text-white mb-6">Sign In</h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-slate-400 text-sm mb-1.5">Username</label>
                            <div className="relative">
                                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="admin"
                                    className="w-full bg-dark-surface border border-dark-border rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition-colors"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-slate-400 text-sm mb-1.5">Password</label>
                            <div className="relative">
                                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-dark-surface border border-dark-border rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition-colors"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-xl hover:shadow-glow-emerald transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <div className="spinner !w-5 !h-5" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </div>

                    <p className="text-slate-500 text-xs text-center mt-4">
                        Default: admin / admin123
                    </p>
                </form>
            </div>
        </div>
    );
}
