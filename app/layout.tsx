
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: {
    default: "CVISION | Nền tảng tuyển dụng thông minh",
    template: "%s | CVISION",
  },
  description:
    "CVISION - Nền tảng kết nối ứng viên và doanh nghiệp, ứng dụng trí tuệ nhân tạo AI trong tuyển dụng và phân tích hồ sơ.",
  applicationName: "CVISION",
  keywords: [
    "CVISION",
    "tuyển dụng",
    "việc làm",
    "AI tuyển dụng",
    "phân tích CV",
    "ứng viên",
    "doanh nghiệp",
  ],
  authors: [{ name: "CVISION" }],
  icons: {
    icon: "/logo-cvision.png",
    shortcut: "/logo-cvision.png",
    apple: "/logo-cvision.png",
  },
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
