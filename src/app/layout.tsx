import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata = {
    title: 'AlphaBN WiFi - High Speed Internet',
    description: 'Purchase WiFi packages and connect to high speed internet. Powered by AlphaBN.',
};

export const viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                <meta name="theme-color" content="#0a0f1a" />
                <link rel="icon" href="/favicon.ico" />
            </head>
            <body>
                {children}
                <Toaster
                    position="top-center"
                    toastOptions={{
                        duration: 4000,
                        style: {
                            background: '#1f2937',
                            color: '#f1f5f9',
                            borderRadius: '12px',
                            border: '1px solid #374151',
                        },
                        success: {
                            iconTheme: {
                                primary: '#10b981',
                                secondary: '#f1f5f9',
                            },
                        },
                        error: {
                            iconTheme: {
                                primary: '#ef4444',
                                secondary: '#f1f5f9',
                            },
                        },
                    }}
                />
            </body>
        </html>
    );
}
