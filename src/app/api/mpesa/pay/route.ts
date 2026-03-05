import { NextRequest, NextResponse } from 'next/server';
import { createWifiPayment } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// M-Pesa Daraja API - STK Push (Lipa Na M-Pesa Online)
// Docs: https://developer.safaricom.co.ke

// Get OAuth token from Daraja
async function getDarajaToken(): Promise<string> {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const baseUrl = process.env.MPESA_API_URL || 'https://sandbox.safaricom.co.ke';

    if (!consumerKey || !consumerSecret) {
        throw new Error('M-Pesa credentials not configured');
    }

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    const response = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        method: 'GET',
        headers: {
            'Authorization': `Basic ${auth}`,
        },
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`OAuth failed (${response.status}): ${text}`);
    }

    const data = await response.json();
    return data.access_token;
}

// Format phone to 254 format
function formatPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('254')) return cleaned;
    if (cleaned.startsWith('0')) return '254' + cleaned.substring(1);
    if (cleaned.startsWith('+254')) return cleaned.substring(1);
    return '254' + cleaned;
}

// Generate STK Push password
function generatePassword(shortcode: string, passkey: string, timestamp: string): string {
    return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
}

// Get current timestamp in Daraja format
function getTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hour}${minute}${second}`;
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
                payment_method: 'mpesa',
                mac_address: macAddress,
                ip_address: ipAddress,
            });
        } catch (dbError) {
            console.error('DB error:', dbError);
            payment = { id: Date.now() };
        }

        // 2. Check if M-Pesa is configured
        const shortcode = process.env.MPESA_SHORTCODE;
        const passkey = process.env.MPESA_PASSKEY;

        if (!shortcode || !process.env.MPESA_CONSUMER_KEY) {
            // Demo mode
            return NextResponse.json({
                success: true,
                paymentId: payment.id,
                message: 'Payment request sent (demo mode). Configure M-Pesa credentials for live payments.',
                demo: true,
            });
        }

        try {
            // 3. Get OAuth token
            const token = await getDarajaToken();
            const baseUrl = process.env.MPESA_API_URL || 'https://sandbox.safaricom.co.ke';

            // 4. Prepare STK Push
            const timestamp = getTimestamp();
            const password = generatePassword(shortcode, passkey!, timestamp);
            const formattedPhone = formatPhone(phone);
            const callbackUrl = process.env.MPESA_CALLBACK_URL || 'https://alphabn-wifi-billing.vercel.app/api/mpesa/callback';

            const stkPayload = {
                BusinessShortCode: shortcode,
                Password: password,
                Timestamp: timestamp,
                TransactionType: 'CustomerBuyGoodsOnline',
                Amount: Math.ceil(amount),
                PartyA: formattedPhone,
                PartyB: process.env.MPESA_TILL_NUMBER || shortcode,
                PhoneNumber: formattedPhone,
                CallBackURL: callbackUrl,
                AccountReference: `WIFI${payment.id}`,
                TransactionDesc: `WiFi: ${packageName}`,
            };

            console.log('STK Push payload:', JSON.stringify({
                ...stkPayload,
                Password: '***hidden***',
            }));

            // 5. Send STK Push
            const stkResponse = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(stkPayload),
            });

            const responseText = await stkResponse.text();
            console.log('STK response:', stkResponse.status, responseText);

            let stkData;
            try {
                stkData = JSON.parse(responseText);
            } catch {
                stkData = { errorMessage: responseText };
            }

            if (stkResponse.ok && stkData.ResponseCode === '0') {
                // Success - STK push sent to phone
                try {
                    const { supabase } = await import('@/lib/supabase');
                    await supabase
                        .from('wifi_payments')
                        .update({
                            jenga_reference: stkData.MerchantRequestID,
                            jenga_checkout_request_id: stkData.CheckoutRequestID,
                        })
                        .eq('id', payment.id);
                } catch (e) {
                    console.error('Failed to update reference:', e);
                }

                return NextResponse.json({
                    success: true,
                    paymentId: payment.id,
                    checkoutRequestId: stkData.CheckoutRequestID,
                    message: 'Payment request sent to your phone. Please enter your M-Pesa PIN.',
                });
            } else {
                console.error('STK Push error:', stkData);
                return NextResponse.json({
                    success: false,
                    message: stkData.errorMessage || stkData.CustomerMessage || 'STK Push failed. Please try again.',
                    detail: stkData,
                    paymentId: payment.id,
                }, { status: 400 });
            }
        } catch (mpesaError: unknown) {
            const msg = mpesaError instanceof Error ? mpesaError.message : 'Unknown error';
            console.error('M-Pesa error:', msg);
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
