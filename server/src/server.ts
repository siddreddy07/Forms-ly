import { clerkMiddleware } from "@clerk/express"
import cors from "cors"
import express from "express"

import { connectDB } from "./config/db.js"
import { requireUser } from "./middleware/auth.js"
import { requireDev } from "./middleware/dev.js"
import devRoutes from "./routes/dev.routes.js"
import formsRoutes from "./routes/forms.routes.js"
import publicRoutes from "./routes/public.routes.js"
import storageRoutes from "./routes/storage.routes.js"

const app = express()

// Let the Next.js app (a different address) call this API
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000" }))
app.use(express.json({ limit: "2mb" }))
// Reads the Clerk session on every request (never blocks by itself)
app.use(clerkMiddleware())

// Who am I? Needs a Clerk session token in the Authorization header
app.get("/me", requireUser, (req, res) => {
  res.json({ user: req.user })
})

app.use("/forms", requireUser, formsRoutes)
// No sign-in: what people filling in a form see
app.use("/public", publicRoutes)
// Developer tools: never in production, and only for the account in DEV_USER_ID
if (process.env.NODE_ENV !== "production") app.use("/dev", requireUser, requireDev, devRoutes)
app.use("/storage", requireUser, storageRoutes)

// Any error nobody handled: reply with JSON instead of a web page
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error)
  res.status(500).json({ error: "Something went wrong" })
})

const PORT = process.env.PORT || 4000

// Connect to the database first, then start listening
await connectDB()

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
