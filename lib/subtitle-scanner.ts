import { promises as fs } from "fs"
import path from "path"
import { AnimeInfo, EpisodeInfo } from "@/types/anime"

const SUBTITLES_DIR = path.join(process.cwd(), "app/res")

/**
 * 扫描字幕目录，获取所有动画和剧集信息
 */
export async function scanSubtitles(): Promise<AnimeInfo[]> {
  try {
    const animeList: AnimeInfo[] = []
    const animeDirs = await fs.readdir(SUBTITLES_DIR)

    for (const animeDir of animeDirs) {
      const animePath = path.join(SUBTITLES_DIR, animeDir)
      const stat = await fs.stat(animePath)

      if (!stat.isDirectory()) continue

      const episodes = await scanEpisodes(animePath, animeDir)

      if (episodes.length > 0) {
        animeList.push({
          id: generateAnimeId(animeDir),
          title: cleanAnimeName(animeDir),
          episodes,
        })
      }
    }

    return animeList.sort((a, b) => a.title.localeCompare(b.title))
  } catch (error) {
    console.error("扫描字幕文件失败:", error)
    return []
  }
}

/**
 * 扫描单个动画目录下的剧集
 */
async function scanEpisodes(
  animePath: string,
  animeDir: string,
): Promise<EpisodeInfo[]> {
  const episodes: EpisodeInfo[] = []
  const files = await fs.readdir(animePath)

  // 过滤出日语字幕文件
  const subtitleFiles = files.filter(
    (file) => file.endsWith(".JP.ass") || file.endsWith(".jp.ass"),
  )

  for (const file of subtitleFiles) {
    const episodeNumber = extractEpisodeNumber(file)
    if (episodeNumber !== null) {
      episodes.push({
        id: generateEpisodeId(animeDir, episodeNumber, file),
        number: episodeNumber,
        subtitlePath: path.join(animePath, file),
        animeId: generateAnimeId(animeDir),
      })
    }
  }

  return episodes.sort((a, b) => a.number - b.number)
}

/**
 * 从文件名中提取剧集编号
 */
function extractEpisodeNumber(filename: string): number | null {
  // 匹配类似 [01], [02] 的模式
  const match = filename.match(/\[(\d+)\]/)
  if (match) {
    return parseInt(match[1], 10)
  }

  // 匹配 EP01, EP02 等模式
  const epMatch = filename.match(/EP(\d+)/i)
  if (epMatch) {
    return parseInt(epMatch[1], 10)
  }

  return null
}

/**
 * 生成动画ID - 简化版本，避免URL编码问题
 */
function generateAnimeId(animeDir: string): string {
  // 提取主要信息，避免特殊字符
  let id = animeDir

  // 保留核心动画名称
  id = id.trim()

  // 基础转义，保持更多原始信息
  id = id
    .replace(/\s+/g, "-") // 空格转连字符
    .replace(/-+/g, "-") // 多个连字符合并为一个

  return id || "anime"
}

/**
 * 生成剧集ID - 简化版本
 */
function generateEpisodeId(
  animeDir: string,
  episodeNumber: number,
  filename?: string,
): string {
  const animeId = generateAnimeId(animeDir)

  if (filename) {
    // 从文件名中提取关键信息
    const baseName = filename.replace(/\.(JP|jp)\.ass$/, "")

    // 查找剧集编号模式
    const episodeMatch = baseName.match(/\[(\d+)\]/)
    const episodeStr = episodeMatch
      ? episodeMatch[1].padStart(2, "0")
      : episodeNumber.toString().padStart(2, "0")

    // 查找分辨率信息
    const resolutionMatch = baseName.match(/(\d{3,4}x\d{3,4})/)
    const resolution = resolutionMatch ? resolutionMatch[1] : ""

    // 生成简洁的ID
    let id = `${animeId}-ep${episodeStr}`
    if (resolution) {
      id += `-${resolution}`
    }

    return id
  }

  return `${animeId}-ep${episodeNumber.toString().padStart(2, "0")}`
}

/**
 * 清理动画名称
 */
function cleanAnimeName(dirName: string): string {
  // 移除常见的发布组标签，但保留核心动画名称
  let title = dirName

  // 移除开头的发布组标签 [CASO&I.G]
  title = title.replace(/^\[.*?\]/, "")

  // 移除结尾的发布组标签（如果有的话）
  title = title.replace(/\[.*?\]$/, "")

  // 清理多余的空格
  title = title.trim()

  // 如果标题为空，使用原始目录名
  if (!title) {
    title = dirName
  }

  return title
}

/**
 * 根据episodeId获取字幕文件路径
 */
export async function getSubtitlePathByEpisodeId(
  episodeId: string,
): Promise<string | null> {
  try {
    const animeList = await scanSubtitles()

    for (const anime of animeList) {
      const episode = anime.episodes.find((ep) => ep.id === episodeId)
      if (episode) {
        return episode.subtitlePath
      }
    }

    return null
  } catch (error) {
    console.error("获取字幕文件路径失败:", error)
    return null
  }
}

/**
 * 根据episodeId获取剧集信息
 */
export async function getEpisodeInfo(
  episodeId: string,
): Promise<{ episode: EpisodeInfo; anime: AnimeInfo } | null> {
  try {
    const animeList = await scanSubtitles()

    for (const anime of animeList) {
      const episode = anime.episodes.find((ep) => ep.id === episodeId)
      if (episode) {
        return { episode, anime }
      }
    }

    return null
  } catch (error) {
    console.error("获取剧集信息失败:", error)
    return null
  }
}

/**
 * 读取字幕文件内容
 */
export async function readSubtitleFile(filePath: string): Promise<string> {
  try {
    // 首先尝试读取为 Buffer
    const buffer = await fs.readFile(filePath)

    // 检查是否是 UTF-16LE (BOM: FF FE)
    if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
      // UTF-16LE 编码
      return buffer.toString("utf16le")
    }

    // 检查是否是 UTF-16BE (BOM: FE FF)
    if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
      // UTF-16BE 编码 (需要转换)
      const utf16beBuffer = Buffer.alloc(buffer.length - 2)
      for (let i = 2; i < buffer.length; i += 2) {
        utf16beBuffer[i - 2] = buffer[i + 1]
        utf16beBuffer[i - 1] = buffer[i]
      }
      return utf16beBuffer.toString("utf16le")
    }

    // 如果没有 BOM，尝试检测编码
    // 检查是否包含 UTF-16LE 的特征（每个ASCII字符后跟0x00）
    let utf16leScore = 0
    for (let i = 0; i < Math.min(buffer.length, 1000); i += 2) {
      if (buffer[i] > 0x00 && buffer[i] < 0x7f && buffer[i + 1] === 0x00) {
        utf16leScore++
      }
    }

    // 如果看起来像 UTF-16LE，就用 UTF-16LE 解码
    if (utf16leScore > 10) {
      return buffer.toString("utf16le")
    }

    // 否则默认使用 UTF-8
    return buffer.toString("utf-8")
  } catch (error) {
    console.error("读取字幕文件失败:", error)
    return ""
  }
}
