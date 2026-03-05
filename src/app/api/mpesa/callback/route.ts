import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// M-Pesa Daraja Callback - Called by Safaricom after payment
// Docs: https://developer.safaricom.co.ke

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        console.log('M-Pesa callback received:', JSON.stringify(body));

        const { Body } = body;

        if (!Body || !Body.stkCallback) {
            return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
        }

        const callback = Body.stkCallback;
        const resultCode = callback.ResultCode;
        const resultDesc = callback.ResultDesc;
        const checkoutRequestId = callback.CheckoutRequestID;

        console.log(`Payment result: ${resultCode} - ${resultDesc} (${checkoutRequestId})`);

        if (resultCode === 0) {
            // Payment successful
            const items = callback.CallbackMetadata?.Item || [];
            const amount = items.find((i: { Name: string }) => i.Name === 'Amount')?.Value;
            const mpesaCode = items.find((i: { Name: string }) => i.Name === 'MpesaReceiptNumber')?.Value;
            const phone = items.find((i: { Name: string }) => i.Name === 'PhoneNumber')?.Value;
            const transactionDate = items.find((i: { Name: string }) => i.Name === 'TransactionDate')?.Value;

            console.log(`Payment SUCCESS: ${mpesaCode}, KSh ${amount}, Phone: ${phone}`);

            // Update payment in Supabase
            try {
                const { supabase } = await import('@/lib/supabase');

                // Find the payment by checkout request ID
                const { data: payments } = await supabase
                    .from('wifi_payments')
                    .select('*')
                    .eq('jenga_checkout_request_id', checkoutRequestId)
                    .limit(1);

                if (payments && payments.length > 0) {
                    const payment = payments[0];

                    // Update payment status
                    await supabase
                        .from('wifi_payments')
                        .update({
                            status: 'completed',
                            payment_reference: mpesaCode,
                            completed_at: new Date().toISOString(),
                        })
                        .eq('id', payment.id);

                    console.log(`Payment ${payment.id} marked as completed`);

                    // Generate voucher
                    try {
                        // Get package details
                        const { data: pkg } = await supabase
                            .from('wifi_packages')
                            .select('*')
                            .eq('id', payment.package_id)
                            .single();

                        if (pkg) {
                            const voucherCode = `WF${Date.now().toString(36).toUpperCase()}`;
                            const username = `wifi_${voucherCode}`;
                            const password = Math.random().toString(36).substring(2, 8).toUpperCase();

                            await supabase.from('wifi_vouchers').insert({
                                code: voucherCode,
                                username: username,
                                password: password,
                                package_id: pkg.id,
                                package_name: pkg.name,
                                payment_id: payment.id,
                                duration_hours: pkg.duration_hours,
                                status: 'unused',
                            });

                            console.log(`Voucher created: ${voucherCode} (${username}/${password})`);

                            // Try to create MikroTik hotspot user
                            try {
                                const { createHotspotUser } = await import('@/lib/mikrotik');
                                await createHotspotUser(
                                    username,
                                    password,
                                    pkg.mikrotik_profile || 'default',
                                    `${pkg.duration_hours}:00:00`
                                );
                                console.log('MikroTik user created:', username);
                            } catch (mikrotikError) {
                                console.error('MikroTik user creation failed (will work when router is online):', mikrotikError);
                            }
                        }
                    } catch (voucherError) {
                        console.error('Voucher creation error:', voucherError);
                    }
                } else {
                    console.warn('No payment found for checkout ID:', checkoutRequestId);
                }
            } catch (dbError) {
                console.error('Database error in callback:', dbError);
            }
        } else {
            // Payment failed or cancelled
            console.log(`Payment FAILED: ${resultDesc}`);

            try {
                const { supabase } = await import('@/lib/supabase');
                await supabase
                    .from('wifi_payments')
                    .update({
                        status: resultCode === 1032 ? 'cancelled' : 'failed',
                    })
                    .eq('jenga_checkout_request_id', checkoutRequestId);
            } catch (e) {
                console.error('Failed to update payment status:', e);
            }
        }

        // Always respond with success to Safaricom
        return NextResponse.json({
            ResultCode: 0,
            ResultDesc: 'Accepted',
        });
    } catch (error) {
        console.error('Callback error:', error);
        return NextResponse.json({
            ResultCode: 0,
            ResultDesc: 'Accepted',
        });
    }
}

// Health check
export async function GET() {
    return NextResponse.json({
        status: 'M-Pesa callback endpoint active',
        time: new Date().toISOString(),
    });
}
