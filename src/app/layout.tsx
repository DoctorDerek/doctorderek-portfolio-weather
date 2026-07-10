import "@/src/css/tailwind.css"
import { Metadata } from "next"
import { Roboto } from "next/font/google"
import { ReactNode } from "react"
import ThemeProvider from "@/src/components/ThemeProvider"

const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  style: ["normal"],
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Weather App Demo",
  description: "A minimal, offline-first ready weather application.",
  themeColor: "#FFFFFF",
  icons: {
    icon: [
      {
        url: "/favicon-io/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/favicon-io/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
    ],
    apple: "/favicon-io/apple-touch-icon.png",
  },
  manifest: "/favicon-io/site.webmanifest",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`h-full w-full ${roboto.variable}`}
      suppressHydrationWarning
    >
      <head />
      <body className="h-full w-full subpixel-antialiased">
        <noscript>You need to enable JavaScript to run this app.</noscript>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
