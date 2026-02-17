import type { Metadata } from "next";
import { PT_Sans_Narrow } from "next/font/google";
import "./globals.css";

const ptSansNarrow = PT_Sans_Narrow({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "700"],
});
export const metadata: Metadata = {
  title: "Compot",
  description: "Коммерческие предложения",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body
        className={`${ptSansNarrow.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
