/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // Allow MikroTik router to load this page in captive portal
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    { key: 'X-Frame-Options', value: 'ALLOWALL' },
                    { key: 'Access-Control-Allow-Origin', value: '*' },
                ],
            },
        ];
    },
};

module.exports = nextConfig;
