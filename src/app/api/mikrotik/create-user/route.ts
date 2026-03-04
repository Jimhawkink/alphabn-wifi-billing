import { NextRequest, NextResponse } from 'next/server';
import { createHotspotUser, hoursToMikrotikUptime } from '@/lib/mikrotik';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { username, password, profile, durationHours, comment } = body;

        if (!username || !password) {
            return NextResponse.json(
                { success: false, message: 'Username and password required' },
                { status: 400 }
            );
        }

        const uptime = durationHours ? hoursToMikrotikUptime(durationHours) : undefined;

        const result = await createHotspotUser(
            username,
            password,
            profile || 'default',
            uptime,
            comment
        );

        return NextResponse.json({ success: true, result });
    } catch (error) {
        console.error('Create hotspot user error:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to create hotspot user. Check MikroTik connection.' },
            { status: 500 }
        );
    }
}
