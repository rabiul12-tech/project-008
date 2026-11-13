import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, DM_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'ESTAVIA — Property & Real Estate Management SaaS',
  description:
    'Every Property. Perfectly Managed. Enterprise-grade browser-local property, unit, tenant, lease, rent collection, and maintenance management platform.',
  openGraph: {
    title: 'ESTAVIA — Property & Real Estate Management SaaS',
    description:
      'Every Property. Perfectly Managed. Enterprise-grade browser-local property, unit, tenant, lease, rent collection, and maintenance management platform.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ESTAVIA — Property & Real Estate Management SaaS',
    description:
      'Every Property. Perfectly Managed. Enterprise-grade browser-local property, unit, tenant, lease, rent collection, and maintenance management platform.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body
        className="font-sans antialiased selection:bg-[#146C63] selection:text-white"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
