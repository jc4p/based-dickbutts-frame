import { Geist, Geist_Mono } from "next/font/google";
import { Tomorrow } from "next/font/google";
import { FrameInit } from "@/components/FrameInit";
import Navigation from "@/components/Navigation";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const tomorrow = Tomorrow({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-tomorrow",
});

export const metadata = {
  title: "Mint Frame",
  description: "Frame-enabled NFT minting experience",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${tomorrow.variable}`}>
        <div>
          {children}
          <FrameInit />
        </div>
      </body>
    </html>
  );
}