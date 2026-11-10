/* What GET /storage (server/src/routes/storage.routes.ts) answers. The private key is never part of it. */
export type OwnStorage = {
  provider: "imagekit"
  urlEndpoint: string
  publicKey: string
  connectedAt: string
}

export type StorageStatus = {
  maxFileBytes: number
  /* Our free storage. Used until you connect your own. */
  platform: { available: boolean; limit: number; used: number }
  own: OwnStorage | null
}
