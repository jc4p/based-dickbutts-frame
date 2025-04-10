import { Geist, Geist_Mono } from "next/font/google";
import { FrameInit } from "@/components/FrameInit";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Mint Frame",
  description: "Frame-enabled NFT minting experience",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <div>
          {children}
          <FrameInit />
        </div>
      </body>
    </html>
  );
}