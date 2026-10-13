import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthSessionGuard from "@/components/auth/AuthSessionGuard";
import PersistentTelemedicineCall from "@/components/telemedicine/PersistentTelemedicineCall";
import IncomingTelemedicineCallBanner from "@/components/telemedicine/IncomingTelemedicineCallBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MedxVerse | Hospital Management System",
  description: "Comprehensive Healthcare & Hospital Management System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthSessionGuard />
        {children}
        <PersistentTelemedicineCall />
        <IncomingTelemedicineCallBanner />
      </body>
    </html>
  );
}