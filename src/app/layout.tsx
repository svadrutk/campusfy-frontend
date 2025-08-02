import "./globals.css";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { Providers } from "./providers";
import { ThemeStyles } from "@/components/ui";
import { ClientComponentWrapper, CacheLoadingOverlayWrapper } from "@/components/common";
import { Header } from "@/components/layout";
import { Analytics } from "@vercel/analytics/react"
import { cn } from "@/lib/utils";
import { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { getSchoolFromHostname } from '@/config/themes';

// Load Inter font from Google Fonts
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Load New Spirit fonts locally
const newSpiritMedium = localFont({
  src: "../../public/fonts/NewSpiritMedium.otf",
  variable: "--font-new-spirit-medium",
  display: "swap",
  preload: true,
  fallback: ["Arial", "Helvetica", "sans-serif"],
});

const newSpiritMediumCondensed = localFont({
  src: "../../public/fonts/NewSpiritMediumCondensed.otf",
  variable: "--font-new-spirit-medium-condensed",
  display: "swap",
  preload: true,
  fallback: ["Arial", "Helvetica", "sans-serif"],
});

export const viewport: Viewport = {
  themeColor: '#DC2626',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const hostname = headersList.get('host') || '';
  const school = getSchoolFromHostname(hostname);
  
  return {
    title: {
      template: '%s | Campusfy',
      default: 'Campusfy - Your Campus Course Guide',
    },
    description: `Find and review courses at ${school.name}. Get detailed information about classes, including grade distributions, prerequisites, and student reviews.`,
    icons: {
      icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
      shortcut: ['/favicon.svg'],
      apple: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    },
    manifest: '/manifest.json',
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn(
      inter.variable,
      newSpiritMedium.variable,
      newSpiritMediumCondensed.variable,
      "scroll-smooth"
    )}>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="font-sans min-h-full flex flex-col">
        <Providers>
          <ThemeStyles />
          <ClientComponentWrapper>
            <Header />
          </ClientComponentWrapper>
          <div className="flex-1 flex flex-col">
            {children}
          </div>
          <CacheLoadingOverlayWrapper />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
