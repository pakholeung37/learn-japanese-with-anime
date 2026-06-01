"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { SubtitleLine } from "@/lib/ass-parser"
import { Translation } from "@/types/anime"
import { Clock, Check, AlertCircle, Edit3, Maximize2 } from "lucide-react"

interface SubtitleRowProps {
  subtitle: SubtitleLine
  translation?: Translation
  episodeId: string
  onSave: (subtitleId: string, translatedText: string) => Promise<void>
  onDelete: (subtitleId: string) => Promise<void>
  // 新增支持双模的属性
  viewMode?: "list" | "focus"
  isActive?: boolean
  onFocusSelf?: () => void
  furiganaMode?: "always" | "hover" | "hide"
}

type SaveStatus = "idle" | "saving" | "saved" | "error"

export default function SubtitleRow({
  subtitle,
  translation,
  episodeId,
  onSave,
  onDelete,
  viewMode = "list",
  isActive = false,
  onFocusSelf,
  furiganaMode = "hover",
}: SubtitleRowProps) {
  const [translatedText, setTranslatedText] = useState(
    translation?.translatedText || "",
  )
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const lastSavedValueRef = useRef<string>(translation?.translatedText || "")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 只在初始化时或翻译从外部更新时设置文本
  useEffect(() => {
    const newTranslationText = translation?.translatedText || ""
    setTranslatedText(newTranslationText)
    lastSavedValueRef.current = newTranslationText
  }, [translation])

  // 自动调整 textarea 高度
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [])

  // 当内容变化时调整高度
  useEffect(() => {
    adjustTextareaHeight()
  }, [translatedText, adjustTextareaHeight])

  // 聚焦状态下自动聚焦
  useEffect(() => {
    if (viewMode === "focus" && isActive && textareaRef.current) {
      textareaRef.current.focus()
      // 光标定位到最后
      const len = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(len, len)
    }
  }, [isActive, viewMode])

  // 处理文本变化
  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value
      setTranslatedText(value)
      // 延迟调整高度，确保状态更新后再调整
      setTimeout(adjustTextareaHeight, 0)
    },
    [adjustTextareaHeight],
  )

  // 保存逻辑
  const handleSave = async () => {
    const value = translatedText.trim()

    // 如果内容没有变化，不需要保存
    if (value === lastSavedValueRef.current) {
      return
    }

    setSaveStatus("saving")

    try {
      // 如果内容为空且之前有翻译，删除翻译
      if (!value && translation) {
        await onDelete(subtitle.id)
        lastSavedValueRef.current = ""
        setSaveStatus("saved")
      }
      // 如果有内容，保存翻译
      else if (value) {
        await onSave(subtitle.id, value)
        lastSavedValueRef.current = value
        setSaveStatus("saved")
      } else {
        setSaveStatus("idle")
      }

      // 2秒后隐藏保存状态
      setTimeout(() => setSaveStatus("idle"), 2000)
    } catch (error) {
      console.error("保存翻译失败:", error)
      setSaveStatus("error")
      setTimeout(() => setSaveStatus("idle"), 2000)
    }
  }

  // 处理失焦时保存
  const handleBlur = () => {
    handleSave()
  }

  // 处理键盘快捷键（保留 Ctrl+S 立即保存功能）
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Ctrl+S 或 Cmd+S 立即保存
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault()
        handleSave()
      }
      // 回车保存（在 Focus 模式下，EpisodePage 会统一监听 Enter 来切换，这里避免冲突）
    },
    [translatedText, translation, onSave, onDelete],
  )

  const getSaveStatusIcon = useCallback(() => {
    switch (saveStatus) {
      case "saving":
        return (
          <div className="flex items-center text-indigo-600 dark:text-indigo-400">
            <div className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full mr-1.5" />
            <span className="text-xs font-medium">保存中...</span>
          </div>
        )
      case "saved":
        return (
          <div className="flex items-center text-emerald-600 dark:text-emerald-400">
            <Check className="w-3.5 h-3.5 mr-1" />
            <span className="text-xs font-medium">已保存</span>
          </div>
        )
      case "error":
        return (
          <div className="flex items-center text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-3.5 h-3.5 mr-1" />
            <span className="text-xs font-medium">保存失败</span>
          </div>
        )
      default:
        return null
    }
  }, [saveStatus])

  const renderJapaneseText = () => {
    if (!subtitle.furigana || subtitle.furigana.length === 0) {
      return subtitle.text
    }

    return (
      <span className={`furigana-${furiganaMode}`}>
        {subtitle.furigana.map((token, index) => {
          if (token.isKanji && token.reading) {
            return (
              <ruby key={index}>
                {token.text}
                <rt>{token.reading}</rt>
              </ruby>
            )
          }
          return <span key={index}>{token.text}</span>
        })}
      </span>
    )
  }

  // --- 渲染逻辑 ---

  // 1. 聚焦模式下的非活动状态（上下文背景行）
  if (viewMode === "focus" && !isActive) {
    return (
      <div
        onClick={onFocusSelf}
        className="group relative cursor-pointer py-4 px-6 opacity-15 hover:opacity-50 transition-all duration-300 transform scale-[0.97] hover:scale-[1] select-none"
      >
        <div className="flex flex-col items-center justify-center text-center gap-1">
          <div className="japanese-text text-xl text-gray-500 dark:text-gray-400 line-clamp-1">
            {subtitle.text}
          </div>
          {translatedText && (
            <div className="text-xs text-indigo-500/60 dark:text-indigo-300/60 line-clamp-1 truncate max-w-lg translation-input">
              {translatedText}
            </div>
          )}
        </div>
      </div>
    )
  }

  // 2. 聚焦模式下的活动状态（中央舞台 - Zen Mode）
  if (viewMode === "focus" && isActive) {
    return (
      <div className="py-12 px-4 animate-slide-up relative w-full max-w-3xl mx-auto flex flex-col items-center">
        {/* 右上角超微时间与状态指示器 */}
        <div className="absolute right-4 -top-2 flex items-center gap-2 text-[10px] text-gray-400/60 dark:text-gray-600/60 font-mono">
          <span>{subtitle.startTime.replace(/,\d+$/, "")}</span>
          <div className="w-1.5 h-1.5 flex items-center">{getSaveStatusIcon()}</div>
        </div>

        {/* 日语原文区 - 极致大号明朝体 */}
        <div className="mb-10 text-center w-full">
          <div className="japanese-text text-3xl md:text-5xl font-medium text-gray-900 dark:text-white leading-relaxed tracking-wider cursor-text py-2">
            {renderJapaneseText()}
          </div>
        </div>

        {/* 翻译输入区 - 笔记本单下划线样式 */}
        <div className="w-full relative border-b border-gray-200 dark:border-gray-800/80 focus-within:border-indigo-500/80 dark:focus-within:border-indigo-500/60 transition-colors duration-300 py-1">
          <textarea
            ref={textareaRef}
            value={translatedText}
            onChange={handleTextChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            rows={1}
            className="w-full bg-transparent text-xl md:text-2xl text-center text-indigo-500 dark:text-indigo-300 focus:outline-none resize-none placeholder-gray-300 dark:placeholder-gray-700 leading-relaxed translation-input min-h-[56px] overflow-hidden"
          />
        </div>
      </div>
    )
  }

  // 3. 经典列表模式
  return (
    <div
      className={`bg-white dark:bg-gray-800 border rounded-xl p-5 mb-4 shadow-sm hover:shadow-md transition-all duration-200 group ${
        translatedText
          ? "border-emerald-100 dark:border-emerald-950/40 bg-emerald-50/10 dark:bg-emerald-950/5"
          : "border-gray-200 dark:border-gray-700"
      }`}
    >
      {/* 顶部行 */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 font-mono">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            {subtitle.startTime} → {subtitle.endTime}
          </span>
          {subtitle.style && (
            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded text-[10px]">
              {subtitle.style}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {getSaveStatusIcon()}
          {onFocusSelf && (
            <button
              onClick={(e) => {
                e.stopPropagation() // 防止事件冒泡
                onFocusSelf()
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 dark:text-indigo-400 font-semibold cursor-pointer transition-colors text-[10px]"
              title="进入沉浸聚焦模式"
            >
              <Maximize2 className="w-3 h-3" />
              进入聚焦
            </button>
          )}
        </div>
      </div>

      {/* 原文 */}
      <div className="mb-3">
        <div className="japanese-text text-lg font-medium text-gray-900 dark:text-white leading-relaxed select-text cursor-text">
          {renderJapaneseText()}
        </div>
      </div>

      {/* 翻译 */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={translatedText}
          onChange={handleTextChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="输入您的翻译..."
          rows={1}
          className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none placeholder-gray-400 dark:placeholder-gray-500 transition-all overflow-hidden text-indigo-500 dark:text-indigo-300 font-medium translation-input ${
            translatedText
              ? "bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/80"
              : "bg-gray-50 dark:bg-gray-900/40 border-gray-300 dark:border-gray-700"
          }`}
        />
      </div>
    </div>
  )
}
