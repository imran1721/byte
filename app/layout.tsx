import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import Splash from "@/components/Splash";
import ServiceWorker from "@/components/ServiceWorker";
import ClarityAnalytics from "@/components/ClarityAnalytics";

// Geometric, techie display sans — modern and a bit playful.
const font = Space_Grotesk({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "byte — Tech in bite-size",
  description:
    "Tech in bite-size — a vertical feed of new tools, libraries, and projects trending across Hacker News, GitHub, Product Hunt, and more.",
  appleWebApp: { capable: true, title: "byte", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply the saved (or system) theme before paint to avoid a flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('byte:theme');if(t==='light'||(!t&&matchMedia('(prefers-color-scheme: light)').matches))document.documentElement.classList.add('light')}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${font.className} antialiased`}>
        <ClarityAnalytics />
        <ServiceWorker />
        <Splash />
        {children}
      </body>
    </html>
  );
}
