import { ChartNoAxesColumnIcon, FileUpIcon, LayoutGridIcon, Link2Icon, ListChecksIcon, PaletteIcon } from "lucide-react"

import { Pill } from "@/components/marketing/pill"
import { blockRegistry } from "@/lib/schema"

/* Only things the product does today, each as one short line. */
const blockCount = Object.keys(blockRegistry).length

const features = [
  { Icon: LayoutGridIcon, title: `${blockCount} block types`, line: "Drag them into place." },
  { Icon: ListChecksIcon, title: "Steps and logic", line: "Show a question only when it applies." },
  { Icon: PaletteIcon, title: "Your client's look", line: "Colour, font, corners, thank-you page." },
  { Icon: Link2Icon, title: "Public or private", line: "Private forms open with a 4 digit code." },
  { Icon: FileUpIcon, title: "Files up to 3 MB", line: "Kept in storage you control." },
  { Icon: ChartNoAxesColumnIcon, title: "Drop-off analytics", line: "See which question loses people." },
] as const

function ProductSection() {
  return (
    <section id="product" className="scroll-mt-24 px-4 py-12 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto grid max-w-2xl justify-items-center gap-4 text-center">
          <Pill>What you get</Pill>
          <h2 className="marketing-serif text-4xl sm:text-6xl">Everything a form needs, nothing it doesn&apos;t</h2>
        </div>

        <ul className="mt-8 grid grid-cols-2 gap-2.5 sm:mt-12 sm:gap-4 lg:grid-cols-3">
          {features.map(({ Icon, title, line }) => (
            <li key={title} className="group grid content-start gap-3 rounded-[1.25rem] bg-muted/50 p-4 transition-colors hover:bg-muted sm:gap-4 sm:rounded-[1.5rem] sm:p-6">
              <span className="flex size-10 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--warm)_26%,transparent)] text-foreground sm:size-11">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div className="grid gap-0.5">
                <h3 className="font-display text-base font-medium tracking-tight sm:text-xl">{title}</h3>
                <p className="text-sm text-muted-foreground">{line}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export { ProductSection }
