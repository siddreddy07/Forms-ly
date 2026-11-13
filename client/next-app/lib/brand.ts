/* PLACEHOLDER: product name, tagline and logo are not decided. Change here only. */
export const brand = {
  name: "Formly",
  tagline: "Forms people enjoy filling in",
  description:
    "Build forms that look good, work on any device, and replace Google Forms.",
  domain: "example.com",
} as const

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://formly.siddharthreddy627.workers.dev"

export const navLinks = [
  { label: "Product", href: "/#product" },
  { label: "Templates", href: "/#templates" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/#faq" },
] as const

export const authLinks = {
  signIn: "/sign-in",
  signUp: "/sign-up",
} as const
