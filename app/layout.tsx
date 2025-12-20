import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "VIC | Discover London's Hidden Stories",
  description: "Talk to VIC, your AI guide to London's hidden history, secret gems, and fascinating stories. Explore 139 articles about London's past and present.",
  keywords: ["London history", "hidden London", "London walks", "London guide", "AI guide", "VIC"],
  authors: [{ name: "VIC - London Guide" }],
  openGraph: {
    type: "website",
    locale: "en_GB",
    title: "VIC | Discover London's Hidden Stories",
    description: "Your AI guide to London's hidden history, secret gems, and fascinating walks.",
    siteName: "VIC London",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  )
}
