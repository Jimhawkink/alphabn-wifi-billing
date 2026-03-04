import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Equity Jenga API v3 - Get Authentication Token
// Docs: https://developer.jengahq.io

async function getJengaToken(): Promise<string> {
    const apiKey = process.env.JENGA_API_KEY;
    const merchantCode = process.env.JENGA_MERCHANT_CODE;
    const consumerSecret = process.env.JENGA_CONSUMER_SECRET;
    const baseUrl = process.env.JENGA_API_URL || 'https://uat.finserve.africa';

    if (!apiKey || !merchantCode || !consumerSecret) {
        throw new Error('Jenga API credentials not configured');
    }

    const response = await fetch(`${baseUrl}/authentication/api/v3/authenticate/merchant`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Api-Key': apiKey,
        },
        body: JSON.stringify({
            merchantCode,
            consumerSecret,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Jenga auth failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.accessToken || data.token;
}

export async function POST() {
    try {
        const token = await getJengaToken();
        return NextResponse.json({ success: true, token });
    } catch (error) {
        console.error('Jenga auth error:', error);
        const message = error instanceof Error ? error.message : 'Authentication failed';
        return NextResponse.json(
            { success: false, message },
            { status: 500 }
        );
    }
}
