"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { SubtitleLine } from "@/lib/ass-parser"
import { Translation } from "@/types/anime"
import { Clock, Check, AlertCircle } from "lucide-react"

interface SubtitleRowProps {
  subtitle: SubtitleLine
  translation?: Translation
  episodeId: string
  onSave: (subtitleId: string, translatedText: string) => Promise<void>
  onDelete: (subtitleId: string) => Promise<void>
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function SubtitleRow({
  subtitle,
  translation,
  episodeId,
  onSave,
  onDelete,
}: SubtitleRowProps) {
  const [translatedText, setTranslatedText] = useState(
    translation?.translatedText || "",
  )
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const lastSavedValueRef = useRef<string>(translation?.translatedText || "")

  // 只在初始化时或翻译从外部更新时设置文本
  useEffect(() => {
    const newTranslationText = translation?.translatedText || ""
    setTranslatedText(newTranslationText)
    lastSavedValueRef.current = newTranslationText
  }, [translation])

  // 处理文本变化
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setTranslatedText(value)
  }

  // 处理失焦时保存
  const handleBlur = async () => {
    const value = translatedText.trim()
    
    // 如果内容没有变化，不需要保存
    if (value === lastSavedValueRef.current) {
      return
    }

    setSaveStatus('saving')

    try {
      // 如果内容为空且之前有翻译，删除翻译
      if (!value && translation) {
        await onDelete(subtitle.id)
        lastSavedValueRef.current = ""
        setSaveStatus('saved')
      }
      // 如果有内容，保存翻译
      else if (value) {
        await onSave(subtitle.id, value)
        lastSavedValueRef.current = value
        setSaveStatus('saved')
      }
      
      // 2秒后隐藏保存状态
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error("保存翻译失败:", error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }
  }

  // 处理键盘快捷键（保留 Ctrl+S 立即保存功能）
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+S 或 Cmd+S 立即保存
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      handleBlur() // 复用失焦保存逻辑
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // 清理函数可以为空，因为我们不再使用 debounce
    }
  }, [])

  const getSaveStatusIcon = () => {
    switch (saveStatus) {
      case 'saving':
        return (
          <div className="flex items-center text-blue-600 dark:text-blue-400">
            <div className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full mr-1" />
            <span className="text-xs">保存中...</span>
          </div>
        )
      case 'saved':
        return (
          <div className="flex items-center text-green-600 dark:text-green-400">
            <Check className="w-3 h-3 mr-1" />
            <span className="text-xs">已保存</span>
          </div>
        )
      case 'error':
        return (
          <div className="flex items-center text-red-600 dark:text-red-400">
            <AlertCircle className="w-3 h-3 mr-1" />
            <span className="text-xs">保存失败</span>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 shadow-sm hover:shadow-md transition-shadow">
      {/* 时间戳和状态 */}
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
        <div className="flex items-center">
          <Clock className="w-4 h-4 mr-1" />
          <span>
            {subtitle.startTime} → {subtitle.endTime}
          </span>
          {subtitle.style && (
            <span className="ml-4 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs">
              {subtitle.style}
            </span>
          )}
        </div>
        {getSaveStatusIcon()}
      </div>

      {/* 原文 */}
      <div className="mb-3">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          原文：
        </div>
        <div className="text-lg text-gray-900 dark:text-white leading-relaxed bg-gray-50 dark:bg-gray-700 p-3 rounded">
          {subtitle.text}
        </div>
      </div>

      {/* 翻译输入框 */}
      <div>
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          翻译：
        </div>
        <textarea
          value={translatedText}
          onChange={handleTextChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="输入您的翻译..."
          className={`w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder-gray-500 dark:placeholder-gray-400 transition-colors ${
            translatedText
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-gray-900 dark:text-white"
              : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
          }`}
          rows={1}
        />
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {translatedText ? "点击其他地方或按 Ctrl+S 保存" : "输入翻译内容，失焦时自动保存"}
        </div>
      </div>
    </div>
  )
}
