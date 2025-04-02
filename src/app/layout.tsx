import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import AuthButton from "@/components/AuthButton";
import { AuthProvider } from "@/context/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Recipe Finder",
  description: "Find meals based on your ingredients!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          {/* ✅ Top navbar */}
          <header className="w-full bg-white shadow-md p-4 flex justify-between items-center object-top">
            <Link href="/" className="text-xl font-bold text-blue-700">
              Recipe Finder
            </Link>
            <AuthButton />
          </header>

          {/* ✅ Main content area */}
          <main className="p-4">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
