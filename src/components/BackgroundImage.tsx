import ImageFixed from "next/image"
import unsplash from "@/public/john-fowler-RsRTIofe0HE-unsplash.jpg"

export default function BackgroundImage() {
  return (
    <div className="fixed inset-0 z-0 w-full h-full">
      {/* background image */}
      <ImageFixed
        src={unsplash}
        alt="White sand backdrop by John Fowler on Unsplash"
        placeholder="blur"
        className="object-cover"
        layout="fill"
      />
      <div className="absolute backdrop-filter backdrop-brightness-50 opacity-0 dark:opacity-100 transition-all duration-500 dark:bg-[rgba(0,0,0,0.3)] inset-0 z-0 w-full h-full">
        {/* dark mode filter for background image */}
      </div>
    </div>
  )
}
