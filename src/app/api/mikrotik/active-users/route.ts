import { NextResponse } from 'next/server';
import { getActiveHotspotUsers, getHotspotUsers } from '@/lib/mikrotik';

export async function GET() {
    try {
        const [activeUsers, allUsers] = await Promise.all([
            getActiveHotspotUsers().catch(() => []),
            getHotspotUsers().catch(() => []),
        ]);

        return NextResponse.json({
            success: true,
            activeUsers: activeUsers || [],
            allUsers: allUsers || [],
            activeCount: activeUsers?.length || 0,
            totalUsers: allUsers?.length || 0,
        });
    } catch (error) {
        console.error('Get active users error:', error);
        return NextResponse.json(
            { success: false, activeUsers: [], allUsers: [], message: 'Cannot reach MikroTik router' },
            { status: 500 }
        );
    }
}
