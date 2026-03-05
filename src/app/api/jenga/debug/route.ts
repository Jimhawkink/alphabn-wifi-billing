import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Debug endpoint to test Jenga API authentication
// Access: GET /api/jenga/debug

export async function GET() {
    const apiKey = process.env.JENGA_API_KEY;
    const merchantCode = process.env.JENGA_MERCHANT_CODE;
    const consumerSecret = process.env.JENGA_CONSUMER_SECRET;
    const baseUrl = process.env.JENGA_API_URL || 'https://uat.finserve.africa';
    const hasPrivateKeyBase64 = !!process.env.JENGA_PRIVATE_KEY_BASE64;
    const hasPrivateKey = !!process.env.JENGA_PRIVATE_KEY;

    const results: Record<string, unknown> = {
        config: {
            baseUrl,
            merchantCode,
            apiKeyPresent: !!apiKey,
            apiKeyFirst10: apiKey ? apiKey.substring(0, 10) + '...' : 'MISSING',
            consumerSecretPresent: !!consumerSecret,
            consumerSecretFirst10: consumerSecret ? consumerSecret.substring(0, 10) + '...' : 'MISSING',
            hasPrivateKeyBase64,
            hasPrivateKey,
        },
    };

    // Try multiple auth endpoints
    const authEndpoints = [
        `${baseUrl}/authentication/api/v3/authenticate/merchant`,
        `${baseUrl}/authentication/api/v3/authenticate`,
        `${baseUrl}/authenticate/merchant`,
        `${baseUrl}/identity-service/v3/authenticate`,
        `${baseUrl}/identity/v2/tokenize`,
    ];

    for (const endpoint of authEndpoints) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Api-Key': apiKey || '',
                },
                body: JSON.stringify({ merchantCode, consumerSecret }),
            });

            const text = await response.text();
            let parsed;
            try { parsed = JSON.parse(text); } catch { parsed = text; }

            results[endpoint] = {
                status: response.status,
                statusText: response.statusText,
                response: parsed,
            };

            // If one works, highlight it
            if (response.ok) {
                results['SUCCESS'] = endpoint;
                break;
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            results[endpoint] = { error: msg };
        }
    }

    return NextResponse.json(results, { status: 200 });
}
