// Settings for the AI features. Nothing here is secret.
//
// Who pays: the person using the app brings their own provider, model and key (the AI tab in Settings). The key is
// saved encrypted against their account (ai_connections table, libs/crypto.ts) and is never sent back to the browser.
// The server has no AI key of its own.

export const aiProviders = ["openai", "anthropic", "google", "groq"] as const
export type AiProvider = (typeof aiProviders)[number]

type ProviderInfo = {
  label: string
  // Where the person gets a key, for the settings screen
  keyUrl: string
  // Shown as choices in the model picker. The picker should also let people type any model id, because providers
  // add and retire models often and this list will go out of date.
  suggestedModels: string[]
}

export const providerInfo: Record<AiProvider, ProviderInfo> = {
  openai: { label: "OpenAI", keyUrl: "https://platform.openai.com/api-keys", suggestedModels: ["gpt-5-mini", "gpt-5"] },
  anthropic: {
    label: "Anthropic",
    keyUrl: "https://console.anthropic.com/settings/keys",
    suggestedModels: ["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"],
  },
  google: { label: "Google", keyUrl: "https://aistudio.google.com/apikey", suggestedModels: ["gemini-2.5-flash", "gemini-2.5-pro"] },
  groq: { label: "Groq", keyUrl: "https://console.groq.com/keys", suggestedModels: ["llama-3.3-70b-versatile"] },
}

export const aiLimits = {
  // A model id is letters, digits and . _ - : / (for example "claude-sonnet-5-5" or "models/gemini-2.5-flash")
  modelPattern: /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/,
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
