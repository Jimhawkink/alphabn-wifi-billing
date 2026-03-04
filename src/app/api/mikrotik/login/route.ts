import { NextRequest, NextResponse } from 'next/server';
import { findVoucherByCode, activateVoucher, createWifiSession } from '@/lib/supabase';
import { createHotspotUser, hoursToMikrotikUptime } from '@/lib/mikrotik';

// Login to WiFi via voucher code or username/password
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { code, username, password, mac, ip } = body;

        // Voucher-based login
        if (code) {
            const voucher = await findVoucherByCode(code);

            if (!voucher) {
                return NextResponse.json(
                    { success: false, message: 'Invalid voucher code. Please check and try again.' },
                    { status: 400 }
                );
            }

            if (voucher.status === 'expired') {
                return NextResponse.json(
                    { success: false, message: 'This voucher has expired.' },
                    { status: 400 }
                );
            }

            if (voucher.status === 'revoked') {
                return NextResponse.json(
                    { success: false, message: 'This voucher has been revoked.' },
                    { status: 400 }
                );
            }

            // If voucher is unused, activate it
            if (voucher.status === 'unused') {
                await activateVoucher(voucher.id, voucher.duration_hours);
            }

            // Create/ensure MikroTik user exists
            try {
                await createHotspotUser(
                    voucher.username,
                    voucher.password,
                    'default', // Will use MikroTik's default profile
                    hoursToMikrotikUptime(voucher.duration_hours),
                    `Voucher: ${voucher.code}`
                );
            } catch (mikrotikError) {
                // User might already exist - that's okay
                console.log('MikroTik user creation (may already exist):', mikrotikError);
            }

            // Create session
            try {
                await createWifiSession({
                    voucher_id: voucher.id,
                    voucher_code: voucher.code,
                    username: voucher.username,
                    mac_address: mac,
                    ip_address: ip,
                    package_name: voucher.package_name,
                    duration_hours: voucher.duration_hours,
                });
            } catch (sessionError) {
                console.error('Session creation error:', sessionError);
            }

            // Return login URL for MikroTik
            return NextResponse.json({
                success: true,
                message: 'Login successful',
                username: voucher.username,
                password: voucher.password,
                loginUrl: `/login?username=${encodeURIComponent(voucher.username)}&password=${encodeURIComponent(voucher.password)}`,
            });
        }

        // Username/password login
        if (username && password) {
            try {
                await createHotspotUser(username, password, 'default', undefined, 'Manual login');
            } catch {
                // User might exist  
            }

            return NextResponse.json({
                success: true,
                message: 'Login successful',
                username,
                password,
            });
        }

        return NextResponse.json(
            { success: false, message: 'Please provide a voucher code or username/password' },
            { status: 400 }
        );
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { success: false, message: 'Login failed. Please try again.' },
            { status: 500 }
        );
    }
}
