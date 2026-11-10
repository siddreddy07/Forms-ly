import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

// Pages that need a signed-in user (the owner's preview included). The public form (/f/...), home page and auth pages stay open.
const isPrivate = createRouteMatcher(["/dashboard(.*)", "/forms(.*)", "/preview(.*)"])

export default clerkMiddleware(async (auth, req) => {
  if (isPrivate(req)) await auth.protect()
})

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}
