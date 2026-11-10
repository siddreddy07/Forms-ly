"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon } from "lucide-react"

import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-[1.1rem]" />
        ),
        info: (
          <InfoIcon className="size-[1.1rem]" />
        ),
        warning: (
          <TriangleAlertIcon className="size-[1.1rem]" />
        ),
        error: (
          <OctagonXIcon className="size-[1.1rem]" />
        ),
        loading: (
          <LoaderCircle animate size={18} className="size-[1.1rem]" />
        ),
      }}
      style={
        {
          "--normal-bg": "transparent",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "transparent",
          "--border-radius": "1.5rem",
          "--width": "min(23rem, calc(100vw - 2rem))",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
