import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sileo";

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
      <body className="antialiased">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            className: 'dark-toast',
            style: {
              background: '#000',
              color: '#9ca3af',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              marginTop: '80px',
              border: '1px solid #333',
            },
          }}
        />
      </body>
    </html>
  );
}
