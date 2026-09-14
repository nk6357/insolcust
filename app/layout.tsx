import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "INSOL — подбор AI‑разработчиков для бизнеса",
  description: "Опишите бизнес‑задачу и получите подборку AI‑разработчиков и интеграторов с подходящим опытом.",
  icons: {
    icon: [
      { url: "/favicon.ico?v=3", sizes: "64x64", type: "image/x-icon" },
      { url: "/favicon.svg?v=3", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico?v=3",
    apple: [{ url: "/apple-touch-icon.png?v=3", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "INSOL — подбор AI‑разработчиков для бизнеса",
    description: "Опишите бизнес‑задачу и получите подборку AI‑разработчиков и интеграторов с подходящим опытом.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "INSOL — подбор AI‑разработчиков для бизнеса",
    description: "Опишите бизнес‑задачу и получите подборку AI‑разработчиков и интеграторов с подходящим опытом.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
