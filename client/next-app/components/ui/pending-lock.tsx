import { cn } from "@/lib/utils"

/* How long a click waits before it is sent. Quick repeated clicks cannot flood the server, because the controls
   are locked for this whole time. */
export const HOLD_MS = 5000
export const hold = () => new Promise<void>((resolve) => setTimeout(resolve, HOLD_MS))

/* Wraps controls that save to the server. While `pending` is true a half-transparent layer sits over them: clicks
   do not get through and the keyboard cannot reach them. It goes away by itself when `pending` turns false. */
export function PendingLock({
  pending,
  className,
  children,
}: {
  pending: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("relative", className)}>
      <div inert={pending} className={cn("transition-opacity", pending && "opacity-50")}>
        {children}
      </div>
      {pending && (
        <div className="absolute inset-0 z-10 cursor-not-allowed rounded-[inherit] bg-background/60 backdrop-blur-[1px]">
          <span className="sr-only" role="status">
            Saving your change.
          </span>
        </div>
      )}
    </div>
  )
}
