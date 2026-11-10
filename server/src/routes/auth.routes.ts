import { Router } from "express"

const router = Router()

// POST /auth/signup
router.post("/signup", (req, res) => {
  // TODO: create the user, then sign the tokens and set the cookies
  res.status(501).json({ message: "Signup is not built yet" })
})

// POST /auth/login
router.post("/login", (req, res) => {
  // TODO: check the password, then sign the tokens and set the cookies
  res.status(501).json({ message: "Login is not built yet" })
})

export default router
