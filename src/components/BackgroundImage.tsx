import ImageFixed from "next/image"
import unsplash from "@/public/john-fowler-RsRTIofe0HE-unsplash.jpg"

export default function BackgroundImage() {
  return (
    <div className="fixed inset-0 z-0 h-full w-full">
      <ImageFixed
        src={unsplash}
        alt="White sand backdrop by John Fowler on Unsplash"
        placeholder="blur"
        className="object-cover"
        fill
      />
      <div className="absolute inset-0 z-0 h-full w-full opacity-0 backdrop-brightness-50 backdrop-filter transition-all duration-500 dark:bg-[rgba(0,0,0,0.3)] dark:opacity-100"></div>
    </div>
  )
}
