'use client';

import { useState, useEffect } from 'react';
import {
    FiWifi, FiPhone, FiSearch, FiX, FiShield, FiCheck,
    FiZap, FiGlobe, FiClock
} from 'react-icons/fi';
import { HiOutlineSignal } from 'react-icons/hi2';
import toast from 'react-hot-toast';

interface WifiPackage {
    id: number;
    name: string;
    duration_hours: number;
    duration_label: string;
    price: number;
    speed_limit?: string;
    mikrotik_profile: string;
    is_active: boolean;
    sort_order: number;
}

const DEFAULT_PACKAGES: WifiPackage[] = [
    { id: 1, name: '3 HOURS UNLIMITED', duration_hours: 3, duration_label: '3 HRS', price: 10, mikrotik_profile: 'wifi-3h', is_active: true, sort_order: 1 },
    { id: 2, name: '12 HOURS UNLIMITED', duration_hours: 12, duration_label: '12 HRS', price: 20, mikrotik_profile: 'wifi-12h', is_active: true, sort_order: 2 },
    { id: 3, name: '24 HOURS UNLIMITED', duration_hours: 24, duration_label: '24 HRS', price: 30, mikrotik_profile: 'wifi-24h', is_active: true, sort_order: 3 },
    { id: 4, name: '2 DAYS UNLIMITED', duration_hours: 48, duration_label: '2 DAYS', price: 50, mikrotik_profile: 'wifi-2d', is_active: true, sort_order: 4 },
    { id: 5, name: '1 WEEK UNLIMITED', duration_hours: 168, duration_label: '1 WEEK', price: 150, mikrotik_profile: 'wifi-1w', is_active: true, sort_order: 5 },
    { id: 6, name: '1 MONTH UNLIMITED', duration_hours: 720, duration_label: '1 MONTH', price: 600, mikrotik_profile: 'wifi-1m', is_active: true, sort_order: 6 },
];

export default function CaptivePortal() {
    const [packages, setPackages] = useState<WifiPackage[]>(DEFAULT_PACKAGES);
    const [selectedPackage, setSelectedPackage] = useState<WifiPackage | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [searchRef, setSearchRef] = useState('');
    const [activeTab, setActiveTab] = useState<'voucher' | 'userpass'>('voucher');
    const [voucherCode, setVoucherCode] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [voucherResult, setVoucherResult] = useState<{ code: string; password: string } | null>(null);
    const [macAddress, setMacAddress] = useState('');
    const [ipAddress, setIpAddress] = useState('');
    const [searchResult, setSearchResult] = useState<string | null>(null);

    const businessName = process.env.NEXT_PUBLIC_BUSINESS_NAME || 'AlphaBN';
    const businessPhone = process.env.NEXT_PUBLIC_BUSINESS_PHONE || '0720316175';

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setMacAddress(params.get('mac') || params.get('mac-address') || '');
        setIpAddress(params.get('ip') || params.get('chap-id') || '');
        loadPackages();
    }, []);

    const loadPackages = async () => {
        try {
            const res = await fetch('/api/packages');
            if (res.ok) {
                const data = await res.json();
                if (data.length > 0) setPackages(data);
            }
        } catch { /* Use defaults */ }
    };

    const handleBuy = (pkg: WifiPackage) => {
        setSelectedPackage(pkg);
        setShowPaymentModal(true);
        setPhoneNumber('');
    };

    const handlePayment = async () => {
        if (!phoneNumber || phoneNumber.length < 10) {
            toast.error('Please enter a valid phone number');
            return;
        }
        setIsProcessing(true);
        try {
            const res = await fetch('/api/jenga/pay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: phoneNumber.startsWith('0') ? `254${phoneNumber.slice(1)}` : phoneNumber,
                    amount: selectedPackage!.price,
                    packageId: selectedPackage!.id,
                    packageName: selectedPackage!.name,
                    macAddress, ipAddress,
                }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setShowPaymentModal(false);
                toast.success('Payment request sent! Check your phone.');
                if (data.paymentId) pollPaymentStatus(data.paymentId);
            } else {
                toast.error(data.message || 'Payment failed. Try again.');
            }
        } catch {
            toast.error('Connection error. Try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const pollPaymentStatus = async (paymentId: number) => {
        let attempts = 0;
        const check = async () => {
            attempts++;
            try {
                const res = await fetch(`/api/jenga/status?paymentId=${paymentId}`);
                const data = await res.json();
                if (data.status === 'completed') {
                    setVoucherResult({ code: data.voucher?.code || '', password: data.voucher?.password || '' });
                    setShowSuccessModal(true);
                    toast.success('Payment confirmed!');
                    return;
                } else if (data.status === 'failed') {
                    toast.error('Payment failed or cancelled.');
                    return;
                }
            } catch { /* continue */ }
            if (attempts < 30) setTimeout(check, 5000);
            else toast.error('Verification timed out. Use transaction search.');
        };
        setTimeout(check, 5000);
    };

    const handleSearch = async () => {
        if (!searchRef.trim()) { toast.error('Enter a reference or phone number'); return; }
        setIsSearching(true);
        setSearchResult(null);
        try {
            const res = await fetch(`/api/jenga/status?reference=${encodeURIComponent(searchRef)}`);
            const data = await res.json();
            if (data.found) {
                if (data.status === 'completed' && data.voucher) {
                    setSearchResult(`✅ Voucher: ${data.voucher.code} | Password: ${data.voucher.password}`);
                } else if (data.status === 'pending') {
                    setSearchResult('⏳ Still processing...');
                } else {
                    setSearchResult(`❌ Status: ${data.status}`);
                }
            } else {
                setSearchResult('❌ No transaction found.');
            }
        } catch { toast.error('Search failed.'); }
        finally { setIsSearching(false); }
    };

    const handleVoucherLogin = async () => {
        if (!voucherCode.trim()) { toast.error('Enter voucher code'); return; }
        setIsProcessing(true);
        try {
            const res = await fetch('/api/mikrotik/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: voucherCode.toUpperCase(), mac: macAddress, ip: ipAddress }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                toast.success('Connected! Enjoy your internet.');
                const dst = new URLSearchParams(window.location.search).get('dst');
                window.location.href = dst ? decodeURIComponent(dst) : 'http://www.google.com';
            } else { toast.error(data.message || 'Invalid voucher'); }
        } catch { toast.error('Connection error.'); }
        finally { setIsProcessing(false); }
    };

    const handleUsernameLogin = async () => {
        if (!username.trim() || !password.trim()) { toast.error('Enter both fields'); return; }
        setIsProcessing(true);
        try {
            const res = await fetch('/api/mikrotik/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, mac: macAddress, ip: ipAddress }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                toast.success('Connected!');
                const dst = new URLSearchParams(window.location.search).get('dst');
                window.location.href = dst ? decodeURIComponent(dst) : 'http://www.google.com';
            } else { toast.error(data.message || 'Invalid credentials'); }
        } catch { toast.error('Connection error.'); }
        finally { setIsProcessing(false); }
    };

    return (
        <div className="portal-wrapper">
            {/* Background */}
            <div className="portal-bg-image" />
            <div className="portal-overlay" />
            <div className="portal-scanline" />

            {/* Animated data streams */}
            <div className="portal-particles">
                {[...Array(12)].map((_, i) => (
                    <div key={i} className={i < 8 ? 'data-stream' : 'data-stream-v data-stream'} />
                ))}
            </div>

            {/* Content */}
            <div className="portal-content">

                {/* ========== HERO HEADER ========== */}
                <div className="glass w-full max-w-lg px-7 py-8 mb-5 text-center">
                    {/* WiFi icon with animated pulse ring */}
                    <div className="relative w-20 h-20 mx-auto mb-4">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 animate-ping" style={{ animationDuration: '2s' }} />
                        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg" style={{ boxShadow: '0 0 40px rgba(16,185,129,0.35)' }}>
                            <FiWifi className="text-white text-3xl" />
                        </div>
                    </div>

                    <h1 className="glow-text text-3xl font-bold mb-1">
                        {businessName} WI-FI
                    </h1>
                    <p className="text-cyan-400/70 text-sm font-medium tracking-widest uppercase">
                        Ultra-Fast • Unlimited • Secure
                    </p>

                    <div className="mt-4 flex items-center justify-center gap-2 text-slate-400 text-sm">
                        <FiPhone size={14} />
                        <span>Call/Text: <strong className="text-white">{businessPhone}</strong></span>
                    </div>

                    {macAddress && (
                        <p className="text-slate-600 text-[10px] mt-2 font-mono tracking-wider">{macAddress}</p>
                    )}
                </div>

                {/* ========== PAYMENT PROVIDERS ========== */}
                <div className="glass w-full max-w-lg px-6 py-4 mb-5">
                    <p className="text-center text-slate-500 text-[10px] font-bold uppercase tracking-[3px] mb-3">Powered By</p>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                        <span className="pay-chip bg-green-700/80"><FiZap size={12} /> EQUITY</span>
                        <span className="pay-chip bg-green-600/80"><FiGlobe size={12} /> JENGA</span>
                        <span className="pay-chip bg-red-600/80"><HiOutlineSignal size={12} /> M-PESA</span>
                        <span className="pay-chip bg-blue-600/80">AIRTEL</span>
                        <span className="pay-chip bg-blue-700/80">EQUITEL</span>
                    </div>
                </div>

                {/* ========== TRANSACTION SEARCH ========== */}
                <div className="glass w-full max-w-lg px-6 py-5 mb-5">
                    <p className="text-slate-300 font-semibold text-sm mb-3 flex items-center gap-2">
                        <FiSearch className="text-cyan-400" />
                        Already paid? Find your transaction
                    </p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={searchRef}
                            onChange={(e) => setSearchRef(e.target.value)}
                            placeholder="Reference or phone number..."
                            className="portal-input flex-1 text-sm"
                        />
                        <button
                            onClick={handleSearch}
                            disabled={isSearching}
                            className="px-5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-bold text-sm hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
                        >
                            {isSearching ? <div className="spinner !w-4 !h-4 !border-2" /> : <FiSearch size={14} />}
                            Search
                        </button>
                    </div>
                    {searchResult && (
                        <div className="mt-3 p-3 bg-white/5 rounded-xl text-sm text-slate-200 border border-white/5 font-mono break-all">
                            {searchResult}
                        </div>
                    )}
                </div>

                {/* ========== PACKAGE CARDS ========== */}
                <div className="w-full max-w-lg mb-5">
                    <p className="text-slate-400 text-xs font-bold tracking-[3px] uppercase text-center mb-4">
                        SELECT A PACKAGE
                    </p>
                    <div className="space-y-3">
                        {packages.map((pkg) => (
                            <div key={pkg.id} className="pkg-card glass">
                                <div className="flex items-center gap-3 flex-1 relative z-10">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center border border-emerald-500/20">
                                        <FiClock className="text-emerald-400" size={18} />
                                    </div>
                                    <div>
                                        <p className="text-white font-semibold text-sm tracking-wide">{pkg.duration_label} UNLIMITED</p>
                                        <p className="text-slate-400 text-xs">High speed internet</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="text-right">
                                        <p className="pkg-price">KSh {pkg.price}</p>
                                    </div>
                                    <button onClick={() => handleBuy(pkg)} className="buy-btn">
                                        BUY
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ========== LOGIN SECTION ========== */}
                <div className="glass w-full max-w-lg overflow-hidden mb-6">
                    {/* Tabs */}
                    <div className="flex">
                        <button
                            className={`tab-btn ${activeTab === 'voucher' ? 'tab-active-voucher' : 'tab-inactive'}`}
                            onClick={() => setActiveTab('voucher')}
                            style={{ borderRadius: activeTab === 'voucher' ? '0' : '0' }}
                        >
                            🎫 VOUCHER CODE
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'userpass' ? 'tab-active-user' : 'tab-inactive'}`}
                            onClick={() => setActiveTab('userpass')}
                        >
                            👤 USERNAME
                        </button>
                    </div>

                    <div className="p-6">
                        {activeTab === 'voucher' ? (
                            <>
                                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Enter Voucher Code</label>
                                <input
                                    type="text"
                                    value={voucherCode}
                                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                                    placeholder="XXXXXXX"
                                    className="portal-input font-mono tracking-[4px] text-lg text-center mb-4"
                                />
                                <button
                                    onClick={handleVoucherLogin}
                                    disabled={isProcessing}
                                    className="portal-btn portal-btn-green flex items-center justify-center gap-2"
                                >
                                    {isProcessing ? (
                                        <><div className="spinner !w-5 !h-5 !border-white !border-t-transparent" /> Connecting...</>
                                    ) : (
                                        <><FiShield /> Connect to Network</>
                                    )}
                                </button>
                            </>
                        ) : (
                            <>
                                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Username</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Enter username"
                                    className="portal-input mb-3"
                                />
                                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter password"
                                    className="portal-input mb-4"
                                />
                                <button
                                    onClick={handleUsernameLogin}
                                    disabled={isProcessing}
                                    className="portal-btn portal-btn-green flex items-center justify-center gap-2"
                                >
                                    {isProcessing ? (
                                        <><div className="spinner !w-5 !h-5 !border-white !border-t-transparent" /> Connecting...</>
                                    ) : (
                                        <><FiShield /> Connect to Network</>
                                    )}
                                </button>
                            </>
                        )}
                    </div>

                    <div className="border-t border-white/5 px-6 py-3 text-center">
                        <p className="text-slate-600 text-[10px] font-bold tracking-[2px] uppercase">Terms and Conditions Apply</p>
                    </div>
                </div>

                {/* ========== FOOTER ========== */}
                <div className="text-center text-slate-500 text-xs space-y-1.5 mb-4">
                    <p>For enquiries — Call / SMS / WhatsApp</p>
                    <p className="text-cyan-400 font-semibold">{businessPhone}</p>
                    <p className="text-emerald-400/60 font-bold text-[10px] tracking-[3px] uppercase mt-3">
                        {businessName} © {new Date().getFullYear()}
                    </p>
                </div>
            </div>

            {/* ========== PAYMENT MODAL ========== */}
            {showPaymentModal && selectedPackage && (
                <div className="modal-overlay" onClick={() => !isProcessing && setShowPaymentModal(false)}>
                    <div className="modal-card glass p-7" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => !isProcessing && setShowPaymentModal(false)}
                            className="absolute top-5 right-5 text-slate-500 hover:text-white transition-colors"
                        >
                            <FiX size={20} />
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ boxShadow: '0 0 30px rgba(16,185,129,0.3)' }}>
                                <FiWifi className="text-white text-2xl" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Complete Purchase</h3>
                            <div className="mt-4 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/15 p-4 rounded-2xl">
                                <p className="text-emerald-400 font-semibold text-sm">{selectedPackage.duration_label} UNLIMITED</p>
                                <p className="text-4xl font-bold glow-text mt-1" style={{ fontFamily: 'Space Grotesk' }}>
                                    KSh {selectedPackage.price}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                                    <FiPhone className="inline mr-1.5" size={12} /> Phone Number
                                </label>
                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                    placeholder="07XXXXXXXX"
                                    maxLength={12}
                                    className="portal-input text-center text-lg font-mono tracking-wider"
                                    autoFocus
                                />
                                <p className="text-[11px] text-slate-600 mt-1.5 text-center">M-Pesa • Airtel Money • Equitel</p>
                            </div>

                            <button
                                onClick={handlePayment}
                                disabled={isProcessing}
                                className="portal-btn portal-btn-green flex items-center justify-center gap-2 !py-4 !text-base"
                            >
                                {isProcessing ? (
                                    <><div className="spinner !w-5 !h-5 !border-white !border-t-transparent" /> Processing...</>
                                ) : (
                                    <><FiCheck /> Pay KSh {selectedPackage.price}</>
                                )}
                            </button>

                            <p className="text-center text-[11px] text-slate-600">
                                A payment prompt will be sent to your phone
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ========== SUCCESS MODAL ========== */}
            {showSuccessModal && voucherResult && (
                <div className="modal-overlay">
                    <div className="modal-card glass p-7 text-center">
                        <div className="w-18 h-18 mx-auto mb-5 relative">
                            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" style={{ animationDuration: '1.5s' }} />
                            <div className="relative w-18 h-18 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center mx-auto" style={{ width: 72, height: 72, boxShadow: '0 0 40px rgba(16,185,129,0.4)' }}>
                                <FiCheck className="text-white text-3xl" />
                            </div>
                        </div>

                        <h3 className="text-2xl font-bold text-white mb-1">Payment Successful!</h3>
                        <p className="text-slate-400 text-sm mb-6">Your WiFi credentials are ready</p>

                        <div className="bg-white/5 rounded-2xl p-5 mb-5 border border-white/5 space-y-4">
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-[2px] font-bold">Voucher Code</p>
                                <p className="text-3xl font-mono font-bold text-emerald-400 tracking-[6px] mt-1" style={{ textShadow: '0 0 20px rgba(16,185,129,0.3)' }}>
                                    {voucherResult.code}
                                </p>
                            </div>
                            <div className="border-t border-white/5 pt-4">
                                <p className="text-[10px] text-slate-500 uppercase tracking-[2px] font-bold">Password</p>
                                <p className="text-xl font-mono font-bold text-slate-200 mt-1">{voucherResult.password}</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setVoucherCode(voucherResult.code);
                                    setShowSuccessModal(false);
                                    setActiveTab('voucher');
                                }}
                                className="portal-btn portal-btn-green flex-1 !py-3.5"
                            >
                                ⚡ Auto-Connect
                            </button>
                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="flex-1 py-3.5 bg-white/5 text-slate-300 rounded-xl font-semibold border border-white/10 hover:bg-white/10 transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
