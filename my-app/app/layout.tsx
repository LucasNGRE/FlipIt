import type { Metadata } from "next";
import { Syne, DM_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "next-auth/react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
});

const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "FlipIt — Marketplace du skate d'occasion",
  description: "Achète et vends du matériel de skate entre passionnés.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${dmSans.variable} ${syne.variable} h-full`} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen font-sans antialiased">
        <SessionProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <Header />
            <main className="flex-grow bg-background pt-16">
              {children}
            </main>
            <Footer />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
