"use client"

import { useHeader } from "./HeaderProvider"
import ThemeToggle from "./ThemeToggle"
import Link from "next/link"

export default function DynamicHeader() {
  const { headerContent } = useHeader()

  return (
    <header className={`border-b border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md ${headerContent ? "sticky top-0 z-50" : "relative"}`}>
      <div className="max-w-6xl mx-auto px-4 py-3">
        {headerContent ? (
          <div className="flex justify-between items-center">
            {headerContent}
            <ThemeToggle />
          </div>
        ) : (
          <div className="flex justify-between items-center">
            <Link
              href="/"
              className="text-xl font-bold text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300"
            >
              通过动画学习日语
            </Link>
            <ThemeToggle />
          </div>
        )}
      </div>
    </header>
  )
}
