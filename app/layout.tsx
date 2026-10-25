import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WhatsApp Bot Command Center & Supabase Dashboard",
  description: "Real-time monitoring, message feeds, and contact synchronization for your Baileys WhatsApp bot.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column" }}>
          {children}
        </div>
      </body>
    </html>
  );
}
