# MikroTik Hotspot Setup Guide

## Prerequisites

- MikroTik router running **RouterOS v7.1+** (for REST API)
- Access to MikroTik admin (Winbox or WebFig)
- Your WiFi billing app deployed (Vercel) or running locally

## Step 1: Enable REST API on MikroTik

### Via Winbox/Terminal:
```
/ip service enable www-ssl
/ip service set www-ssl port=443
```

Or for HTTP (less secure):
```
/ip service enable www
/ip service set www port=80
```

### Create API User (recommended - separate from main admin):
```
/user add name=wifiapi password=your-secure-password group=full
```

## Step 2: Configure Hotspot

### Create Hotspot Server:
```
/ip hotspot setup
```
Follow the wizard to set up on your WiFi interface.

### Create User Profiles for Each Package:
```
/ip hotspot user profile add name=wifi-3h rate-limit=5M/5M shared-users=1
/ip hotspot user profile add name=wifi-12h rate-limit=5M/5M shared-users=1
/ip hotspot user profile add name=wifi-24h rate-limit=5M/5M shared-users=1
/ip hotspot user profile add name=wifi-2d rate-limit=5M/5M shared-users=1
/ip hotspot user profile add name=wifi-1w rate-limit=10M/10M shared-users=2
/ip hotspot user profile add name=wifi-1m rate-limit=10M/10M shared-users=3
```

> **Adjust `rate-limit`** (upload/download speeds) as needed.
> Format: `upload/download` e.g., `2M/5M` = 2Mbps up, 5Mbps down

## Step 3: Set Captive Portal Redirect

Configure MikroTik to redirect users to your billing page:

### Option A: Direct Redirect (Recommended)
```
/ip hotspot profile set default login-by=http-chap,http-pap
/ip hotspot profile set default html-directory=hotspot
/ip hotspot profile set default http-proxy=0.0.0.0:0
```

Edit the hotspot `login.html` file to redirect:
```html
<html>
<head>
  <meta http-equiv="refresh" content="0;url=https://your-app.vercel.app/?mac=$(mac)&ip=$(ip)&dst=$(link-orig)">
</head>
<body>Redirecting to billing page...</body>
</html>
```

Upload this file to MikroTik at `/hotspot/login.html`

### Option B: Walled Garden
Add your billing domain to the walled garden so users can access it before login:

```
/ip hotspot walled-garden ip add dst-host=your-app.vercel.app action=accept
/ip hotspot walled-garden ip add dst-host=*.vercel.app action=accept
/ip hotspot walled-garden ip add dst-host=enlqpifpxuecxxozyiak.supabase.co action=accept
/ip hotspot walled-garden ip add dst-host=*.supabase.co action=accept
```

Also allow Jenga API for payment processing:
```
/ip hotspot walled-garden ip add dst-host=*.jengahq.io action=accept
/ip hotspot walled-garden ip add dst-host=*.jengaapi.io action=accept
```

## Step 4: Update .env.local

```env
MIKROTIK_HOST=192.168.88.1    # Your router's IP
MIKROTIK_PORT=443              # 443 for HTTPS, 80 for HTTP
MIKROTIK_USERNAME=wifiapi      # API user created in Step 1
MIKROTIK_PASSWORD=your-secure-password
MIKROTIK_USE_SSL=true          # true for HTTPS
```

## Step 5: Test the Integration

1. Start the billing app: `npm run dev`
2. Go to Admin → Settings → Click "Test Connection"
3. If successful, you'll see the number of active users

### Test User Creation:
```bash
# Via your app's API
curl -X POST http://localhost:3003/api/mikrotik/create-user \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123","profile":"wifi-3h","durationHours":3}'
```

### Verify on MikroTik:
```
/ip hotspot user print
```

## Step 6: DNS & Captive Portal Detection

For the captive portal popup to appear on devices:

```
/ip hotspot profile set default dns-name=wifi.alphabn.co.ke
```

Devices will automatically detect the captive portal and show a popup/notification.

## How It Works - Full Flow

```
1. User connects to WiFi → Gets IP but NO internet
2. User opens browser → MikroTik redirects to your billing page
3. User selects package → Pays via phone (Jenga API)
4. Payment confirmed → Server creates MikroTik hotspot user
5. User enters voucher code → Server authenticates with MikroTik
6. User gets internet access for the purchased duration
7. When time expires → MikroTik auto-disconnects the user
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| REST API not responding | Check if `www-ssl` service is enabled |
| Can't create users | Verify API user has `full` group permissions |
| Users not disconnecting | Check `limit-uptime` is set on hotspot user |
| Portal not redirecting | Verify walled garden entries |
| SSL certificate errors | MikroTik uses self-signed certs - this is handled in the code |

## MikroTik Model Recommendations

| Users | Recommended Model |
|-------|------------------|
| Up to 50 | hAP ac² (RBD52G-5HacD2HnD) |
| Up to 100 | hAP ax³ or RB4011 |
| Up to 200+ | CCR1009 or CCR2004 |
