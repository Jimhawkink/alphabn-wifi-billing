import { NextRequest, NextResponse } from 'next/server';
import { createWifiPayment } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Equity Jenga API v3 - Initiate Payment (M-Pesa STK Push)
// Docs: https://developer.jengahq.io

async function getJengaToken(): Promise<string> {
    const apiKey = process.env.JENGA_API_KEY;
    const merchantCode = process.env.JENGA_MERCHANT_CODE;
    const consumerSecret = process.env.JENGA_CONSUMER_SECRET;
    const baseUrl = process.env.JENGA_API_URL || 'https://uat.finserve.africa';

    console.log('Authenticating with Jenga at:', `${baseUrl}/authentication/api/v3/authenticate/merchant`);

    const response = await fetch(`${baseUrl}/authentication/api/v3/authenticate/merchant`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Api-Key': apiKey!,
        },
        body: JSON.stringify({ merchantCode, consumerSecret }),
    });

    const responseText = await response.text();
    console.log('Jenga auth response:', response.status, responseText);

    if (!response.ok) {
        throw new Error(`Auth failed (${response.status}): ${responseText}`);
    }

    const data = JSON.parse(responseText);
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
            payment = { id: Date.now() };
        }

        // 2. Initiate Jenga payment (M-Pesa STK Push)
        const baseUrl = process.env.JENGA_API_URL || 'https://uat.finserve.africa';
        const merchantCode = process.env.JENGA_MERCHANT_CODE;

        if (!merchantCode || !process.env.JENGA_API_KEY) {
            // Demo mode
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
            console.log('Got Jenga token, initiating STK push...');

            // Jenga v3 - M-Pesa STK/USSD Push
            const stkUrl = `${baseUrl}/v3-apis/payment-api/v3.0/stkussdpush/initiate`;
            console.log('STK push URL:', stkUrl);

            const paymentPayload = {
                customer: {
                    mobileNumber: phone,
                    countryCode: 'KE',
                },
                transaction: {
                    amount: amount.toString(),
                    description: `WiFi: ${packageName}`,
                    reference: `WIFI-${payment.id}`,
                    currency: 'KES',
                },
                merchant: {
                    tillNumber: merchantCode,
                },
            };
            console.log('STK push payload:', JSON.stringify(paymentPayload));

            const paymentResponse = await fetch(stkUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(paymentPayload),
            });

            const responseText = await paymentResponse.text();
            console.log('STK push response:', paymentResponse.status, responseText);

            let paymentData;
            try {
                paymentData = JSON.parse(responseText);
            } catch {
                paymentData = { message: responseText };
            }

            if (paymentResponse.ok) {
                // Update payment record with Jenga reference
                try {
                    const { supabase } = await import('@/lib/supabase');
                    await supabase
                        .from('wifi_payments')
                        .update({
                            jenga_reference: paymentData.transactionId || paymentData.referenceNumber || paymentData.checkoutRequestID,
                            jenga_checkout_request_id: paymentData.checkoutRequestID || paymentData.checkoutRequestId,
                        })
                        .eq('id', payment.id);
                } catch (e) {
                    console.error('Failed to update payment reference:', e);
                }

                return NextResponse.json({
                    success: true,
                    paymentId: payment.id,
                    jengaRef: paymentData.transactionId || paymentData.referenceNumber || paymentData.checkoutRequestID,
                    message: 'Payment request sent to your phone. Please enter your M-Pesa PIN.',
                });
            } else {
                console.error('Jenga STK push error:', paymentData);
                return NextResponse.json({
                    success: false,
                    message: paymentData.message || paymentData.error || 'Payment initiation failed. Please try again.',
                    detail: paymentData,
                    paymentId: payment.id,
                }, { status: 400 });
            }
        } catch (jengaError: unknown) {
            const errorMessage = jengaError instanceof Error ? jengaError.message : 'Unknown error';
            console.error('Jenga API error:', errorMessage);
            return NextResponse.json({
                success: false,
                message: `Payment service error: ${errorMessage}`,
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
