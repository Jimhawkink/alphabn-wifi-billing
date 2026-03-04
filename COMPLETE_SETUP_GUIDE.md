# AlphaBN WiFi Billing — Complete Setup Guide
> Safaricom Router + MikroTik RB951 + Tenda AC1200 + Vercel + JengaHQ

---

## PHASE 1: Physical Cabling

```
[ Safaricom Router ]
        │
        │  Ethernet cable (from Safaricom LAN port)
        ▼
[ MikroTik RB951 — Port 1 (ether1/WAN) ]
        │
        ├── Port 2,3,4 → LAN devices / Tenda AC1200
        ├── Built-in WiFi → Ground floor users
        │
        │  Ethernet cable (from MikroTik Port 2 → Tenda LAN port)
        ▼
[ Tenda AC1200 in AP Mode ] → 1st/2nd floor users
```

### Steps:
1. **Safaricom → MikroTik**: Plug Ethernet from Safaricom router's LAN port into MikroTik **Port 1 (ether1)**
2. **MikroTik → Tenda**: Plug Ethernet from MikroTik **Port 2** into Tenda's **LAN port** (NOT WAN)
3. Power on all devices

---

## PHASE 2: Set Up Tenda AC1200 as Access Point

Do this FIRST before configuring MikroTik.

1. Connect your laptop to Tenda WiFi (default: `Tenda_XXXX`)
2. Open browser → go to **192.168.0.1**
3. Go to **System Settings → Working Mode**
4. Select **"AP Mode"** (Access Point)
5. **Disable DHCP** on the Tenda
6. Set WiFi Name (SSID): **`AlphaBN WiFi`** (same name you'll use on MikroTik)
7. Set WiFi Password: Leave **OPEN** (no password) — the hotspot portal handles auth
8. Save and reboot Tenda
9. Now connect Ethernet from MikroTik Port 2 → Tenda **LAN port**

> ⚠️ After switching to AP mode, Tenda's admin may change to a different IP. You can access it via MikroTik later.

---

## PHASE 3: Configure MikroTik RB951

### 3A. Connect to MikroTik

**Option 1 — Winbox (Recommended):**
1. Download Winbox from https://mikrotik.com/download
2. Connect laptop to MikroTik Port 3 or 4 via Ethernet
3. Open Winbox → Click on your router's MAC address → Connect
4. Default login: `admin` / no password

**Option 2 — WebFig:**
1. Open browser → go to `192.168.88.1`
2. Login: `admin` / no password

### 3B. Upgrade to RouterOS v7

```
# In MikroTik Terminal:
/system package update set channel=upgrade
/system package update check-for-updates
```
If v7 is available:
```
/system package update install
```
Router will reboot. After reboot, verify:
```
/system resource print
# Look for: version: 7.x.x
```

> ⚠️ If upgrade fails, download v7 firmware from https://mikrotik.com/download for **MIPSBE** architecture, drag the `.npk` file into Winbox Files, then reboot.

### 3C. Set Up Internet (WAN on ether1)

```
# Set ether1 as WAN with DHCP client (gets IP from Safaricom)
/ip dhcp-client add interface=ether1 disabled=no

# Verify you got an IP:
/ip dhcp-client print
# Should show status: bound
```

Test internet:
```
/ping 8.8.8.8 count=3
```

### 3D. Create Bridge for LAN + WiFi

```
# Create bridge
/interface bridge add name=bridge-lan

# Add LAN ports to bridge
/interface bridge port add interface=ether2 bridge=bridge-lan
/interface bridge port add interface=ether3 bridge=bridge-lan
/interface bridge port add interface=ether4 bridge=bridge-lan
/interface bridge port add interface=ether5 bridge=bridge-lan
/interface bridge port add interface=wlan1 bridge=bridge-lan

# Set bridge IP
/ip address add address=192.168.88.1/24 interface=bridge-lan

# Set up DHCP server for LAN
/ip pool add name=dhcp-pool ranges=192.168.88.10-192.168.88.254
/ip dhcp-server add name=dhcp-lan interface=bridge-lan address-pool=dhcp-pool disabled=no
/ip dhcp-server network add address=192.168.88.0/24 gateway=192.168.88.1 dns-server=8.8.8.8,8.8.4.4

# NAT (masquerade) for internet access
/ip firewall nat add chain=srcnat out-interface=ether1 action=masquerade
```

### 3E. Set Up WiFi

```
/interface wireless set wlan1 mode=ap-bridge ssid="AlphaBN WiFi" band=2ghz-b/g/n frequency=auto disabled=no
/interface wireless security-profiles set default authentication-types="" mode=none
```

> We set WiFi to **OPEN** (no password) because the Hotspot captive portal will handle authentication.

### 3F. Enable REST API

```
# Enable HTTPS web service (for REST API)
/ip service enable www-ssl
/ip service set www-ssl port=443

# Create API user for the billing app
/user add name=wifiapi password=AlphaBN2026! group=full
```

> 📝 Note down: Username: `wifiapi` | Password: `AlphaBN2026!` (change this!)

---

## PHASE 4: Set Up Hotspot

### 4A. Create Hotspot

```
# Run hotspot setup on the bridge interface
/ip hotspot setup
```

When prompted:
- **Hotspot Interface**: `bridge-lan`
- **Local Address**: `192.168.88.1/24`
- **Masquerade Network**: `192.168.88.0/24`
- **Address Pool**: `dhcp-pool`
- **SSL Certificate**: `none`
- **SMTP Server**: `0.0.0.0`
- **DNS Servers**: `8.8.8.8`
- **DNS Name**: `wifi.alphabn.co.ke` (or any name you like)
- **Name of Local Hotspot User**: skip (we'll create via billing app)
- **Password**: skip

### 4B. Create Hotspot Profiles (one per package)

```
/ip hotspot user profile add name=wifi-3h rate-limit=5M/5M shared-users=1 keepalive-timeout=5m
/ip hotspot user profile add name=wifi-12h rate-limit=5M/5M shared-users=1 keepalive-timeout=5m
/ip hotspot user profile add name=wifi-24h rate-limit=5M/5M shared-users=1 keepalive-timeout=5m
/ip hotspot user profile add name=wifi-2d rate-limit=5M/5M shared-users=2 keepalive-timeout=5m
/ip hotspot user profile add name=wifi-1w rate-limit=10M/10M shared-users=2 keepalive-timeout=5m
/ip hotspot user profile add name=wifi-1m rate-limit=10M/10M shared-users=3 keepalive-timeout=5m
```

> 💡 `rate-limit` = upload/download speed. `5M/5M` = 5Mbps each. Adjust based on your Safaricom plan.

### 4C. Add Walled Garden (allow billing page BEFORE login)

```
# Allow your Vercel billing app
/ip hotspot walled-garden ip add dst-host=*.vercel.app action=accept
/ip hotspot walled-garden ip add dst-host=*.supabase.co action=accept
/ip hotspot walled-garden ip add dst-host=*.jengahq.io action=accept
/ip hotspot walled-garden ip add dst-host=*.jengaapi.io action=accept

# Allow DNS
/ip hotspot walled-garden ip add dst-host=8.8.8.8 action=accept
/ip hotspot walled-garden ip add dst-host=8.8.4.4 action=accept
```

### 4D. Set Captive Portal Redirect to Your Billing Page

First, deploy your app to Vercel (Phase 5), then come back and set this URL.

For now, note the command — you'll replace `YOUR-APP.vercel.app` later:

```
# Upload custom login.html to MikroTik
```

**In Winbox:**
1. Go to **Files** → Open the `hotspot` folder
2. Find `login.html` — right-click → **Edit** or download it
3. Replace ALL contents with:

```html
<!DOCTYPE html>
<html>
<head>
<meta http-equiv="refresh" content="0;url=https://YOUR-APP.vercel.app/?mac=$(mac)&ip=$(ip)&dst=$(link-orig)">
<title>Redirecting...</title>
</head>
<body style="background:#030816;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh">
<p>Connecting to AlphaBN WiFi...</p>
</body>
</html>
```

4. Upload it back to MikroTik `hotspot/login.html`

---

## PHASE 5: Deploy Billing App to Vercel

### 5A. Push to GitHub

Open terminal on your computer:

```bash
cd "d:\Res Pos\AlphaPlusApp\WifiBilling"
git init
git add .
git commit -m "AlphaBN WiFi Billing System"
```

Create a repo on GitHub (https://github.com/new):
- Name: `alphabn-wifi-billing`
- Private: Yes

```bash
git remote add origin https://github.com/YOUR-USERNAME/alphabn-wifi-billing.git
git branch -M main
git push -u origin main
```

### 5B. Deploy on Vercel

1. Go to https://vercel.com → Sign in with GitHub
2. Click **"Add New Project"**
3. Import your `alphabn-wifi-billing` repo
4. Framework: **Next.js** (auto-detected)
5. **Environment Variables** — Add these:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://enlqpifpxuecxxozyiak.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (copy from your .env.local) |
| `NEXT_PUBLIC_BUSINESS_NAME` | `AlphaBN` |
| `NEXT_PUBLIC_BUSINESS_PHONE` | `0720316175` |
| `MIKROTIK_HOST` | Your public IP or local IP |
| `MIKROTIK_PORT` | `443` |
| `MIKROTIK_USERNAME` | `wifiapi` |
| `MIKROTIK_PASSWORD` | `AlphaBN2026!` |
| `JENGA_API_KEY` | (from Phase 7) |
| `JENGA_MERCHANT_CODE` | (from Phase 7) |
| `JENGA_CONSUMER_SECRET` | (from Phase 7) |
| `JENGA_API_URL` | `https://uat.jengahq.io` |

6. Click **Deploy**
7. Note your URL: `https://alphabn-wifi-billing.vercel.app` (or similar)

### 5C. Update MikroTik Redirect

Now go back to MikroTik and update the `login.html` with your real Vercel URL:

Replace `YOUR-APP.vercel.app` with your actual Vercel domain.

---

## PHASE 6: Set Up Supabase Tables

1. Go to https://supabase.com/dashboard
2. Open your project (`enlqpifpxuecxxozyiak`)
3. Click **SQL Editor** (left sidebar)
4. Copy ALL contents from `d:\Res Pos\AlphaPlusApp\WifiBilling\wifi_schema.sql`
5. Paste into the SQL editor
6. Click **Run**
7. Verify: Go to **Table Editor** → You should see:
   - `wifi_packages` (6 default packages)
   - `wifi_payments`
   - `wifi_vouchers`
   - `wifi_sessions`
   - `wifi_settings`
   - `wifi_admins` (default: admin/admin123)

---

## PHASE 7: Create JengaHQ Live Account

### 7A. Register

1. Go to **https://jengahq.io**
2. Click **"Get Started"** or **"Sign Up"**
3. Fill in:
   - Business Name: **AlphaBN**
   - Email: your email
   - Phone: **0720316175**
   - Country: **Kenya**
4. Verify email and phone

### 7B. Create Merchant App

1. Login to JengaHQ dashboard
2. Go to **"My Apps"** → **"Create New App"**
3. App Name: `AlphaBN WiFi`
4. Description: `WiFi hotspot billing`
5. After creation, copy these:
   - **API Key** → `JENGA_API_KEY`
   - **Merchant Code** → `JENGA_MERCHANT_CODE`

### 7C. Get Consumer Secret

1. In your app settings → find **"Consumer Secret"**
2. Copy → `JENGA_CONSUMER_SECRET`

### 7D. Generate RSA Key Pair

Open PowerShell on your computer:

```powershell
cd "d:\Res Pos\AlphaPlusApp\WifiBilling"
# If you have OpenSSL installed:
openssl genrsa -out jenga-private-key.pem 2048
openssl rsa -in jenga-private-key.pem -pubout -out jenga-public-key.pem
```

If OpenSSL is not installed, use Git Bash (comes with Git):
```bash
openssl genrsa -out jenga-private-key.pem 2048
openssl rsa -in jenga-private-key.pem -pubout -out jenga-public-key.pem
```

### 7E. Upload Public Key

1. Go to JengaHQ → Your App → **"API Keys"**
2. Upload `jenga-public-key.pem`

### 7F. Subscribe to Services

In JengaHQ dashboard:
1. Go to **"Services"** or **"Subscriptions"**
2. Enable:
   - ✅ **Receive Money — Mobile**
   - ✅ **Payment Notifications (IPN)**

### 7G. Set IPN Callback URL

1. Go to **"IPN Settings"** or **"Webhooks"**
2. Set URL: `https://YOUR-APP.vercel.app/api/jenga/callback`

### 7H. Update Vercel Environment Variables

1. Go to Vercel → Your project → **Settings → Environment Variables**
2. Add/update:
   - `JENGA_API_KEY` = your API key
   - `JENGA_MERCHANT_CODE` = your merchant code
   - `JENGA_CONSUMER_SECRET` = your consumer secret
   - `JENGA_API_URL` = `https://uat.jengahq.io` (sandbox first!)
3. Click **Redeploy** to apply changes

### 7I. Test in Sandbox

1. Connect to your WiFi → should see billing page
2. Click BUY on a package → enter phone → payment should process in test mode
3. Check Supabase → `wifi_payments` table should have a record

### 7J. Go Live!

Once testing works:
1. Apply for **production access** in JengaHQ (may need KYC docs)
2. Once approved, update Vercel env var:
   - `JENGA_API_URL` = `https://api.jengahq.io`
3. Redeploy on Vercel

---

## ✅ Final Checklist

| Step | Status |
|---|---|
| Safaricom → MikroTik ether1 cable | ☐ |
| MikroTik → Tenda AC1200 cable (AP mode) | ☐ |
| MikroTik upgraded to RouterOS v7 | ☐ |
| Bridge + DHCP configured | ☐ |
| WiFi set to open (no password) | ☐ |
| REST API enabled (www-ssl) | ☐ |
| Hotspot configured on bridge | ☐ |
| Hotspot profiles created (6 packages) | ☐ |
| Walled garden entries added | ☐ |
| Billing app deployed to Vercel | ☐ |
| Supabase tables created (wifi_schema.sql) | ☐ |
| MikroTik login.html redirects to Vercel URL | ☐ |
| JengaHQ account created | ☐ |
| JengaHQ API keys in Vercel env vars | ☐ |
| IPN callback URL set in JengaHQ | ☐ |
| Test payment working in sandbox | ☐ |
| Go live with production Jenga URL | ☐ |

---

**🎉 Once all boxes are checked, your WiFi billing is LIVE!**
Users connect → see billing page → pay via phone → get voucher → internet access!
