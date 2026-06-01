import path from "path"
import kuromoji from "kuromoji"

let tokenizer: any = null
let initPromise: Promise<any> | null = null

/**
 * 获取或加载 kuromoji 分词器单例
 */
export function getTokenizer(): Promise<any> {
  if (tokenizer) return Promise.resolve(tokenizer)
  if (initPromise) return initPromise

  const dicPath = path.join(process.cwd(), "node_modules/kuromoji/dict")
  console.log("正在加载 kuromoji 日语词典：", dicPath)

  initPromise = new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath }).build((err, tor) => {
      if (err) {
        console.error("加载 kuromoji 分词器失败：", err)
        initPromise = null
        return reject(err)
      }
      tokenizer = tor
      console.log("kuromoji 分词器加载成功！")
      resolve(tokenizer)
    })
  })

  return initPromise
}

export interface FuriganaToken {
  text: string
  reading?: string
  isKanji: boolean
}

/**
 * 将片假名（Katakana）转换为平假名（Hiragana）
 */
function katakanaToHiragana(katakana: string): string {
  return katakana.replace(/[\u30a1-\u30f6]/g, (match) => {
    const chr = match.charCodeAt(0) - 0x60
    return String.fromCharCode(chr)
  })
}

/**
 * 双向对齐算法：将混合汉字与假名的 surface 形式与纯假名 reading 进行精准对齐。
 * 例如：surface="振り返っ", reading="ふりかえっ"
 * 对齐后得到：
 * [
 *   { text: "振", reading: "ふ", isKanji: true },
 *   { text: "り", isKanji: false },
 *   { text: "返", reading: "かえ", isKanji: true },
 *   { text: "っ", isKanji: false }
 * ]
 */
function alignFurigana(surface: string, reading: string): FuriganaToken[] | null {
  const isKanjiChar = (char: string) => /[\u4e00-\u9faf]/.test(char)

  function match(sIdx: number, rIdx: number): FuriganaToken[] | null {
    if (sIdx === surface.length && rIdx === reading.length) {
      return []
    }
    if (sIdx === surface.length || rIdx === reading.length) {
      return null
    }

    const sChar = surface[sIdx]
    const rChar = reading[rIdx]

    // 非汉字字符（如送假名）必须完全匹配（需将 sChar 转为平假名后与 rChar 对照，支持片假名/平假名）
    if (!isKanjiChar(sChar)) {
      if (katakanaToHiragana(sChar) === rChar) {
        const rest = match(sIdx + 1, rIdx + 1)
        if (rest !== null) {
          return [{ text: sChar, isKanji: false }, ...rest]
        }
      }
      return null
    }

    // 汉字，提取连续的汉字片段
    let sEnd = sIdx
    while (sEnd < surface.length && isKanjiChar(surface[sEnd])) {
      sEnd++
    }
    const kanjiStr = surface.substring(sIdx, sEnd)

    const maxRLen = reading.length - rIdx
    for (let rLen = 1; rLen <= maxRLen; rLen++) {
      const readingPart = reading.substring(rIdx, rIdx + rLen)
      const rest = match(sEnd, rIdx + rLen)
      if (rest !== null) {
        return [
          { text: kanjiStr, reading: readingPart, isKanji: true },
          ...rest
        ]
      }
    }

    return null
  }

  return match(0, 0)
}

/**
 * 将日语整句切分为带平假名注音的 Token 数组
 */
export async function parseToFurigana(text: string): Promise<FuriganaToken[]> {
  // 如果是空字符串或无文字直接返回
  if (!text || !text.trim()) {
    return [{ text: text || "", isKanji: false }]
  }

  try {
    const tor = await getTokenizer()
    const rawTokens = tor.tokenize(text)
    
    const tokens: FuriganaToken[] = []
    for (const token of rawTokens) {
      const surface = token.surface_form
      const isKanji = /[\u4e00-\u9faf]/.test(surface)
      
      if (isKanji && token.reading && token.reading !== "*") {
        const reading = katakanaToHiragana(token.reading)
        const aligned = alignFurigana(surface, reading)
        if (aligned) {
          tokens.push(...aligned)
        } else {
          tokens.push({
            text: surface,
            reading,
            isKanji: true,
          })
        }
      } else {
        tokens.push({
          text: surface,
          isKanji: false,
        })
      }
    }
    return tokens
  } catch (error) {
    console.error("Furigana 解析失败，降级回退至原始文本：", error)
    // 降级退回原文字符串作为一个 Token
    return [{ text, isKanji: false }]
  }
}

