import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rebuilder - Website to APK Builder',
  description: 'Konversi website atau file HTML menjadi APK Android dengan mudah. Oleh RianModss.',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='22' fill='%23141414'/><text y='.9em' font-size='70' x='15' fill='white' font-family='Inter,sans-serif' font-weight='800'>R</text></svg>",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ visibility: 'visible' }}>{children}</body>
    </html>
  );
}
