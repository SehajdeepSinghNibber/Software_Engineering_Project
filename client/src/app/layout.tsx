import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { SessionProvider } from "@/components/providers/SessionProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Display serif for headlines — confident, editorial, premium. */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: {
    default: "ClearLens — Image De-hazing Platform",
    template: "%s · ClearLens",
  },
  description:
    "Restore visibility in hazy imagery with Dehamer, AOD-Net and Light-DehazeNet, served through a production PyTorch inference pipeline.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="clearlens"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-dvh flex-col bg-base-100 font-sans text-base-content">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
