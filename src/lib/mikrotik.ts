// MikroTik RouterOS REST API Helper
// Requires RouterOS v7.1+ with www or www-ssl service enabled

interface MikroTikConfig {
    host: string;
    port: number;
    username: string;
    password: string;
    useSsl: boolean;
}

function getConfig(): MikroTikConfig {
    return {
        host: process.env.MIKROTIK_HOST || '192.168.88.1',
        port: parseInt(process.env.MIKROTIK_PORT || '443'),
        username: process.env.MIKROTIK_USERNAME || 'admin',
        password: process.env.MIKROTIK_PASSWORD || '',
        useSsl: process.env.MIKROTIK_USE_SSL !== 'false',
    };
}

function getBaseUrl(config: MikroTikConfig): string {
    const protocol = config.useSsl ? 'https' : 'http';
    return `${protocol}://${config.host}:${config.port}`;
}

function getAuthHeader(config: MikroTikConfig): string {
    return 'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64');
}

async function mikrotikRequest(path: string, method: string = 'GET', body?: Record<string, unknown>) {
    const config = getConfig();
    const url = `${getBaseUrl(config)}/rest${path}`;

    const headers: Record<string, string> = {
        'Authorization': getAuthHeader(config),
        'Content-Type': 'application/json',
    };

    const options: RequestInit = {
        method,
        headers,
        // Skip SSL verification for self-signed certs on MikroTik
        // @ts-expect-error - Node.js specific option
        rejectUnauthorized: false,
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`MikroTik API error (${response.status}): ${errorText}`);
        }
        const text = await response.text();
        return text ? JSON.parse(text) : null;
    } catch (error) {
        console.error('MikroTik API request failed:', error);
        throw error;
    }
}

// ============================================
// HOTSPOT USER MANAGEMENT
// ============================================

export async function createHotspotUser(
    username: string,
    password: string,
    profile: string,
    limitUptime?: string,
    comment?: string
) {
    const body: Record<string, unknown> = {
        name: username,
        password: password,
        profile: profile,
    };

    if (limitUptime) body['limit-uptime'] = limitUptime;
    if (comment) body.comment = comment;

    return await mikrotikRequest('/ip/hotspot/user/add', 'POST', body);
}

export async function removeHotspotUser(username: string) {
    // First find the user ID
    const users = await mikrotikRequest('/ip/hotspot/user/print');
    const user = users?.find((u: Record<string, string>) => u.name === username);

    if (user) {
        return await mikrotikRequest('/ip/hotspot/user/remove', 'POST', {
            '.id': user['.id'],
        });
    }
    return null;
}

export async function getHotspotUsers() {
    return await mikrotikRequest('/ip/hotspot/user/print');
}

export async function getActiveHotspotUsers() {
    return await mikrotikRequest('/ip/hotspot/active/print');
}

export async function disconnectHotspotUser(sessionId: string) {
    return await mikrotikRequest('/ip/hotspot/active/remove', 'POST', {
        '.id': sessionId,
    });
}

// ============================================
// HOTSPOT PROFILES
// ============================================

export async function getHotspotProfiles() {
    return await mikrotikRequest('/ip/hotspot/user/profile/print');
}

export async function createHotspotProfile(
    name: string,
    rateLimit?: string,
    sharedUsers?: number
) {
    const body: Record<string, unknown> = { name };
    if (rateLimit) body['rate-limit'] = rateLimit;
    if (sharedUsers) body['shared-users'] = sharedUsers;

    return await mikrotikRequest('/ip/hotspot/user/profile/add', 'POST', body);
}

// ============================================
// HOTSPOT LOGIN (via URL redirect)
// ============================================

export function generateLoginUrl(
    mikrotikLoginUrl: string,
    username: string,
    password: string,
    dst?: string
): string {
    const params = new URLSearchParams({
        username,
        password,
        dst: dst || 'http://www.google.com',
    });
    return `${mikrotikLoginUrl}?${params.toString()}`;
}

// Convert hours to MikroTik uptime format
export function hoursToMikrotikUptime(hours: number): string {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (remainingHours === 0) return `${days}d`;
    return `${days}d${remainingHours}h`;
}
