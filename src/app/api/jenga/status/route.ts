import { NextRequest, NextResponse } from 'next/server';
import { supabase, searchWifiPayment } from '@/lib/supabase';

// Check payment status / search by reference
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId');
    const reference = searchParams.get('reference');

    try {
        if (paymentId) {
            // Check specific payment status
            const { data: payment, error } = await supabase
                .from('wifi_payments')
                .select('*, wifi_vouchers:wifi_vouchers(code, password, status)')
                .eq('id', parseInt(paymentId))
                .single();

            if (error || !payment) {
                return NextResponse.json({ found: false, status: 'not_found' });
            }

            const voucher = payment.wifi_vouchers?.[0] || null;

            return NextResponse.json({
                found: true,
                status: payment.status,
                voucher: voucher ? { code: voucher.code, password: voucher.password } : null,
                amount: payment.amount,
                packageName: payment.package_name,
            });
        }

        if (reference) {
            // Search by reference, phone, or Jenga ref
            const results = await searchWifiPayment(reference);

            if (results && results.length > 0) {
                const payment = results[0];
                const vouchers = (payment as Record<string, unknown>).wifi_vouchers as Array<{ code: string; password: string }> | undefined;
                const voucher = vouchers?.[0] || null;

                return NextResponse.json({
                    found: true,
                    status: payment.status,
                    voucher: voucher ? { code: voucher.code, password: voucher.password } : null,
                    amount: payment.amount,
                    packageName: payment.package_name,
                    phone: payment.phone_number,
                });
            }

            return NextResponse.json({ found: false });
        }

        return NextResponse.json({ error: 'Provide paymentId or reference' }, { status: 400 });
    } catch (error) {
        console.error('Status check error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
