import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import RootLayout, { metadata, viewport } from "@/src/app/layout"

const robotoMock = vi.hoisted(() =>
  vi.fn(() => ({ variable: "--font-roboto-test" })),
)

vi.mock("next/font/google", () => ({ Roboto: robotoMock }))

vi.mock("@/src/components/ThemeProvider", () => ({
  default: ({ children }: { children: ReactNode }) => (
    <div data-theme-provider="">{children}</div>
  ),
}))

describe("RootLayout", () => {
  it("owns the public weather portfolio metadata", () => {
    expect(robotoMock).toHaveBeenCalledWith({
      weight: ["300", "400", "500", "700"],
      style: ["normal"],
      subsets: ["latin"],
      display: "swap",
      variable: "--font-roboto",
    })
    expect(viewport).toEqual({ themeColor: "#FFFFFF" })
    expect(metadata).toMatchObject({
      title: "Weather Portfolio | Dr. Derek Austin",
      description:
        "An accessible weather search built with Next.js, React, TypeScript, and a server-only OpenWeatherMap integration.",
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
    })
  })

  it("renders an English document shell around application content", () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <main>Weather application</main>
      </RootLayout>,
    )
    const document = new DOMParser().parseFromString(markup, "text/html")

    expect(document.documentElement).toHaveAttribute("lang", "en")
    expect(document.documentElement).toHaveClass(
      "h-full",
      "w-full",
      "--font-roboto-test",
    )
    expect(document.body).toHaveClass(
      "h-full",
      "w-full",
      "subpixel-antialiased",
    )
    expect(document.querySelector("noscript")).toHaveTextContent(
      "You need to enable JavaScript to run this app.",
    )
    expect(document.querySelector("[data-theme-provider]")).toHaveTextContent(
      "Weather application",
    )
  })
})
