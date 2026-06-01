"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"

interface HeaderContextType {
  headerContent: ReactNode | null
  setHeaderContent: (content: ReactNode | null) => void
  headerClass: string
  setHeaderClass: (className: string) => void
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined)

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [headerContent, setHeaderContent] = useState<ReactNode | null>(null)
  const [headerClass, setHeaderClass] = useState<string>("")

  return (
    <HeaderContext.Provider value={{ headerContent, setHeaderContent, headerClass, setHeaderClass }}>
      {children}
    </HeaderContext.Provider>
  )
}

export function useHeader() {
  const context = useContext(HeaderContext)
  if (context === undefined) {
    throw new Error("useHeader must be used within a HeaderProvider")
  }
  return context
}
