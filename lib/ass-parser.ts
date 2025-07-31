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

  // 清理文本中的ASS格式标签
  const cleanText = cleanAssText(text)

  if (!cleanText) return null

  return {
    id: `${startTime}-${endTime}-${Math.random().toString(36).substr(2, 9)}`,
    startTime,
    endTime,
    text: cleanText,
    style,
    actor,
  }
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
