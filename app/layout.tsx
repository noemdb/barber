import type { Metadata } from "next";
import Script from "next/script";
import { Manrope, Oswald } from "next/font/google";
import { prisma } from "@/lib/prisma";
import { ThemeProvider } from "@/components/theme/theme-provider";
import AppToaster from "@/components/theme/app-toaster";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-oswald",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await prisma.businessSettings.findFirst();
  return {
    title: settings?.businessName ?? "BarberService",
    description: "Gestión integral de barbería",
    icons: {
      icon: settings?.faviconUrl || "/icon.svg",
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      data-scroll-behavior="smooth"
      className={`${manrope.variable} ${oswald.variable}`}
      suppressHydrationWarning
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  try {
    var theme = window.localStorage.getItem("theme");
    if (!theme) {
      theme = "dark";
    }
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (e) {}
})();
`,
          }}
        />
        <ThemeProvider>
          {children}
          <AppToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}