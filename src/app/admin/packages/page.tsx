'use client';

import { useEffect, useState } from 'react';
import { FiPackage, FiPlus, FiEdit2, FiTrash2, FiSave, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getAllWifiPackages, addWifiPackage, updateWifiPackage, deleteWifiPackage, WifiPackage } from '@/lib/supabase';

const EMPTY_PACKAGE = {
    name: '', duration_hours: 1, duration_label: '', price: 0,
    speed_limit: '', mikrotik_profile: 'default', is_active: true, sort_order: 1,
    data_limit: '',
};

export default function PackagesPage() {
    const [packages, setPackages] = useState<WifiPackage[]>([]);
    const [editPkg, setEditPkg] = useState<Partial<WifiPackage> | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadPackages(); }, []);

    const loadPackages = async () => {
        try {
            const data = await getAllWifiPackages();
            setPackages(data);
        } catch { console.error('Failed to load packages'); }
        finally { setLoading(false); }
    };

    const handleSave = async () => {
        if (!editPkg?.name || !editPkg?.price) {
            toast.error('Name and price are required');
            return;
        }
        try {
            if (isNew) {
                await addWifiPackage(editPkg as Omit<WifiPackage, 'id' | 'created_at'>);
                toast.success('Package created');
            } else {
                await updateWifiPackage(editPkg.id!, editPkg);
                toast.success('Package updated');
            }
            setEditPkg(null);
            loadPackages();
        } catch (err) {
            toast.error('Failed to save: ' + (err as Error).message);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this package?')) return;
        try {
            await deleteWifiPackage(id);
            toast.success('Package deleted');
            loadPackages();
        } catch { toast.error('Failed to delete'); }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                        <FiPackage className="text-blue-400" size={20} />
                    </div>
                    <h1 className="text-2xl font-bold text-white">WiFi Packages</h1>
                </div>
                <button
                    onClick={() => { setEditPkg({ ...EMPTY_PACKAGE }); setIsNew(true); }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-xl font-medium text-sm hover:shadow-glow-emerald transition-all"
                >
                    <FiPlus size={16} /> Add Package
                </button>
            </div>

            {/* Edit/Add Form */}
            {editPkg && (
                <div className="glass-card p-6 mb-6">
                    <h3 className="text-white font-semibold mb-4">{isNew ? 'New Package' : 'Edit Package'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-slate-400 text-xs mb-1">Package Name</label>
                            <input value={editPkg.name || ''} onChange={(e) => setEditPkg({ ...editPkg, name: e.target.value })}
                                className="w-full bg-dark-surface border border-dark-border rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500" placeholder="e.g. 3 HOURS UNLIMITED" />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-xs mb-1">Duration Label</label>
                            <input value={editPkg.duration_label || ''} onChange={(e) => setEditPkg({ ...editPkg, duration_label: e.target.value })}
                                className="w-full bg-dark-surface border border-dark-border rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500" placeholder="e.g. 3 HOURS" />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-xs mb-1">Duration (Hours)</label>
                            <input type="number" value={editPkg.duration_hours || 0} onChange={(e) => setEditPkg({ ...editPkg, duration_hours: parseInt(e.target.value) })}
                                className="w-full bg-dark-surface border border-dark-border rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500" />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-xs mb-1">Price (KSh)</label>
                            <input type="number" value={editPkg.price || 0} onChange={(e) => setEditPkg({ ...editPkg, price: parseInt(e.target.value) })}
                                className="w-full bg-dark-surface border border-dark-border rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500" />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-xs mb-1">MikroTik Profile</label>
                            <input value={editPkg.mikrotik_profile || ''} onChange={(e) => setEditPkg({ ...editPkg, mikrotik_profile: e.target.value })}
                                className="w-full bg-dark-surface border border-dark-border rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500" placeholder="default" />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-xs mb-1">Sort Order</label>
                            <input type="number" value={editPkg.sort_order || 1} onChange={(e) => setEditPkg({ ...editPkg, sort_order: parseInt(e.target.value) })}
                                className="w-full bg-dark-surface border border-dark-border rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500" />
                        </div>
                    </div>
                    <div className="flex items-center gap-3 mt-4">
                        <label className="flex items-center gap-2 text-sm text-slate-300">
                            <input type="checkbox" checked={editPkg.is_active ?? true} onChange={(e) => setEditPkg({ ...editPkg, is_active: e.target.checked })}
                                className="rounded" />
                            Active
                        </label>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
                            <FiSave size={14} /> Save
                        </button>
                        <button onClick={() => setEditPkg(null)} className="flex items-center gap-2 px-4 py-2 bg-dark-surface text-slate-300 rounded-lg text-sm hover:bg-dark-hover border border-dark-border">
                            <FiX size={14} /> Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Packages Table */}
            <div className="glass-card overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16"><div className="spinner !w-8 !h-8" /></div>
                ) : packages.length === 0 ? (
                    <div className="text-center py-16 text-slate-500">
                        <FiPackage size={40} className="mx-auto mb-3 opacity-50" />
                        <p>No packages created yet</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead><tr>
                            <th>#</th><th>Name</th><th>Duration</th><th>Price</th><th>Profile</th><th>Status</th><th>Actions</th>
                        </tr></thead>
                        <tbody>
                            {packages.map((pkg) => (
                                <tr key={pkg.id}>
                                    <td className="text-slate-400">{pkg.sort_order}</td>
                                    <td className="font-medium">{pkg.name}</td>
                                    <td>{pkg.duration_label}</td>
                                    <td className="font-semibold text-emerald-400">KSh {pkg.price}</td>
                                    <td className="font-mono text-xs text-slate-400">{pkg.mikrotik_profile}</td>
                                    <td><span className={`badge ${pkg.is_active ? 'badge-success' : 'badge-error'}`}>{pkg.is_active ? 'Active' : 'Inactive'}</span></td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button onClick={() => { setEditPkg({ ...pkg }); setIsNew(false); }} className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20"><FiEdit2 size={14} /></button>
                                            <button onClick={() => handleDelete(pkg.id)} className="p-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20"><FiTrash2 size={14} /></button>
                                        </div>
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
