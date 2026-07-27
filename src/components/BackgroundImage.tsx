import ImageFixed from "next/image"
import unsplash from "@/public/john-fowler-RsRTIofe0HE-unsplash.jpg"

export default function BackgroundImage() {
  return (
    <div className="fixed inset-0 z-0 h-full w-full">
      <ImageFixed
        src={unsplash}
        alt=""
        placeholder="blur"
        sizes="100vw"
        priority
        className="object-cover"
        fill
      />
      <div className="absolute inset-0 bg-linear-to-b from-white/15 via-transparent to-slate-900/10 dark:from-slate-950/60 dark:via-slate-950/35 dark:to-slate-950/70" />
    </div>
  )
}
