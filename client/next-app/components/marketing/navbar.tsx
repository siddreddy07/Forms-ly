"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CircleHelpIcon,
  LayersIcon,
  LayoutTemplateIcon,
  MenuIcon,
  TagIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react"
import { motion, MotionConfig } from "motion/react"
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs"

import { Logo, LogoMark } from "@/components/brand/logo"
import { buttonVariants } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { brand, navLinks } from "@/lib/brand"
import { cn } from "@/lib/utils"

const ease = [0.22, 1, 0.36, 1] as const

const navIcons: Record<string, LucideIcon> = {
  Product: LayersIcon,
  Templates: LayoutTemplateIcon,
  Pricing: TagIcon,
  FAQ: CircleHelpIcon,
}

function useScrolled(threshold = 24) {
  const [scrolled, setScrolled] = React.useState(false)
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [threshold])
  return scrolled
}

const linkClass =
  "relative z-0 rounded-full px-4 py-2 text-sm font-medium text-foreground/65 transition-colors duration-200 outline-none hover:text-foreground focus-visible:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-[current=page]:text-foreground"

function Navbar() {
  const pathname = usePathname()
  const scrolled = useScrolled()
  const [open, setOpen] = React.useState(false)
  const [hovered, setHovered] = React.useState<string | null>(null)

  return (
    <MotionConfig reducedMotion="user">
      <motion.header
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease }}
        className="fixed inset-x-0 top-0 z-40 px-4 lg:px-6"
      >
        {/* Desktop: full bar that condenses into a floating pill on scroll */}
        <motion.nav
          aria-label="Main"
          animate={{
            maxWidth: scrolled ? 760 : 1800,
            marginTop: scrolled ? 12 : 8,
          }}
          transition={{ duration: 0.5, ease }}
          className={cn(
            "mx-auto hidden h-14 items-center justify-between gap-6 rounded-full border border-transparent pr-2 pl-5 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-500 lg:flex",
            scrolled &&
              "border-border bg-background/80 shadow-sm backdrop-blur-xl"
          )}
        >
          <Logo />
          <ul
            className="flex items-center"
            onMouseLeave={() => setHovered(null)}
          >
            {navLinks.map((link) => (
              <li key={link.href} className="relative">
                <Link
                  href={link.href}
                  className={linkClass}
                  aria-current={pathname === link.href ? "page" : undefined}
                  onMouseEnter={() => setHovered(link.href)}
                  onFocus={() => setHovered(link.href)}
                  onBlur={() => setHovered(null)}
                >
                  {link.label}
                </Link>
                {hovered === link.href && (
                  <motion.span
                    layoutId="nav-hover"
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 rounded-full bg-muted"
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  />
                )}
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-1">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button type="button" className={linkClass}>Sign in</button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button type="button" className={buttonVariants({ size: "default", shape: "pill" })}>
                  Start for free
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <Link href="/dashboard" className={buttonVariants({ size: "default", shape: "pill" })}>
                Dashboard
              </Link>
              <UserButton />
            </Show>
          </div>
        </motion.nav>

        {/* Mobile and tablet: floating pill */}
        <motion.div
          animate={{ marginTop: scrolled ? 8 : 16 }}
          transition={{ duration: 0.4, ease }}
          className="flex justify-center lg:hidden"
        >
          <nav
            aria-label="Main"
            className={cn(
              "flex h-14 w-full max-w-sm items-center justify-between rounded-full border bg-background/85 pr-2 pl-5 backdrop-blur-xl transition-shadow duration-500",
              scrolled && "shadow-md"
            )}
          >
            <Link
              href="/"
              aria-label={`${brand.name} home`}
              className="rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              <LogoMark />
            </Link>
            <span className="font-display text-xl font-medium tracking-tight">
              {brand.name}
            </span>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger
                aria-label="Open menu"
                className="inline-flex size-10 items-center justify-center rounded-full outline-none transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <MenuIcon className="size-5" />
              </SheetTrigger>
              <SheetContent
                side="top"
                showCloseButton={false}
                className="data-[side=top]:inset-x-3! data-[side=top]:top-3! data-[side=top]:w-auto data-[side=top]:rounded-2xl data-[side=top]:border data-[side=top]:sm:mx-auto data-[side=top]:sm:max-w-md gap-0 p-2"
              >
                <SheetTitle className="sr-only">{brand.name} menu</SheetTitle>
                <SheetDescription className="sr-only">Site navigation</SheetDescription>

                <div className="flex h-11 items-center justify-between pr-0.5 pl-2.5">
                  <LogoMark className="size-5" />
                  <SheetClose
                    aria-label="Close menu"
                    className="inline-flex size-9 items-center justify-center rounded-lg outline-none transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <XIcon className="size-5" />
                  </SheetClose>
                </div>

                <ul className="flex flex-col">
                  {navLinks.map((link, i) => (
                    <motion.li
                      key={link.href}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, ease, delay: 0.04 + i * 0.04 }}
                    >
                      <SheetClose
                        nativeButton={false}
                        render={
                          <Link
                            href={link.href}
                            className="flex h-11 items-center gap-3 rounded-lg px-2.5 text-[0.95rem] font-medium outline-none transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                          />
                        }
                      >
                        {(() => {
                          const Icon = navIcons[link.label]
                          return Icon ? <Icon className="size-[18px] text-muted-foreground" /> : null
                        })()}
                        {link.label}
                      </SheetClose>
                    </motion.li>
                  ))}
                </ul>

                <div className="mt-2 grid grid-cols-2 gap-2 border-t p-1.5 pt-2.5">
                  <Show when="signed-out">
                    <SignInButton mode="modal">
                      <button type="button" className={buttonVariants({ size: "lg", variant: "outline" })}>
                        Sign in
                      </button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <button type="button" className={buttonVariants({ size: "lg" })}>
                        Start for free
                      </button>
                    </SignUpButton>
                  </Show>
                  <Show when="signed-in">
                    <SheetClose
                      nativeButton={false}
                      render={<Link href="/dashboard" className={buttonVariants({ size: "lg" })} />}
                    >
                      Dashboard
                    </SheetClose>
                    <div className="flex items-center justify-center">
                      <UserButton showName />
                    </div>
                  </Show>
                </div>
              </SheetContent>
            </Sheet>          </nav>
        </motion.div>
      </motion.header>
    </MotionConfig>
  )
}

export { Navbar }




