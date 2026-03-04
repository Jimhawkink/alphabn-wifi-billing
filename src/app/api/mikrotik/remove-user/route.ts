import { NextRequest, NextResponse } from 'next/server';
import { removeHotspotUser } from '@/lib/mikrotik';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { username } = body;

        if (!username) {
            return NextResponse.json({ success: false, message: 'Username required' }, { status: 400 });
        }

        await removeHotspotUser(username);
        return NextResponse.json({ success: true, message: `User ${username} removed` });
    } catch (error) {
        console.error('Remove hotspot user error:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to remove user from MikroTik' },
            { status: 500 }
        );
    }
}
