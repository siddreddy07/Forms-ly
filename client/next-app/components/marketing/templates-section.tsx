"use client"

import { Pill } from "@/components/marketing/pill"
import Stack from "@/components/ui/stack"
import { allBlocks, createCafeApplication, createClientIntake, createWebsiteFeedback, isAnswerBlock } from "@/lib/schema"

/* The three templates the New form dialog starts from, as a stack of small cards that turns by itself. Each card
   shows the template's name, what it is for, and a few of its real questions. */
const templates = [
  { label: "Client intake", text: "What to ask before a project starts.", color: "#2563eb", doc: createClientIntake() },
  { label: "Job application", text: "Two steps, with a question that only shows when it applies.", color: "#0d9488", doc: createCafeApplication() },
  { label: "Website feedback", text: "A rating and a few words from your visitors.", color: "#ea580c", doc: createWebsiteFeedback() },
].map((t) => {
  const questions = allBlocks(t.doc).filter((b) => isAnswerBlock(b.type))
  return { ...t, count: questions.length, sample: questions.slice(0, 4).map((b) => b.label) }
})

function TemplateCard({ t }: { t: (typeof templates)[number] }) {
  return (
    <div className="flex h-full flex-col justify-between gap-4 bg-card p-5 text-card-foreground sm:p-6">
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="marketing-serif text-3xl">{t.label}</h3>
          <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: t.color }} aria-hidden="true" />
        </div>
        <p className="text-sm text-muted-foreground">{t.text}</p>
      </div>
      <div className="grid gap-2" aria-hidden="true">
        {t.sample.map((q) => (
          <div key={q} className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2 text-sm">
            <span className="truncate">{q}</span>
            <span className="h-1.5 w-8 shrink-0 rounded-full bg-muted" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{t.count} questions</span>
        <span className="h-7 w-16 rounded-full" style={{ backgroundColor: t.color }} aria-hidden="true" />
      </div>
    </div>
  )
}

function TemplatesSection() {
  return (
    <section id="templates" className="scroll-mt-24 px-4 pb-14 sm:px-6 sm:pb-24">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="grid justify-items-center gap-4 text-center lg:justify-items-start lg:text-left">
          <Pill>Templates</Pill>
          <h2 className="marketing-serif text-4xl sm:text-6xl">Start from a form that already works</h2>
          <p className="max-w-md text-muted-foreground">Pick one, change anything, publish. Drag the cards, or let them turn on their own.</p>
        </div>

        {/* The stack is a fixed size, so it takes the same room on every screen. */}
        <div className="mx-auto h-[24rem] w-[min(21rem,82vw)] sm:h-[26rem] sm:w-[23rem]">
          <Stack
            label="Template cards"
            cards={templates.map((t) => (
              <TemplateCard key={t.label} t={t} />
            ))}
            layout="fan"
            visible={3}
            spread={0.7}
            radius={24}
            autoplay
            autoplayDelay={3200}
            pauseOnHover
            sendToBackOnClick
          />
        </div>
      </div>
    </section>
  )
}

export { TemplatesSection }
