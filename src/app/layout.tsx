import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HATS Publicity Hub",
  description: "Publicity tasks, posts and QR tracking for HATS Panto 2027",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0b6b4d" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={geist.variable}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
