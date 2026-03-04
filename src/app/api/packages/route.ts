import { NextResponse } from 'next/server';
import { getWifiPackages } from '@/lib/supabase';

export async function GET() {
    try {
        const packages = await getWifiPackages();
        return NextResponse.json(packages);
    } catch (error) {
        console.error('Failed to fetch packages:', error);
        // Return default packages if DB not configured
        return NextResponse.json([
            { id: 1, name: '3 HOURS UNLIMITED', duration_hours: 3, duration_label: '3 HOURS', price: 10, mikrotik_profile: 'wifi-3h', is_active: true, sort_order: 1 },
            { id: 2, name: '12 HOURS UNLIMITED', duration_hours: 12, duration_label: '12 HOURS', price: 20, mikrotik_profile: 'wifi-12h', is_active: true, sort_order: 2 },
            { id: 3, name: '24 HOURS UNLIMITED', duration_hours: 24, duration_label: '24 HOURS', price: 30, mikrotik_profile: 'wifi-24h', is_active: true, sort_order: 3 },
            { id: 4, name: '2 DAYS UNLIMITED', duration_hours: 48, duration_label: '2 DAYS', price: 50, mikrotik_profile: 'wifi-2d', is_active: true, sort_order: 4 },
            { id: 5, name: '1 WEEK UNLIMITED', duration_hours: 168, duration_label: '1 WEEK', price: 150, mikrotik_profile: 'wifi-1w', is_active: true, sort_order: 5 },
            { id: 6, name: '1 MONTH UNLIMITED', duration_hours: 720, duration_label: '1 MONTH', price: 600, mikrotik_profile: 'wifi-1m', is_active: true, sort_order: 6 },
        ]);
    }
}
