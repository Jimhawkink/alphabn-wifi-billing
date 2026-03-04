import { NextRequest, NextResponse } from 'next/server';
import { createWifiPayment } from '@/lib/supabase';

// Equity Jenga API - Initiate Payment (Receive Money - Mobile)
// This sends an STK push to the customer's phone

async function getJengaToken(): Promise<string> {
    const apiKey = process.env.JENGA_API_KEY;
    const merchantCode = process.env.JENGA_MERCHANT_CODE;
    const consumerSecret = process.env.JENGA_CONSUMER_SECRET;
    const apiUrl = process.env.JENGA_API_URL || 'https://uat.jengahq.io';

    const response = await fetch(`${apiUrl}/authenticate/merchant`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Api-Key': apiKey!,
        },
        body: JSON.stringify({ merchantCode, consumerSecret }),
    });

    if (!response.ok) throw new Error('Auth failed');
    const data = await response.json();
    return data.accessToken || data.token;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { phone, amount, packageId, packageName, macAddress, ipAddress } = body;

        if (!phone || !amount || !packageId) {
            return NextResponse.json(
                { success: false, message: 'Missing required fields' },
                { status: 400 }
            );
        }

        // 1. Create payment record in Supabase
        let payment;
        try {
            payment = await createWifiPayment({
                phone_number: phone,
                amount,
                package_id: packageId,
                package_name: packageName || 'WiFi Package',
                payment_method: 'jenga_mobile',
                mac_address: macAddress,
                ip_address: ipAddress,
            });
        } catch (dbError) {
            console.error('DB error creating payment:', dbError);
            // Continue anyway - payment can still work
            payment = { id: Date.now() }; // Temporary ID
        }

        // 2. Initiate Jenga payment (Receive Money)
        const apiUrl = process.env.JENGA_API_URL || 'https://uat.jengahq.io';
        const merchantCode = process.env.JENGA_MERCHANT_CODE;

        if (!merchantCode || !process.env.JENGA_API_KEY) {
            // Demo mode - simulate successful payment initiation
            console.log('DEMO MODE: Jenga API not configured. Simulating payment.');
            return NextResponse.json({
                success: true,
                paymentId: payment.id,
                message: 'Payment request sent (demo mode). In production, STK push will be sent to your phone.',
                demo: true,
            });
        }

        try {
            const token = await getJengaToken();

            // Jenga Receive Money - Mobile Wallet
            const paymentResponse = await fetch(`${apiUrl}/transaction/v2/remittance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    source: {
                        countryCode: 'KE',
                        name: 'WiFi Customer',
                        accountNumber: phone,
                    },
                    destination: {
                        type: 'merchant',
                        countryCode: 'KE',
                        name: process.env.NEXT_PUBLIC_BUSINESS_NAME || 'AlphaBN',
                        merchantCode: merchantCode,
                    },
                    transfer: {
                        type: 'MobileWallet',
                        amount: amount.toString(),
                        currencyCode: 'KES',
                        reference: `WIFI-${payment.id}`,
                        date: new Date().toISOString().split('T')[0],
                        description: `WiFi: ${packageName}`,
                    },
                }),
            });

            const paymentData = await paymentResponse.json();

            if (paymentResponse.ok) {
                // Update payment record with Jenga reference
                try {
                    const { supabase } = await import('@/lib/supabase');
                    await supabase
                        .from('wifi_payments')
                        .update({
                            jenga_reference: paymentData.transactionId || paymentData.referenceNumber,
                            jenga_checkout_request_id: paymentData.checkoutRequestId,
                        })
                        .eq('id', payment.id);
                } catch (e) {
                    console.error('Failed to update payment reference:', e);
                }

                return NextResponse.json({
                    success: true,
                    paymentId: payment.id,
                    jengaRef: paymentData.transactionId || paymentData.referenceNumber,
                    message: 'Payment request sent to your phone. Please complete the payment.',
                });
            } else {
                console.error('Jenga payment error:', paymentData);
                return NextResponse.json({
                    success: false,
                    message: paymentData.message || 'Payment initiation failed. Please try again.',
                    paymentId: payment.id,
                }, { status: 400 });
            }
        } catch (jengaError) {
            console.error('Jenga API error:', jengaError);
            return NextResponse.json({
                success: false,
                message: 'Payment service temporarily unavailable. Please try again.',
                paymentId: payment.id,
            }, { status: 503 });
        }
    } catch (error) {
        console.error('Payment route error:', error);
        return NextResponse.json(
            { success: false, message: 'Server error. Please try again.' },
            { status: 500 }
        );
    }
}
