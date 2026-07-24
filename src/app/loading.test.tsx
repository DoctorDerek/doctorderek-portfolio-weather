import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import Loading from "@/src/app/loading"

describe("Loading", () => {
  it("renders a clear forecast loading status", () => {
    render(<Loading />)

    expect(screen.getByRole("heading", { name: "Preparing your forecast" })).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent(
      "Fetching current weather...",
    )
  })
})
