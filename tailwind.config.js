/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                dark: {
                    bg: '#0a0f1a',
                    card: '#111827',
                    surface: '#1a2332',
                    border: '#2a3a4a',
                    hover: '#1e2d3d',
                },
                accent: {
                    emerald: '#10b981',
                    teal: '#14b8a6',
                    cyan: '#06b6d4',
                    blue: '#3b82f6',
                    purple: '#8b5cf6',
                    green: '#22c55e',
                    orange: '#f97316',
                    red: '#ef4444',
                },
                wifi: {
                    primary: '#10b981',
                    secondary: '#06b6d4',
                    gold: '#f59e0b',
                },
            },
            backgroundImage: {
                'gradient-wifi': 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                'gradient-package': 'linear-gradient(90deg, #10b981 0%, #22c55e 50%, #a3e635 100%)',
                'gradient-dark': 'linear-gradient(180deg, #0a0f1a 0%, #111827 100%)',
                'glass': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
            },
            boxShadow: {
                'glow-emerald': '0 0 20px rgba(16, 185, 129, 0.4)',
                'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.4)',
                'glass': '0 8px 32px rgba(0, 0, 0, 0.4)',
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'float': 'float 6s ease-in-out infinite',
                'shimmer': 'shimmer 2s linear infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-5px)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
            },
        },
    },
    plugins: [],
};
