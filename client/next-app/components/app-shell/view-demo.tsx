"use client"

import * as React from "react"
import { PlayCircleIcon, Volume2Icon, VolumeXIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const DEMO_VIDEO_URL =
  "https://res.cloudinary.com/dtgf2auzt/video/upload/v1794558660/formly-launch-v2_ipo7nz.mp4"

function DemoPlayer() {
  const [muted, setMuted] = React.useState(true)

  return (
    <div className="relative bg-black">
      <video
        src={DEMO_VIDEO_URL}
        autoPlay
        muted={muted}
        loop
        playsInline
        controls
        className="aspect-video max-h-[75svh] w-full"
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setMuted((m) => !m)}
        aria-label={muted ? "Unmute video" : "Mute video"}
        className="absolute top-3 left-3"
      >
        {muted ? <VolumeXIcon /> : <Volume2Icon />}
        {muted ? "Unmute" : "Mute"}
      </Button>
    </div>
  )
}

function ViewDemo({ className }: { className?: string }) {
  const [open, setOpen] = React.useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        aria-label="View demo"
        className={cn(
          "group/demo relative inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 overflow-hidden rounded-full px-3.5 text-[13px] font-semibold whitespace-nowrap text-[oklch(0.22_0.04_50)] outline-none",
          "bg-gradient-to-b from-[oklch(0.9_0.16_90)] via-[oklch(0.8_0.17_70)] to-[oklch(0.7_0.19_48)]",
          "shadow-[inset_0_1px_0_rgb(255_255_255/0.45),0_2px_10px_-2px_oklch(0.75_0.18_60/0.45)]",
          "transition-all duration-300 hover:scale-[1.03] hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.5),0_3px_14px_-2px_oklch(0.75_0.18_60/0.55)] active:scale-[0.98]",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          className
        )}
      >
        {/* Moving sheen, kept inside the button. */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-[oklch(1_0.1_95/0.5)] to-transparent transition-transform duration-700 group-hover/demo:translate-x-[480%]" />
        <PlayCircleIcon className="relative size-4" />
        <span className="relative">View Demo</span>
      </DialogTrigger>
      <DialogContent className="p-0 sm:max-w-4xl">
        <DialogTitle className="sr-only">Product demo</DialogTitle>
        <DialogDescription className="sr-only">
          A short video walkthrough of the product.
        </DialogDescription>
        {/* Mounted only while open so the video stops and resets on close. */}
        {open && <DemoPlayer />}
      </DialogContent>
    </Dialog>
  )
}

export { ViewDemo }
