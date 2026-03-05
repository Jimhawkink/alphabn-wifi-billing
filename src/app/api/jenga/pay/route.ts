import { NextRequest, NextResponse } from 'next/server';
import { createWifiPayment } from '@/lib/supabase';
import * as crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Equity Jenga API v3 - M-Pesa STK Push
// Signature formula: merchant.accountNumber + payment.ref + payment.mobileNumber + payment.telco + payment.amount + payment.currency

function getPrivateKey(): string {
    const base64Key = process.env.JENGA_PRIVATE_KEY_BASE64;
    if (base64Key) {
        return Buffer.from(base64Key, 'base64').toString('utf8');
    }
    const envKey = process.env.JENGA_PRIVATE_KEY;
    if (envKey) {
        return envKey.replace(/\\n/g, '\n');
    }
    try {
        const fs = require('fs');
        const path = require('path');
        return fs.readFileSync(path.resolve(process.cwd(), 'jenga-private-key.pem'), 'utf8');
    } catch {
        throw new Error('Private key not found');
    }
}

function generateSignature(dataToSign: string): string {
    const privateKey = getPrivateKey();
    const sign = crypto.createSign('SHA256');
    sign.update(dataToSign);
    sign.end();
    return sign.sign(privateKey, 'base64');
}

async function getJengaToken(): Promise<string> {
    const apiKey = process.env.JENGA_API_KEY;
    const merchantCode = process.env.JENGA_MERCHANT_CODE;
    const consumerSecret = process.env.JENGA_CONSUMER_SECRET;
    const baseUrl = process.env.JENGA_API_URL || 'https://uat.finserve.africa';

    const response = await fetch(`${baseUrl}/authentication/api/v3/authenticate/merchant`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Api-Key': apiKey!,
        },
        body: JSON.stringify({ merchantCode, consumerSecret }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Auth failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.accessToken || data.token;
}

// Detect telco from Kenyan phone number
function detectTelco(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    const prefix = cleaned.startsWith('254') ? cleaned.substring(3, 6) : cleaned.substring(1, 4);

    // Safaricom prefixes
    if (['070', '071', '072', '074', '075', '076', '079', '710', '711', '712', '714', '715', '716', '717', '718', '719', '720', '721', '722', '723', '724', '725', '726', '727', '728', '729', '740', '741', '742', '743', '745', '746', '748', '757', '758', '759', '768', '769', '790', '791', '792', '793', '794', '795', '796', '797', '798', '799'].some(p => prefix.startsWith(p.substring(0, 2)))) {
        return 'Safaricom';
    }
    // Airtel prefixes
    if (['073', '078', '100', '101', '102', '103', '104', '105', '106'].some(p => prefix.startsWith(p.substring(0, 2)))) {
        return 'Airtel';
    }
    // Equitel
    if (prefix.startsWith('76')) {
        return 'Equitel';
    }
    return 'Safaricom'; // Default
}

// Format phone to 254 format
function formatPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('254')) return cleaned;
    if (cleaned.startsWith('0')) return '254' + cleaned.substring(1);
    return '254' + cleaned;
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

        // Create payment record
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

        const baseUrl = process.env.JENGA_API_URL || 'https://uat.finserve.africa';
        const merchantCode = process.env.JENGA_MERCHANT_CODE;

        if (!merchantCode || !process.env.JENGA_API_KEY) {
            return NextResponse.json({
                success: true,
                paymentId: payment.id,
                message: 'Payment request sent (demo mode).',
                demo: true,
            });
        }

        try {
            // 1. Authenticate
            const token = await getJengaToken();

            // 2. Prepare payment details
            const formattedPhone = formatPhone(phone);
            const telco = detectTelco(phone);
            const reference = `WIFI${payment.id}`;
            const amountStr = amount.toString();

            // 3. Generate signature
            // Formula: merchant.accountNumber + payment.ref + payment.mobileNumber + payment.telco + payment.amount + payment.currency
            const signatureData = `${merchantCode}${reference}${formattedPhone}${telco}${amountStr}KES`;
            console.log('Signature data:', signatureData);
            const signature = generateSignature(signatureData);
            console.log('Signature generated successfully');

            // 4. STK Push request
            const stkUrl = `${baseUrl}/v3-apis/payment-api/v3.0/stkussdpush/initiate`;

            const paymentPayload = {
                merchant: {
                    accountNumber: merchantCode,
                    name: process.env.NEXT_PUBLIC_BUSINESS_NAME || 'AlphaBN',
                },
                payment: {
                    ref: reference,
                    mobileNumber: formattedPhone,
                    telco: telco,
                    amount: amountStr,
                    currency: 'KES',
                    description: `WiFi: ${packageName}`,
                    pushType: 'STK',
                },
            };

            console.log('STK URL:', stkUrl);
            console.log('Payload:', JSON.stringify(paymentPayload));

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
                // Update payment record
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
                console.error('STK error:', paymentData);
                return NextResponse.json({
                    success: false,
                    message: paymentData.message || paymentData.error || 'Payment failed.',
                    detail: paymentData,
                    debug: {
                        signatureData,
                        telco,
                        formattedPhone,
                        stkUrl,
                    },
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
