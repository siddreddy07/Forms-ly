"use client"

import * as React from "react"

/* How a file question sends a file to storage. Only the live form provides one; the builder's preview does not, so
   there a chosen file stays in the browser. */
export type Uploader = (file: File) => Promise<{ ok: true; fileId: string } | { ok: false; message: string }>

const UploadContext = React.createContext<Uploader | null>(null)

export const UploadProvider = UploadContext.Provider
export const useUploader = () => React.useContext(UploadContext)
