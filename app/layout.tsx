import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Toaster } from "sonner";
import { Sidebar } from "@/components/sidebar";
import { MobileTopBar } from "@/components/mobile-top-bar";

export const metadata: Metadata = {
  title: "Sheet Admin — Tour Products",
  description: "Admin panel for managing tour product data",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <MobileTopBar />
        <div className="flex h-screen overflow-hidden md:h-screen">
          <div className="hidden md:flex">
            <Sidebar />
          </div>
          <main className="flex-1 overflow-auto bg-background">
            {children}
          </main>
        </div>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
