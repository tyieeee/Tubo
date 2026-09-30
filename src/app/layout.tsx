import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tubo - E-Invoicing Platform",
  description: "Business e-invoicing platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
