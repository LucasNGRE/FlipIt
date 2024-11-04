// "use client"
import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "next-auth/react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FooterBanner from "@/components/FooterBanner";
import { Toaster } from 'sonner';

// Charger les polices Inter et Lora avec l'option `variable`
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const lora = Lora({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-lora" });

export const metadata: Metadata = {
  title: "FlipIt",
  description: "Welcome home!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable} h-full`}>
      <body className="flex flex-col min-h-screen">
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange>
            <Toaster />
            <Header />
              <main className="flex-grow bg-background">
                {children}
              </main>
            <FooterBanner />
            <Footer />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
