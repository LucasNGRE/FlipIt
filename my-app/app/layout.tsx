// "use client"
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "next-auth/react"; // Importer SessionProvider
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Head from "next/head";
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="flex flex-col min-h-screen">
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Toaster />
            <Header />
            {/* Le main occupe l'espace restant entre le header et le footer */}
            <main className="flex-grow bg-background">
              {children}
            </main>
            {/* Footer reste en bas */}
            <Footer />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
