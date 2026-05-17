import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Money — UK personal finance dashboard",
  description:
    "Self-hosted UK personal finance dashboard with budgeting, forecasting, and credit-card balance-transfer optimisation.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Money",
  },
};

export const viewport: Viewport = {
  themeColor: "#0ea5e9",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/accounts", label: "Accounts" },
  { href: "/transactions", label: "Transactions" },
  { href: "/budget", label: "Budget" },
  { href: "/recurring", label: "Recurring" },
  { href: "/scheduled", label: "Scheduled" },
  { href: "/goals", label: "Goals" },
  { href: "/forecast", label: "Forecast" },
  { href: "/credit-cards", label: "Credit cards" },
  { href: "/mortgage", label: "Mortgage" },
  { href: "/settings", label: "Settings" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-(--color-border) bg-(--color-card) sticky top-0 z-10 backdrop-blur">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6">
            <Link href="/" className="font-semibold tracking-tight">
              £ Money
            </Link>
            <nav className="flex gap-1 overflow-x-auto -mx-1 px-1 flex-1 text-sm">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-1.5 rounded-md hover:bg-(--color-muted) whitespace-nowrap text-(--color-muted-foreground) hover:text-(--color-foreground) transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:py-8">
          {children}
        </main>
        <footer className="border-t border-(--color-border) py-4 text-center text-xs text-(--color-muted-foreground)">
          Self-hosted finance dashboard · all data on your machine
        </footer>
      </body>
    </html>
  );
}
