"use client"

import { useState, useEffect, useRef } from "react"
import { SubtitleLine } from "@/lib/ass-parser"
import { Translation } from "@/types/anime"
import SubtitleRow from "@/components/SubtitleRow"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useHeader } from "./HeaderProvider"

interface EpisodePageProps {
  episodeId: string
  animeTitle?: string
  episodeNumber?: number
}

interface EpisodeData {
  episodeId: string
  episodeNumber: number
  episodeTitle?: string
  animeTitle: string
  animeId: string
  subtitles: SubtitleLine[]
  translations: Translation[]
}

export default function EpisodePage({
  episodeId,
  animeTitle: propAnimeTitle,
  episodeNumber: propEpisodeNumber,
}: EpisodePageProps) {
  const [data, setData] = useState<EpisodeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // 双模状态
  const [viewMode, setViewMode] = useState<"focus" | "list">("focus")
  const [activeIndex, setActiveIndex] = useState(0)

  // 振假名注音状态 (always / hover / hide)
  const [furiganaMode, setFuriganaMode] = useState<"always" | "hover" | "hide">("hover")

  // 从 localStorage 加载注音设置
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("furiganaMode")
      if (saved === "always" || saved === "hover" || saved === "hide") {
        setFuriganaMode(saved)
      }
    }
  }, [])

  // 保存注音设置到 localStorage
  const handleFuriganaModeChange = (mode: "always" | "hover" | "hide") => {
    setFuriganaMode(mode)
    if (typeof window !== "undefined") {
      localStorage.setItem("furiganaMode", mode)
    }
  }

  const { setHeaderContent, setHeaderClass } = useHeader()
  const focusContainerRef = useRef<HTMLDivElement>(null)
  const initialLoadedRef = useRef(false)
  const consecutiveKeyCountRef = useRef(0)

  // 获取数据
  useEffect(() => {
    fetchEpisodeData()
  }, [episodeId])

  // 定位首个未翻译字幕
  useEffect(() => {
    if (data && !initialLoadedRef.current) {
      initialLoadedRef.current = true
      const translationMap = new Map(
        data.translations.map((t) => [t.subtitleId, t]),
      )
      const firstIncompleteIdx = data.subtitles.findIndex(
        (s) => !translationMap.has(s.id),
      )
      if (firstIncompleteIdx !== -1) {
        setActiveIndex(firstIncompleteIdx)
      }
    }
  }, [data])

  // 锁定 body 滚动 (沉浸模式下)
  useEffect(() => {
    if (viewMode === "focus" && !loading && !error) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [viewMode, loading, error])

  // 根据视口模式动态调整 Header 样式（沉浸模式下弱化/悬浮显现）
  useEffect(() => {
    if (viewMode === "focus" && !loading && !error) {
      setHeaderClass("zen-header")
    } else {
      setHeaderClass("")
    }
    return () => {
      setHeaderClass("")
    }
  }, [viewMode, loading, error, setHeaderClass])

  // 全局键盘和按键松开监听 (沉浸聚焦模式下，支持长按方向键加速滚动)
  useEffect(() => {
    if (viewMode !== "focus" || loading || error || !data) return

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 如果处于输入法输入状态，跳过处理，避免干扰日语输入法选词与回车确认
      if (e.isComposing || e.keyCode === 229) return

      // 排除快捷键 Ctrl/Cmd 组合键，避免干扰
      if (e.ctrlKey || e.metaKey) return

      const subtitles = data.subtitles || []
      if (subtitles.length === 0) return

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault()

        // 持续按下方向键时，consecutiveKeyCountRef 会累加，提供加速步长
        if (e.repeat) {
          consecutiveKeyCountRef.current = Math.min(15, consecutiveKeyCountRef.current + 1)
        } else {
          consecutiveKeyCountRef.current = 1
        }

        // 步长根据持续按键次数增加，最多一次跨越 3 句
        const step = Math.min(3, Math.max(1, Math.floor(consecutiveKeyCountRef.current / 5)))

        if (e.key === "ArrowDown") {
          setActiveIndex((prev) => Math.min(subtitles.length - 1, prev + step))
        } else {
          setActiveIndex((prev) => Math.max(0, prev - step))
        }
      } else if (e.key === "Enter") {
        // 回车保存当前行并前往下一句
        if (!e.shiftKey) {
          e.preventDefault()

          // 自动触发现有聚焦元素的失焦保存
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
          }

          setActiveIndex((prev) => {
            if (prev < subtitles.length - 1) {
              return prev + 1
            }
            return prev
          })
        }
      }
    }

    const handleGlobalKeyUp = (e: KeyboardEvent) => {
      // 如果处于输入法输入状态，跳过处理
      if (e.isComposing || e.keyCode === 229) return

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        consecutiveKeyCountRef.current = 0 // 按键松开时重置计数器
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown)
    window.addEventListener("keyup", handleGlobalKeyUp)
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown)
      window.removeEventListener("keyup", handleGlobalKeyUp)
    }
  }, [viewMode, loading, error, data])

  // 将鼠标滚轮/触控板滚动转换为切句行为，并带滚动加速度支持
  useEffect(() => {
    const container = focusContainerRef.current
    if (!container || viewMode !== "focus" || loading || error || !data) return

    const lastWheelTimeRef = { current: 0 }
    const consecutiveScrollCountRef = { current: 0 }

    const handleWheelEvent = (e: WheelEvent) => {
      e.preventDefault()

      const now = Date.now()
      const timeDiff = now - lastWheelTimeRef.current

      // 如果两次滚动间隔小于 250ms，视为连续快速滚动，累加计数器
      if (timeDiff < 250) {
        consecutiveScrollCountRef.current = Math.min(12, consecutiveScrollCountRef.current + 1)
      } else {
        consecutiveScrollCountRef.current = 0
      }

      // 动态降低冷却时间，连续高速滚动时最小响应时间下降到 45ms，极速响应
      const cooldown = Math.max(45, 220 - consecutiveScrollCountRef.current * 18)

      if (timeDiff < cooldown) {
        return
      }

      const subtitles = data.subtitles || []
      if (subtitles.length === 0) return

      // 根据快速滚动的强度 (deltaY 绝对值) 和连续滚动计数动态放大跳句步长，最大支持一次跳 3 句
      const absDelta = Math.abs(e.deltaY)
      const step = Math.min(3, Math.max(1, Math.floor(absDelta / 45)))

      lastWheelTimeRef.current = now

      if (e.deltaY > 5) {
        setActiveIndex((prev) => Math.min(subtitles.length - 1, prev + step))
      } else if (e.deltaY < -5) {
        setActiveIndex((prev) => Math.max(0, prev - step))
      }
    }

    container.addEventListener("wheel", handleWheelEvent, { passive: false })
    return () => {
      container.removeEventListener("wheel", handleWheelEvent)
    }
  }, [viewMode, loading, error, data])

  // 更新 Header 动态内容
  useEffect(() => {
    if (loading) {
      setHeaderContent(
        <div className="flex items-center">
          <Link
            href="/"
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mr-4"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            返回动画列表
          </Link>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            加载中...
          </div>
        </div>,
      )
      return
    }

    if (error) {
      setHeaderContent(
        <div className="flex items-center">
          <Link
            href="/"
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mr-4"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            返回
          </Link>
          <div className="text-lg font-semibold text-red-600 dark:text-red-400">
            加载失败
          </div>
        </div>,
      )
      return
    }

    const stats = getStats()

    setHeaderContent(
      <div className="flex items-center justify-between flex-1 min-w-0 mr-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
        {/* 左侧：返回与轻量级标题及计数 */}
        <div className="flex items-center space-x-4">
          <Link
            href="/"
            className="flex items-center hover:text-gray-900 dark:hover:text-gray-100 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            返回
          </Link>
          <div className="h-3 w-px bg-gray-200 dark:bg-gray-800" />
          <span className="text-gray-800 dark:text-gray-200 truncate max-w-[180px] sm:max-w-sm font-medium">
            {data?.animeTitle || propAnimeTitle} · 第 {data?.episodeNumber || propEpisodeNumber} 集
          </span>
          <span className="text-gray-400 dark:text-gray-600 font-mono text-[11px]">
            ({stats.completed}/{stats.total})
          </span>
        </div>

        {/* 右侧：精简文本式循环切换 */}
        <div className="flex items-center space-x-6 font-medium select-none">
          <button
            onClick={() => {
              const nextMap: Record<"always" | "hover" | "hide", "always" | "hover" | "hide"> = {
                always: "hover",
                hover: "hide",
                hide: "always",
              }
              handleFuriganaModeChange(nextMap[furiganaMode])
            }}
            className="hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer transition-colors"
            title="点击切换注音显示方式"
          >
            注音: {furiganaMode === "always" ? "常显" : furiganaMode === "hover" ? "悬浮" : "隐藏"}
          </button>

          <button
            onClick={() => setViewMode(viewMode === "focus" ? "list" : "focus")}
            className="hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer transition-colors"
            title="点击切换视图模式"
          >
            模式: {viewMode === "focus" ? "聚焦" : "列表"}
          </button>
        </div>
      </div>,
    )

    return () => {
      setHeaderContent(null)
    }
  }, [
    data,
    loading,
    error,
    setHeaderContent,
    propAnimeTitle,
    propEpisodeNumber,
    viewMode,
    furiganaMode,
  ])

  const fetchEpisodeData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/episodes/${episodeId}`)
      if (!response.ok) {
        throw new Error("获取剧集数据失败")
      }
      const episodeData = await response.json()
      setData(episodeData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTranslation = async (
    subtitleId: string,
    translatedText: string,
    isStarred?: boolean,
  ) => {
    if (!data) return

    try {
      const subtitle = data.subtitles.find((s) => s.id === subtitleId)
      if (!subtitle) return

      const response = await fetch("/api/translations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          episodeId,
          subtitleId,
          originalText: subtitle.text,
          translatedText,
          isStarred,
        }),
      })

      if (!response.ok) {
        throw new Error("保存翻译失败")
      }

      const result = await response.json()

      setData((prev) => {
        if (!prev) return prev

        const existingIndex = prev.translations.findIndex(
          (t) => t.subtitleId === subtitleId,
        )
        const newTranslations = [...prev.translations]

        if (existingIndex >= 0) {
          newTranslations[existingIndex] = result.translation
        } else {
          newTranslations.push(result.translation)
        }

        return {
          ...prev,
          translations: newTranslations,
        }
      })
    } catch (error) {
      console.error("保存翻译失败:", error)
      throw error
    }
  }

  const handleDeleteTranslation = async (subtitleId: string) => {
    try {
      const response = await fetch("/api/translations", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          episodeId,
          subtitleId,
        }),
      })

      if (!response.ok) {
        throw new Error("删除翻译失败")
      }

      setData((prev) => {
        if (!prev) return prev

        return {
          ...prev,
          translations: prev.translations.filter(
            (t) => t.subtitleId !== subtitleId,
          ),
        }
      })
    } catch (error) {
      console.error("删除翻译失败:", error)
      throw error
    }
  }

  const getStats = () => {
    if (!data) return { total: 0, completed: 0 }

    const total = data.subtitles.length
    const completed = data.translations.length

    return { total, completed }
  }

  // 获取要渲染的 5 个槽位（当前行 + 上下各 2 行，不足的用空占位符补齐，保证活动行位置绝对锁定在中央）
  const getFocusSlice = () => {
    const subtitles = data?.subtitles || []
    if (subtitles.length === 0) return []

    const slice = []
    for (let offset = -2; offset <= 2; offset++) {
      const targetIdx = activeIndex + offset
      if (targetIdx >= 0 && targetIdx < subtitles.length) {
        slice.push({
          subtitle: subtitles[targetIdx],
          idx: targetIdx,
          isEmpty: false,
        })
      } else {
        slice.push({
          subtitle: null,
          idx: targetIdx,
          isEmpty: true,
        })
      }
    }
    return slice
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
          <div className="text-sm text-gray-500 dark:text-gray-400">
            正在载入剧集字幕...
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8 glass-panel rounded-2xl max-w-md border border-gray-200 dark:border-gray-800">
          <div className="text-lg text-rose-600 dark:text-rose-400 mb-4 font-semibold">
            {error}
          </div>
          <button
            onClick={fetchEpisodeData}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20 text-sm font-medium"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  const subtitles = data?.subtitles || []
  const stats = getStats()

  return (
    <div className="min-h-screen">
      {/* 字幕列表区 */}
      <div className="pb-32">
        {subtitles.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/10 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
            <div className="text-sm text-gray-400 dark:text-gray-500 mb-1">
              没有找到字幕行
            </div>
          </div>
        ) : viewMode === "focus" ? (
          // 沉浸聚焦容器 - 静态定高，无真正滚动条，全部拦截通过 wheel 转换
          <div 
            ref={focusContainerRef}
            className="max-w-4xl mx-auto flex flex-col justify-center h-[calc(100vh-140px)] overflow-hidden timeline-mask"
          >
            <div className="space-y-6">
              {getFocusSlice().map(({ subtitle, idx, isEmpty }) => {
                if (isEmpty) {
                  // 空白占位符：采用与非活动字幕行相同的样式结构以保证高度一致，保证 Slot 3 完美锁定中央
                  return (
                    <div key={`empty-${idx}`} className="py-4 px-6 opacity-0 select-none pointer-events-none">
                      <div className="flex flex-col items-center justify-center text-center gap-1">
                        <div className="japanese-text text-xl">&nbsp;</div>
                        <div className="text-xs">&nbsp;</div>
                      </div>
                    </div>
                  )
                }

                const isActive = idx === activeIndex
                const translation = data?.translations.find(
                  (t) => t.subtitleId === subtitle!.id,
                )

                return (
                  <div
                    key={subtitle!.id + "-" + idx}
                    className="transition-all duration-500 ease-in-out"
                  >
                    <SubtitleRow
                      subtitle={subtitle!}
                      translation={translation}
                      episodeId={episodeId}
                      onSave={handleSaveTranslation}
                      onDelete={handleDeleteTranslation}
                      viewMode="focus"
                      isActive={isActive}
                      onFocusSelf={() => setActiveIndex(idx)}
                      furiganaMode={furiganaMode}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          // 经典列表容器
          <div className="space-y-4 max-w-4xl mx-auto">
            {subtitles.map((subtitle, idx) => {
              const translation = data?.translations.find(
                (t) => t.subtitleId === subtitle.id,
              )
              return (
                <SubtitleRow
                  key={subtitle.id + "-" + idx}
                  subtitle={subtitle}
                  translation={translation}
                  episodeId={episodeId}
                  onSave={handleSaveTranslation}
                  onDelete={handleDeleteTranslation}
                  viewMode="list"
                  onFocusSelf={() => {
                    // 点击切换至聚焦模式
                    setActiveIndex(idx)
                    setViewMode("focus")
                  }}
                  furiganaMode={furiganaMode}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
