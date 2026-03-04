import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// WIFI PACKAGES
// ============================================

export interface WifiPackage {
    id: number;
    name: string;
    duration_hours: number;
    duration_label: string;
    price: number;
    speed_limit?: string;
    data_limit?: string;
    mikrotik_profile: string;
    is_active: boolean;
    sort_order: number;
    created_at: string;
}

export async function getWifiPackages() {
    const { data, error } = await supabase
        .from('wifi_packages')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

    if (error) throw error;
    return data as WifiPackage[];
}

export async function getAllWifiPackages() {
    const { data, error } = await supabase
        .from('wifi_packages')
        .select('*')
        .order('sort_order', { ascending: true });

    if (error) throw error;
    return data as WifiPackage[];
}

export async function addWifiPackage(pkg: Omit<WifiPackage, 'id' | 'created_at'>) {
    const { data, error } = await supabase
        .from('wifi_packages')
        .insert([pkg])
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateWifiPackage(id: number, updates: Partial<WifiPackage>) {
    const { data, error } = await supabase
        .from('wifi_packages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteWifiPackage(id: number) {
    const { error } = await supabase
        .from('wifi_packages')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// ============================================
// WIFI PAYMENTS
// ============================================

export interface WifiPayment {
    id: number;
    phone_number: string;
    amount: number;
    package_id: number;
    package_name: string;
    payment_method: string;
    payment_reference?: string;
    jenga_reference?: string;
    jenga_checkout_request_id?: string;
    status: 'pending' | 'completed' | 'failed' | 'cancelled';
    mac_address?: string;
    ip_address?: string;
    created_at: string;
    completed_at?: string;
}

export async function createWifiPayment(payment: {
    phone_number: string;
    amount: number;
    package_id: number;
    package_name: string;
    payment_method: string;
    mac_address?: string;
    ip_address?: string;
}) {
    const { data, error } = await supabase
        .from('wifi_payments')
        .insert([{
            ...payment,
            status: 'pending',
            created_at: new Date().toISOString(),
        }])
        .select()
        .single();

    if (error) throw error;
    return data as WifiPayment;
}

export async function updateWifiPaymentStatus(
    id: number,
    status: string,
    reference?: string,
    jengaRef?: string
) {
    const updates: Record<string, unknown> = { status };
    if (reference) updates.payment_reference = reference;
    if (jengaRef) updates.jenga_reference = jengaRef;
    if (status === 'completed') updates.completed_at = new Date().toISOString();

    const { data, error } = await supabase
        .from('wifi_payments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function getWifiPayments(limit = 50, offset = 0) {
    const { data, error } = await supabase
        .from('wifi_payments')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) throw error;
    return data as WifiPayment[];
}

export async function searchWifiPayment(reference: string) {
    const { data, error } = await supabase
        .from('wifi_payments')
        .select('*, wifi_vouchers(*)')
        .or(`payment_reference.ilike.%${reference}%,jenga_reference.ilike.%${reference}%,phone_number.ilike.%${reference}%`)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) throw error;
    return data;
}

// ============================================
// WIFI VOUCHERS
// ============================================

export interface WifiVoucher {
    id: number;
    code: string;
    username: string;
    password: string;
    package_id: number;
    package_name: string;
    payment_id?: number;
    duration_hours: number;
    status: 'unused' | 'active' | 'expired' | 'revoked';
    created_at: string;
    activated_at?: string;
    expires_at?: string;
    created_by?: string;
}

export async function createWifiVoucher(voucher: {
    code: string;
    username: string;
    password: string;
    package_id: number;
    package_name: string;
    payment_id?: number;
    duration_hours: number;
    created_by?: string;
}) {
    const { data, error } = await supabase
        .from('wifi_vouchers')
        .insert([{
            ...voucher,
            status: 'unused',
            created_at: new Date().toISOString(),
        }])
        .select()
        .single();

    if (error) throw error;
    return data as WifiVoucher;
}

export async function findVoucherByCode(code: string) {
    const { data, error } = await supabase
        .from('wifi_vouchers')
        .select('*')
        .eq('code', code.toUpperCase())
        .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as WifiVoucher | null;
}

export async function activateVoucher(id: number, durationHours: number) {
    const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
        .from('wifi_vouchers')
        .update({
            status: 'active',
            activated_at: new Date().toISOString(),
            expires_at: expiresAt,
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function getWifiVouchers(status?: string) {
    let query = supabase
        .from('wifi_vouchers')
        .select('*')
        .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    return data as WifiVoucher[];
}

export async function generateBulkVouchers(
    packageId: number,
    packageName: string,
    durationHours: number,
    count: number,
    createdBy: string
) {
    const vouchers = [];
    for (let i = 0; i < count; i++) {
        const code = generateVoucherCode();
        const password = generatePassword();
        vouchers.push({
            code,
            username: code,
            password,
            package_id: packageId,
            package_name: packageName,
            duration_hours: durationHours,
            status: 'unused',
            created_by: createdBy,
            created_at: new Date().toISOString(),
        });
    }

    const { data, error } = await supabase
        .from('wifi_vouchers')
        .insert(vouchers)
        .select();

    if (error) throw error;
    return data as WifiVoucher[];
}

// ============================================
// WIFI SESSIONS
// ============================================

export interface WifiSession {
    id: number;
    voucher_id?: number;
    voucher_code?: string;
    username: string;
    mac_address?: string;
    ip_address?: string;
    package_name: string;
    started_at: string;
    expires_at: string;
    ended_at?: string;
    status: 'active' | 'expired' | 'disconnected';
    bytes_in?: number;
    bytes_out?: number;
}

export async function createWifiSession(session: {
    voucher_id?: number;
    voucher_code?: string;
    username: string;
    mac_address?: string;
    ip_address?: string;
    package_name: string;
    duration_hours: number;
}) {
    const expiresAt = new Date(Date.now() + session.duration_hours * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
        .from('wifi_sessions')
        .insert([{
            ...session,
            status: 'active',
            started_at: new Date().toISOString(),
            expires_at: expiresAt,
        }])
        .select()
        .single();

    if (error) throw error;
    return data as WifiSession;
}

export async function getActiveSessions() {
    const { data, error } = await supabase
        .from('wifi_sessions')
        .select('*')
        .eq('status', 'active')
        .order('started_at', { ascending: false });

    if (error) throw error;
    return data as WifiSession[];
}

export async function endWifiSession(id: number) {
    const { error } = await supabase
        .from('wifi_sessions')
        .update({
            status: 'disconnected',
            ended_at: new Date().toISOString(),
        })
        .eq('id', id);

    if (error) throw error;
}

// ============================================
// WIFI SETTINGS
// ============================================

export interface WifiSettings {
    id: number;
    key: string;
    value: string;
    category: string;
}

export async function getWifiSettings() {
    const { data, error } = await supabase
        .from('wifi_settings')
        .select('*');

    if (error) throw error;
    const settings: Record<string, string> = {};
    (data || []).forEach((s: WifiSettings) => {
        settings[s.key] = s.value;
    });
    return settings;
}

export async function updateWifiSetting(key: string, value: string, category: string) {
    const { data: existing } = await supabase
        .from('wifi_settings')
        .select('id')
        .eq('key', key)
        .single();

    if (existing) {
        const { error } = await supabase
            .from('wifi_settings')
            .update({ value })
            .eq('key', key);
        if (error) throw error;
    } else {
        const { error } = await supabase
            .from('wifi_settings')
            .insert([{ key, value, category }]);
        if (error) throw error;
    }
}

// ============================================
// WIFI ADMIN AUTH
// ============================================

export async function adminLogin(username: string, password: string) {
    const { data, error } = await supabase
        .from('wifi_admins')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .eq('is_active', true)
        .single();

    if (error) throw error;
    return data;
}

// ============================================
// DASHBOARD STATS
// ============================================

export async function getWifiDashboardStats() {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Today's revenue
    const { data: todayPayments } = await supabase
        .from('wifi_payments')
        .select('amount')
        .eq('status', 'completed')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`);

    // Week's revenue
    const { data: weekPayments } = await supabase
        .from('wifi_payments')
        .select('amount')
        .eq('status', 'completed')
        .gte('created_at', `${weekAgo}T00:00:00`);

    // Active sessions
    const { count: activeSessions } = await supabase
        .from('wifi_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

    // Total vouchers unused
    const { count: unusedVouchers } = await supabase
        .from('wifi_vouchers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'unused');

    // Today's transactions count
    const todayRevenue = todayPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    const weekRevenue = weekPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

    return {
        todayRevenue,
        weekRevenue,
        todayTransactions: todayPayments?.length || 0,
        activeSessions: activeSessions || 0,
        unusedVouchers: unusedVouchers || 0,
    };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function generateVoucherCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

export function generatePassword(): string {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let pass = '';
    for (let i = 0; i < 6; i++) {
        pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
}

export function formatDuration(hours: number): string {
    if (hours < 24) return `${hours} HOURS`;
    if (hours < 168) return `${Math.floor(hours / 24)} DAYS`;
    if (hours < 720) return `${Math.floor(hours / 168)} WEEK${Math.floor(hours / 168) > 1 ? 'S' : ''}`;
    return `${Math.floor(hours / 720)} MONTH${Math.floor(hours / 720) > 1 ? 'S' : ''}`;
}

export function formatPrice(amount: number): string {
    return `${amount} Bob`;
}
