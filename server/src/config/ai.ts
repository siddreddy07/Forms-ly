// Settings for the AI features. Nothing here is secret.
//
// Who pays: the person using the app brings their own company and key (the AI tab in Settings). The key is
// saved encrypted against their account (ai_connections table, libs/crypto.ts) and is never sent back to the browser.
// The server has no AI key of its own.

export const aiProviders = ["openai", "anthropic", "google", "groq"] as const
export type AiProvider = (typeof aiProviders)[number]

type ProviderInfo = {
  label: string
  // Where the person gets a key, for the settings screen
  keyUrl: string
  // The model used for this company. People do not pick one: the server decides, so every AI feature runs on a model
  // that is known to work here. Change it in this one place when a company retires or replaces a model.
  model: string
}

export const providerInfo: Record<AiProvider, ProviderInfo> = {
  openai: { label: "OpenAI", keyUrl: "https://platform.openai.com/api-keys", model: "gpt-5-mini" },
  anthropic: { label: "Anthropic", keyUrl: "https://console.anthropic.com/settings/keys", model: "claude-haiku-5-5" },
  google: { label: "Google", keyUrl: "https://aistudio.google.com/apikey", model: "gemini-2.5-flash" },
  groq: { label: "Groq", keyUrl: "https://console.groq.com/keys", model: "llama-3.3-70b-versatile" },
}

export const aiLimits = {
  minKeyLength: 8,
  maxKeyLength: 500,
  // Give up on a slow model after this long
  timeoutMs: 30_000,
  // Replies here are small structured answers, never essays
  maxOutputTokens: 1_000,
  // One retry for a network blip; more would just burn the person's quota
  maxRetries: 1,
  // What the person types to the assistant
  maxPromptChars: 1_000,
  // Saving or testing a key makes a real (tiny) call to the provider, so it is limited harder than the rest
  connectsPerMinute: 10,
  // AI requests per minute for each person, so a loop in a script cannot run up someone's bill
  requestsPerMinute: 20,
} as const
