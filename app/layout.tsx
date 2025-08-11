import type React from "react"
import type { Metadata } from "next"
import { Montserrat } from "next/font/google"
import "./globals.css"

const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-montserrat",
})

export const metadata: Metadata = {
  title: "v0 App",
  description: "Created with v0",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <style>{`
html {
  font-family: ${montserrat.style.fontFamily};
  --font-sans: ${montserrat.variable};
  --font-mono: ${montserrat.variable};
}
        `}</style>
      </head>
      <body className={`${montserrat.className} antialiased`}>{children}</body>
    </html>
  )
}
