import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

export const metadata: Metadata = {
  title: "Sheet Admin — Tour Products",
  description: "Admin panel for managing tour product data",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} h-screen overflow-hidden antialiased`}>
        <ThemeProvider>
          <div className="flex h-screen overflow-hidden bg-background text-foreground">
            <Sidebar />
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <Header />
              <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="mx-auto flex h-full min-h-0 w-full max-w-screen-xl flex-1 flex-col overflow-y-auto px-6 py-6">
                  {children}
                </div>
              </main>
            </div>
          </div>
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
      </body>
    </html>
  );
}
