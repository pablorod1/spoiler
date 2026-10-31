import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CommandPalette } from "@/components/search/command-palette";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Pickflix — Qué ver y dónde verlo", template: "%s · Pickflix" },
  description:
    "Descubre películas y series, mira en qué plataforma están en España y encuentra qué ver esta noche en tus servicios de streaming.",
  applicationName: "Pickflix",
  openGraph: { type: "website", locale: "es_ES", siteName: "Pickflix" },
};

export const viewport: Viewport = {
  themeColor: "#08080b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col font-sans">
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
        <CommandPalette />
      </body>
    </html>
  );
}
