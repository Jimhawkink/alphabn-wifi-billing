import { NextRequest, NextResponse } from 'next/server';
import {
    updateWifiPaymentStatus,
    createWifiVoucher,
    createWifiSession,
    generateVoucherCode,
    generatePassword,
    supabase
} from '@/lib/supabase';
import { createHotspotUser, hoursToMikrotikUptime } from '@/lib/mikrotik';

export const dynamic = 'force-dynamic';

// Jenga IPN (Instant Payment Notification) callback
// Configure this URL in your JengaHQ dashboard under IPN settings

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        console.log('Jenga IPN received:', JSON.stringify(body, null, 2));

        // Extract payment details from Jenga callback
        const {
            transactionId,
            referenceNumber,
            status,
            transactionReference,
        } = body;

        // Find the corresponding payment record
        const reference = transactionReference || referenceNumber || '';
        const paymentIdMatch = reference.match(/WIFI-(\d+)/);
        const paymentId = paymentIdMatch ? parseInt(paymentIdMatch[1]) : null;

        if (!paymentId) {
            console.error('Could not extract payment ID from reference:', reference);
            return NextResponse.json({ success: false, message: 'Invalid reference' }, { status: 400 });
        }

        // Get payment details
        const { data: payment, error: fetchError } = await supabase
            .from('wifi_payments')
            .select('*, wifi_packages:package_id(*)')
            .eq('id', paymentId)
            .single();

        if (fetchError || !payment) {
            console.error('Payment not found:', paymentId);
            return NextResponse.json({ success: false, message: 'Payment not found' }, { status: 404 });
        }

        if (status === 'SUCCESS' || status === 'success' || status === '0') {
            // Payment successful!
            // 1. Update payment status
            await updateWifiPaymentStatus(paymentId, 'completed', transactionId, referenceNumber);

            // 2. Generate voucher
            const code = generateVoucherCode();
            const password = generatePassword();
            const pkg = payment.wifi_packages || {};
            const durationHours = pkg.duration_hours || 24;
            const mikrotikProfile = pkg.mikrotik_profile || 'default';

            const voucher = await createWifiVoucher({
                code,
                username: code,
                password,
                package_id: payment.package_id,
                package_name: payment.package_name,
                payment_id: paymentId,
                duration_hours: durationHours,
                created_by: 'system',
            });

            // 3. Create MikroTik hotspot user
            try {
                await createHotspotUser(
                    code,
                    password,
                    mikrotikProfile,
                    hoursToMikrotikUptime(durationHours),
                    `Auto: ${payment.phone_number} - ${payment.package_name}`
                );
            } catch (mikrotikError) {
                console.error('MikroTik user creation failed:', mikrotikError);
                // Don't fail - voucher is still valid for manual entry
            }

            // 4. Create session record
            await createWifiSession({
                voucher_id: voucher.id,
                voucher_code: code,
                username: code,
                mac_address: payment.mac_address,
                ip_address: payment.ip_address,
                package_name: payment.package_name,
                duration_hours: durationHours,
            });

            console.log(`Payment ${paymentId} completed. Voucher: ${code}`);

            return NextResponse.json({ success: true, message: 'Payment processed' });
        } else {
            // Payment failed
            await updateWifiPaymentStatus(paymentId, 'failed', transactionId);
            return NextResponse.json({ success: true, message: 'Payment marked as failed' });
        }
    } catch (error) {
        console.error('IPN callback error:', error);
        return NextResponse.json(
            { success: false, message: 'Server error processing callback' },
            { status: 500 }
        );
    }
}

// GET endpoint for testing
export async function GET() {
    return NextResponse.json({ status: 'Jenga IPN callback endpoint active' });
}
