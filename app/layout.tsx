import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Haven — Your property inbox",
  description:
    "A little more clarity. A lot less back and forth. Tenant communication, together in one place.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
