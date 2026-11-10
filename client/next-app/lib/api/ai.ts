/* What GET /ai and PUT /ai (server/src/routes/ai.routes.ts) answer. The key itself never comes back, only its last 4
   characters so you can tell which key is saved. The model is chosen by the server for each company. */
export type AiProviderId = "openai" | "anthropic" | "google" | "groq"

export type AiProviderInfo = {
  id: AiProviderId
  label: string
  /* Where to create a key. */
  keyUrl: string
}

export type AiConnection = {
  provider: AiProviderId
  keyHint: string
  connectedAt: string
  updatedAt: string
}

export type AiStatus = {
  providers: AiProviderInfo[]
  connection: AiConnection | null
}
