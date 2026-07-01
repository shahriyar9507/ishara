import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const notoBengali = Noto_Sans_Bengali({
  variable: "--font-noto-bengali",
  subsets: ["bengali"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ishara — বাংলা ইশারা ভাষা → টেক্সট ও কণ্ঠ",
  description:
    "Ishara turns Bangla Sign Language into text and voice in real time — on-device recognition, natural Bangla sentences, and speech. Runs on PC, iOS and Android.",
  applicationName: "Ishara",
  appleWebApp: { capable: true, title: "Ishara", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f3ff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0f1e" },
  ],
};

// Runs before paint: resolve theme (system | light | dark) → set data-theme, no flash.
const themeInit = `
(function () {
  try {
    var pref = localStorage.getItem('ishara-theme') || 'system';
    var dark = pref === 'dark' || (pref === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="bn"
      suppressHydrationWarning
      className={`${inter.variable} ${notoBengali.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
