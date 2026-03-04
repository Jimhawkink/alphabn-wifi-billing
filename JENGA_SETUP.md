# Equity Bank Jenga API Setup Guide

## Step 1: Create a JengaHQ Account

1. Go to [https://jengahq.io](https://jengahq.io)
2. Click **"Sign Up"** or **"Get Started"**
3. Fill in your details:
   - Business Name: **AlphaBN**
   - Business Type: Select appropriate
   - Country: **Kenya**
   - Email and Phone
4. Verify your email and phone number

## Step 2: Create a Merchant App

1. Log into [JengaHQ Dashboard](https://jengahq.io)
2. Go to **"My Apps"** → **"Create New App"**
3. Name: `AlphaBN WiFi Billing`
4. Description: `WiFi hotspot billing and payment collection`
5. After creation, you'll get:
   - **API Key** (copy this → `JENGA_API_KEY` in .env.local)
   - **Merchant Code** (copy this → `JENGA_MERCHANT_CODE`)

## Step 3: Get Consumer Secret

1. In your app settings, find **"Consumer Secret"**
2. Copy it → `JENGA_CONSUMER_SECRET` in .env.local

## Step 4: Generate OpenSSL Key Pair

Jenga requires RSA keys for signing certain API requests.

### On Windows (using PowerShell or Git Bash):
```bash
# Generate private key
openssl genrsa -out jenga-private-key.pem 2048

# Extract public key
openssl rsa -in jenga-private-key.pem -pubout -out jenga-public-key.pem
```

### Upload Public Key:
1. Go to JengaHQ → **Your App** → **API Keys**
2. Upload `jenga-public-key.pem`
3. Place `jenga-private-key.pem` in the WifiBilling root directory

## Step 5: Subscribe to Services

In JengaHQ dashboard:
1. Go to **"Subscriptions"** or **"Services"**
2. Enable these services:
   - ✅ **Receive Money - Mobile** (for STK push payments)
   - ✅ **Receive Money - EazzyPay** (for card payments if needed)
   - ✅ **Payment Notifications** (for IPN callbacks)

## Step 6: Configure IPN (Instant Payment Notification)

1. Go to **"IPN Settings"** or **"Webhooks"**
2. Set Callback URL to: `https://your-vercel-domain.vercel.app/api/jenga/callback`
3. For local testing: Use [ngrok](https://ngrok.com/) to expose localhost
   ```bash
   ngrok http 3003
   # Then use the ngrok URL: https://xxxxx.ngrok.io/api/jenga/callback
   ```

## Step 7: Update .env.local

```env
JENGA_API_KEY=copy-from-jengahq
JENGA_MERCHANT_CODE=copy-from-jengahq
JENGA_CONSUMER_SECRET=copy-from-jengahq
JENGA_API_URL=https://uat.jengahq.io    # Sandbox for testing
JENGA_PRIVATE_KEY_PATH=./jenga-private-key.pem
```

## Step 8: Test in Sandbox

1. Keep `JENGA_API_URL=https://uat.jengahq.io` (sandbox)
2. Use test phone numbers provided by Jenga
3. Verify payments appear in Supabase `wifi_payments` table
4. Verify vouchers are generated in `wifi_vouchers` table

## Step 9: Go Live

1. Apply for production access in JengaHQ
2. Once approved, change: `JENGA_API_URL=https://api.jengahq.io`
3. Update callback URL to your production Vercel domain
4. Update MikroTik to point to production URL

## How Payment Flow Works

```
Customer → Clicks BUY → Enters Phone → 
  Our Server → Jenga API (STK Push) →
    Customer's Phone (M-Pesa/Airtel/Equitel prompt) →
      Customer approves →
        Jenga IPN → Our Callback →
          Save payment → Generate voucher → Create MikroTik user →
            Customer sees voucher code → Connects to WiFi
```

## Supported Payment Methods via Jenga

| Method | How it Works |
|--------|-------------|
| M-Pesa | STK push sent to customer phone |
| Airtel Money | STK push sent to Airtel phone |
| Equitel | Payment prompt sent to Equitel line |
| Card | Redirect to payment page (optional) |

## Important Notes

- **Sandbox mode** is active by default. No real money is charged.
- **Live mode** requires Equity Bank approval and KYC documents.
- Keep your **private key secure** - never expose it to the client/frontend.
- The consumer secret and API key should only be in `.env.local` (server-side).
