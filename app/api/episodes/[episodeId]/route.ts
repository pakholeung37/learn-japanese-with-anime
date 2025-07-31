import { NextRequest, NextResponse } from "next/server"
import { readSubtitleFile, getEpisodeInfo } from "@/lib/subtitle-scanner"
import { parseASS } from "@/lib/ass-parser"
import { getEpisodeTranslations } from "@/lib/kv-service"

interface RouteParams {
  params: Promise<{
    episodeId: string
  }>
}

export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { episodeId: rawEpisodeId } = await context.params

    // URL解码
    const episodeId = decodeURIComponent(rawEpisodeId)

    const episodeInfo = await getEpisodeInfo(episodeId)

    if (!episodeInfo) {
      return NextResponse.json({ error: "找不到剧集信息" }, { status: 404 })
    }

    const { episode, anime } = episodeInfo
    const content = await readSubtitleFile(episode.subtitlePath)
    const parsed = parseASS(content)
    const translations = await getEpisodeTranslations(episodeId)
    console.log("Getting translations for episodeId:", episodeId)
    console.log("Found translations:", translations.length)
    console.log("translations", translations)
    return NextResponse.json({
      episodeId: episode.id,
      episodeNumber: episode.number,
      episodeTitle: episode.title,
      animeTitle: anime.title,
      animeId: anime.id,
      subtitles: parsed.dialogues,
      translations,
    })
  } catch (error) {
    console.error("获取剧集字幕失败:", error)
    return NextResponse.json({ error: "获取剧集字幕失败" }, { status: 500 })
  }
}
