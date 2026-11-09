"use client"

import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { motion, MotionConfig, useScroll, useTransform } from "motion/react"
import * as React from "react"

import { buttonVariants } from "@/components/ui/button"
import { WindowFrame } from "@/components/marketing/window-frame"
import { authLinks } from "@/lib/brand"

const ease = [0.22, 1, 0.36, 1] as const

const headline = ["Forms", "people", "enjoy", "filling", "in"]

function Hero() {
  const stage = React.useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: stage,
    offset: ["start end", "start 25%"],
  })
  const scale = useTransform(scrollYProgress, [0, 1], [0.92, 1])
  const rise = useTransform(scrollYProgress, [0, 1], [60, 0])

  return (
    <MotionConfig reducedMotion="user">
      <section className="relative overflow-hidden px-4 pt-32 pb-24 sm:px-6 sm:pt-40">
        <div className="mx-auto max-w-6xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.1 }}
          >
            <p className="text-sm font-medium">The form builder for client work</p>
            <p className="text-sm text-muted-foreground">
              Free to start, no card needed
            </p>
          </motion.div>

          <h1 className="mx-auto mt-8 flex max-w-5xl flex-wrap justify-center gap-x-[0.22em] font-display text-[clamp(3rem,9vw,8.5rem)] leading-[0.95] font-medium tracking-[-0.045em]">
            {headline.map((word, i) => (
              <span key={word} className="inline-block overflow-hidden pb-[0.12em]">
                <motion.span
                  className="inline-block"
                  initial={{ y: "110%", opacity: 0, filter: "blur(8px)" }}
                  animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                  transition={{ duration: 0.9, ease, delay: 0.2 + i * 0.07 }}
                >
                  {word}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease, delay: 0.65 }}
            className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground text-balance"
          >
            Build a form by dragging blocks into place. Share a link. See
            exactly where people drop off.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease, delay: 0.78 }}
            className="mt-10 flex justify-center"
          >
            <Link
              href={authLinks.signUp}
              className={`${buttonVariants({ size: "lg", shape: "pill" })} group/cta h-12 px-6 text-base`}
            >
              Start for free
              <ArrowRightIcon
                data-icon="inline-end"
                className="transition-transform duration-300 group-hover/cta:translate-x-1"
              />
            </Link>
          </motion.div>
        </div>

        <motion.div
          ref={stage}
          style={{ scale, y: rise }}
          className="mx-auto mt-20 max-w-6xl origin-top"
        >
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease, delay: 0.9 }}
          >
            <WindowFrame />
          </motion.div>
        </motion.div>
      </section>
    </MotionConfig>
  )
}

export { Hero }

