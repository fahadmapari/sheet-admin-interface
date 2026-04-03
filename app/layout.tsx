import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SessionProvider } from "@/components/providers/session-provider";

export const metadata: Metadata = {
  title: "Sheet Admin — Tour Products",
  description: "Admin panel for managing tour product data",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} h-screen overflow-hidden antialiased`}>
        <SessionProvider>
          <ThemeProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                classNames: {
                  toast:
                    "border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--text-primary))] shadow-md",
                  description: "text-[hsl(var(--text-secondary))]",
                  actionButton:
                    "bg-[hsl(var(--text-primary))] text-[hsl(var(--background))]",
                  cancelButton:
                    "border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--text-primary))]",
                },
              }}
            />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
