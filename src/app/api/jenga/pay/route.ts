import { NextRequest, NextResponse } from 'next/server';
import { createWifiPayment } from '@/lib/supabase';
import * as crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Equity Jenga API v3 - Initiate Payment (M-Pesa STK Push)
// Requires RSA signature for transaction requests

function getPrivateKey(): string {
    // Read from env variable (recommended for Vercel)
    const envKey = process.env.JENGA_PRIVATE_KEY;
    if (envKey) {
        // Handle escaped newlines in env vars
        return envKey.replace(/\\n/g, '\n');
    }
    // Fallback to file (local dev)
    try {
        const fs = require('fs');
        const path = require('path');
        return fs.readFileSync(path.resolve(process.cwd(), 'jenga-private-key.pem'), 'utf8');
    } catch {
        throw new Error('Private key not found. Set JENGA_PRIVATE_KEY env variable.');
    }
}

function signRequest(data: string): string {
    const privateKey = getPrivateKey();
    const sign = crypto.createSign('SHA256');
    sign.update(data);
    sign.end();
    return sign.sign(privateKey, 'base64');
}

async function getJengaToken(): Promise<string> {
    const apiKey = process.env.JENGA_API_KEY;
    const merchantCode = process.env.JENGA_MERCHANT_CODE;
    const consumerSecret = process.env.JENGA_CONSUMER_SECRET;
    const baseUrl = process.env.JENGA_API_URL || 'https://uat.finserve.africa';

    console.log('Jenga auth at:', `${baseUrl}/authentication/api/v3/authenticate/merchant`);

    const response = await fetch(`${baseUrl}/authentication/api/v3/authenticate/merchant`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Api-Key': apiKey!,
        },
        body: JSON.stringify({ merchantCode, consumerSecret }),
    });

    const responseText = await response.text();
    console.log('Auth response:', response.status, responseText.substring(0, 200));

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

        // 1. Create payment record
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
            console.error('DB error:', dbError);
            payment = { id: Date.now() };
        }

        // 2. Check if Jenga is configured
        const baseUrl = process.env.JENGA_API_URL || 'https://uat.finserve.africa';
        const merchantCode = process.env.JENGA_MERCHANT_CODE;

        if (!merchantCode || !process.env.JENGA_API_KEY) {
            console.log('DEMO MODE: No Jenga credentials');
            return NextResponse.json({
                success: true,
                paymentId: payment.id,
                message: 'Payment request sent (demo mode).',
                demo: true,
            });
        }

        try {
            // 3. Authenticate
            const token = await getJengaToken();
            console.log('Got token, initiating STK push...');

            // 4. Generate signature
            // Jenga v3 signature: sign the concatenation of specific fields
            const reference = `WIFI-${payment.id}`;
            const signatureData = `${amount}${phone}${reference}`;
            const signature = signRequest(signatureData);
            console.log('Generated signature for:', signatureData);

            // 5. M-Pesa STK Push
            const stkUrl = `${baseUrl}/v3-apis/payment-api/v3.0/stkussdpush/initiate`;

            const paymentPayload = {
                customer: {
                    mobileNumber: phone,
                    countryCode: 'KE',
                },
                transaction: {
                    amount: amount.toString(),
                    description: `WiFi: ${packageName}`,
                    reference: reference,
                    currency: 'KES',
                },
                merchant: {
                    tillNumber: merchantCode,
                },
            };

            console.log('STK payload:', JSON.stringify(paymentPayload));

            const paymentResponse = await fetch(stkUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'signature': signature,
                },
                body: JSON.stringify(paymentPayload),
            });

            const responseText = await paymentResponse.text();
            console.log('STK response:', paymentResponse.status, responseText);

            let paymentData;
            try {
                paymentData = JSON.parse(responseText);
            } catch {
                paymentData = { message: responseText };
            }

            if (paymentResponse.ok) {
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
                    console.error('Failed to update reference:', e);
                }

                return NextResponse.json({
                    success: true,
                    paymentId: payment.id,
                    jengaRef: paymentData.transactionId || paymentData.referenceNumber || paymentData.checkoutRequestID,
                    message: 'Payment request sent to your phone. Please enter your M-Pesa PIN.',
                });
            } else {
                console.error('STK push error:', paymentData);
                return NextResponse.json({
                    success: false,
                    message: paymentData.message || paymentData.error || 'Payment failed. Please try again.',
                    detail: paymentData,
                    paymentId: payment.id,
                }, { status: 400 });
            }
        } catch (jengaError: unknown) {
            const msg = jengaError instanceof Error ? jengaError.message : 'Unknown error';
            console.error('Jenga error:', msg);
            return NextResponse.json({
                success: false,
                message: `Payment error: ${msg}`,
                paymentId: payment.id,
            }, { status: 503 });
        }
    } catch (error) {
        console.error('Route error:', error);
        return NextResponse.json(
            { success: false, message: 'Server error. Please try again.' },
            { status: 500 }
        );
    }
}
