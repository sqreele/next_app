import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/theme-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { Toaster } from "sonner";
import { SimpleNavigation } from "@/components/SimpleNavigation";
import ErrorBoundary from "@/components/error/error-boundary";
import NetworkStatus from "@/components/common/network-status";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PMCS - Plant Maintenance Control System",
  description: "Plant Maintenance Control System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-white flex flex-col`}
      >
        <ErrorBoundary
          onError={(error, errorInfo) => {
            // Log to external error tracking service
            console.error('Application Error:', error, errorInfo)
            // You can add error reporting here (e.g., Sentry, LogRocket)
          }}
        >
          <ThemeProvider>
            <AuthProvider>
              <SimpleNavigation />
              <NetworkStatus />
              <main className="flex-1 overflow-auto">
                {children}
              </main>
              <Toaster />
            </AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
