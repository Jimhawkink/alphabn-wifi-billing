import { NextResponse } from 'next/server';

// Equity Jenga API - Get Authentication Token
// Docs: https://developer.jengaapi.io

async function getJengaToken(): Promise<string> {
    const apiKey = process.env.JENGA_API_KEY;
    const merchantCode = process.env.JENGA_MERCHANT_CODE;
    const consumerSecret = process.env.JENGA_CONSUMER_SECRET;
    const apiUrl = process.env.JENGA_API_URL || 'https://uat.jengahq.io';

    if (!apiKey || !merchantCode || !consumerSecret) {
        throw new Error('Jenga API credentials not configured');
    }

    const response = await fetch(`${apiUrl}/authenticate/merchant`, {
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
        throw new Error(`Jenga auth failed: ${errorText}`);
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
        return NextResponse.json(
            { success: false, message: 'Authentication failed' },
            { status: 500 }
        );
    }
}

// Note: getJengaToken is defined locally in each route that needs it
// because Next.js route files cannot export non-HTTP functions
