import cookieParser from "cookie-parser"
import express from "express"

import { connectDB } from "./config/db.js"
import authRoutes from "./routes/auth.routes.js"

const app = express()

app.use(express.json())
app.use(cookieParser())

app.use("/auth", authRoutes)

const PORT = process.env.PORT || 4000

// Connect to the database first, then start listening
await connectDB()

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
