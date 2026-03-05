import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Quick test: Can we get an M-Pesa OAuth token?
export async function GET() {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const baseUrl = process.env.MPESA_API_URL || 'https://sandbox.safaricom.co.ke';

    const result: Record<string, unknown> = {
        config: {
            baseUrl,
            shortcode: process.env.MPESA_SHORTCODE,
            hasConsumerKey: !!consumerKey,
            hasConsumerSecret: !!consumerSecret,
            hasPasskey: !!process.env.MPESA_PASSKEY,
            callbackUrl: process.env.MPESA_CALLBACK_URL,
        }
    };

    if (!consumerKey || !consumerSecret) {
        result.error = 'Missing MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET';
        return NextResponse.json(result, { status: 400 });
    }

    // Test OAuth
    try {
        const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
        const start = Date.now();

        const response = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
            method: 'GET',
            headers: { 'Authorization': `Basic ${auth}` },
            signal: AbortSignal.timeout(8000),
        });

        const elapsed = Date.now() - start;
        const text = await response.text();

        result.oauth = {
            status: response.status,
            elapsedMs: elapsed,
            response: (() => { try { return JSON.parse(text); } catch { return text; } })(),
        };

        if (response.ok) {
            result.success = true;
            result.message = 'OAuth works! Sandbox is reachable.';
        }
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown';
        result.oauth = { error: msg };
        result.message = 'Sandbox is DOWN or timing out. Try again in a few minutes.';
    }

    return NextResponse.json(result);
}
