import { Pill } from "@/components/marketing/pill"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

/* Short, plain answers, including what is not here. */
const questions = [
  { q: "Do people need an account to fill in a form?", a: "No. Anyone with the link can fill it in. Only you sign in." },
  { q: "Is it free?", a: "Yes. Everything on this page is free today, and no card is needed to start." },
  { q: "Can I change a form after I publish it?", a: "Yes. Edits stay a draft while people keep seeing the published version. Press Update live form when you want them to see the changes." },
  { q: "Can I keep a form private?", a: "Yes. Switch it to private and visitors need a 4 digit code to open the link. A new code is made each time you switch to private." },
  { q: "How big can an uploaded file be?", a: "Up to 3 MB each. Files go to storage you control: connect your own ImageKit account, or use the small free allowance to try it." },
  { q: "What is missing?", a: "There are no AI features, and no custom domains yet. Forms live at a Formly link." },
] as const

function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-24 px-4 pb-12 sm:px-6 sm:pb-28">
      <div className="mx-auto grid max-w-3xl gap-6 sm:gap-10">
        <div className="grid justify-items-center gap-5 text-center">
          <Pill>Questions</Pill>
          <h2 className="marketing-serif text-4xl sm:text-6xl">Straight answers</h2>
        </div>
        <Accordion className="rounded-[1.5rem] bg-muted/50 px-4 sm:rounded-[1.75rem] sm:px-8">
          {questions.map((item) => (
            <AccordionItem key={item.q} value={item.q}>
              <AccordionTrigger className="py-4 text-base font-medium sm:py-5">{item.q}</AccordionTrigger>
              <AccordionContent className="pb-5 text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}

export { FaqSection }
