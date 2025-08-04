export interface SubtitleLine {
  id: string
  startTime: string
  endTime: string
  text: string
  style: string
  actor: string
}

export interface ParsedSubtitle {
  info: Record<string, string>
  styles: Record<string, any>
  dialogues: SubtitleLine[]
}

/**
 * 解析ASS字幕文件
 */
export function parseASS(content: string): ParsedSubtitle {
  const lines = content.split("\n").map((line) => line.trim())

  const result: ParsedSubtitle = {
    info: {},
    styles: {},
    dialogues: [],
  }

  let currentSection = ""

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // 跳过空行和注释
    if (!line || line.startsWith(";")) continue

    // 检测段落
    if (line.startsWith("[") && line.endsWith("]")) {
      currentSection = line.slice(1, -1)
      continue
    }

    // 解析脚本信息
    if (currentSection === "Script Info") {
      const colonIndex = line.indexOf(":")
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim()
        const value = line.slice(colonIndex + 1).trim()
        result.info[key] = value
      }
    }

    // 解析对话
    if (currentSection === "Events" && line.startsWith("Dialogue:")) {
      const dialogue = parseDialogueLine(line)
      if (dialogue) {
        result.dialogues.push(dialogue)
      }
    }
  }

  return result
}

/**
 * 生成稳定的字幕ID
 * 基于时间和文本内容生成确定性的ID，确保同一字幕始终有相同的ID
 */
function generateStableSubtitleId(startTime: string, endTime: string, text: string): string {
  // 创建一个基于内容的简单哈希
  const content = `${startTime}-${endTime}-${text}`
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 转换为32位整数
  }
  
  // 转换为正数并生成短字符串
  const hashStr = Math.abs(hash).toString(36)
  return `${startTime}-${endTime}-${hashStr}`
}

/**
 * 解析单行对话
 */
function parseDialogueLine(line: string): SubtitleLine | null {
  // Dialogue: Layer, Start, End, Style, Actor, MarginL, MarginR, MarginV, Effect, Text
  const parts = line.replace("Dialogue: ", "").split(",")

  if (parts.length < 10) return null

  const startTime = parts[1].trim()
  const endTime = parts[2].trim()
  const style = parts[3].trim()
  const actor = parts[4].trim()

  // 文本部分可能包含逗号，所以需要特殊处理
  const text = parts.slice(9).join(",").trim()

  // 过滤歌词行：检查style是否为歌词相关
  if (isLyricsStyle(style)) {
    return null
  }

  // 清理文本中的ASS格式标签
  const cleanText = cleanAssText(text)

  if (!cleanText) return null

  // 额外检查：如果文本内容看起来像歌词，也过滤掉
  if (isLyricsContent(cleanText, startTime)) {
    return null
  }

  return {
    id: generateStableSubtitleId(startTime, endTime, cleanText),
    startTime,
    endTime,
    text: cleanText,
    style,
    actor,
  }
}

/**
 * 判断style是否为歌词相关
 */
function isLyricsStyle(style: string): boolean {
  const lyricsStyles = [
    'OPJ',     // 片头曲日文
    'OPC',     // 片头曲中文
    'EDJ',     // 片尾曲日文
    'EDJ2',    // 片尾曲日文2
    'EDC',     // 片尾曲中文
    'OP',      // 片头曲
    'ED',      // 片尾曲
    'SONG',    // 歌曲
    'MUSIC',   // 音乐
    'LYRIC',   // 歌词
    'LYRICS',  // 歌词
  ]
  
  // 检查完全匹配
  if (lyricsStyles.includes(style.toUpperCase())) {
    return true
  }
  
  // 检查包含关系（不区分大小写）
  const upperStyle = style.toUpperCase()
  return lyricsStyles.some(lyricStyle => 
    upperStyle.includes(lyricStyle) || lyricStyle.includes(upperStyle)
  )
}

/**
 * 判断文本内容是否像歌词
 */
function isLyricsContent(text: string, startTime: string): boolean {
  // 转换时间为秒数
  const timeInSeconds = timeToSeconds(startTime)
  
  // OP时间段 (通常在开头1-3分钟)
  const isInOPTime = timeInSeconds >= 30 && timeInSeconds <= 180
  
  // ED时间段 (通常在结尾，假设节目长度20-25分钟)
  const isInEDTime = timeInSeconds >= 1200 // 20分钟后
  
  // 如果在OP/ED时间段内，检查文本特征
  if (isInOPTime || isInEDTime) {
    // 歌词特征检查
    const lyricsPatterns = [
      /^[A-Za-z\s]+$/, // 纯英文（很多日本动画OP/ED有英文歌词）
      /[♪♫♬♩]/, // 音符符号
      /^\s*[A-Z][a-z\s]*$/, // 首字母大写的英文短语
      /\b(la\s+la|na\s+na|oh\s+oh|yeah|wow)\b/i, // 常见的歌词感叹词
    ]
    
    return lyricsPatterns.some(pattern => pattern.test(text))
  }
  
  return false
}

/**
 * 清理ASS格式标签
 */
function cleanAssText(text: string): string {
  return (
    text
      // 移除ASS格式标签 {\xxx}
      .replace(/\{[^}]*\}/g, "")
      // 移除空的格式标签
      .replace(/\\[rn]/g, "")
      // 清理多余的空格
      .replace(/\s+/g, " ")
      .trim()
  )
}

/**
 * 时间字符串转换为秒数
 */
export function timeToSeconds(timeStr: string): number {
  const parts = timeStr.split(":")
  if (parts.length !== 3) return 0

  const hours = parseInt(parts[0])
  const minutes = parseInt(parts[1])
  const seconds = parseFloat(parts[2])

  return hours * 3600 + minutes * 60 + seconds
}

/**
 * 秒数转换为时间字符串
 */
export function secondsToTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = (seconds % 60).toFixed(2)

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.padStart(5, "0")}`
}
