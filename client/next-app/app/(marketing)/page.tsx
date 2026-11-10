import { CtaFooter } from "@/components/marketing/cta-footer"
import { FaqSection } from "@/components/marketing/faq-section"
import { Hero } from "@/components/marketing/hero"
import { ProductSection } from "@/components/marketing/product-section"
import { TemplatesSection } from "@/components/marketing/templates-section"

export default function HomePage() {
  return (
    <>
      <Hero />
      <ProductSection />
      <TemplatesSection />
      <FaqSection />
      <CtaFooter />
    </>
  )
}
