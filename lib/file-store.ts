import fs from "fs/promises"
import path from "path"
import { Translation, UserProgress } from "@/types/anime"

const DB_DIR = path.join(process.cwd(), "data")
const DB_FILE = path.join(DB_DIR, "db.json")

interface DiskDB {
  translations?: Record<string, Record<string, string>>
  progress?: Record<string, Record<string, { completed: string[]; pos: number; time: number }>>
}

let cache: Record<string, any> | null = null
let isInitialized = false
let writePromise: Promise<void> = Promise.resolve()

// Convert from disk format to memory cache format
function deserialize(disk: DiskDB): Record<string, any> {
  const mem: Record<string, any> = {}
  
  if (disk.translations) {
    for (const [episodeId, subs] of Object.entries(disk.translations)) {
      for (const [subtitleId, translatedText] of Object.entries(subs)) {
        const key = `translation:${episodeId}:${subtitleId}`
        mem[key] = {
          id: `${episodeId}-${subtitleId}`,
          episodeId,
          subtitleId,
          originalText: "", // We can look this up from the subtitle file, so we do not store it
          translatedText,
          timestamp: Date.now(),
        }
      }
    }
  }
  
  if (disk.progress) {
    for (const [userId, episodes] of Object.entries(disk.progress)) {
      for (const [episodeId, p] of Object.entries(episodes)) {
        const key = `progress:${userId}:${episodeId}`
        mem[key] = {
          userId,
          episodeId,
          completedSubtitles: p.completed || [],
          lastPosition: p.pos || 0,
          updatedAt: p.time || Date.now(),
        }
      }
    }
  }
  
  return mem
}

// Convert from memory cache format to disk format
function serialize(mem: Record<string, any>): DiskDB {
  const disk: DiskDB = {
    translations: {},
    progress: {},
  }
  
  for (const [key, value] of Object.entries(mem)) {
    if (key.startsWith("translation:")) {
      const parts = key.split(":")
      const episodeId = parts[1]
      const subtitleId = parts.slice(2).join(":")
      
      disk.translations![episodeId] = disk.translations![episodeId] || {}
      disk.translations![episodeId][subtitleId] = value.translatedText
    } else if (key.startsWith("progress:")) {
      const parts = key.split(":")
      const userId = parts[1]
      const episodeId = parts.slice(2).join(":")
      
      disk.progress![userId] = disk.progress![userId] || {}
      disk.progress![userId][episodeId] = {
        completed: value.completedSubtitles || [],
        pos: value.lastPosition || 0,
        time: value.updatedAt || Date.now(),
      }
    }
  }
  
  return disk
}

async function init() {
  if (isInitialized) return
  try {
    await fs.mkdir(DB_DIR, { recursive: true })
    try {
      const data = await fs.readFile(DB_FILE, "utf-8")
      const disk = JSON.parse(data)
      cache = deserialize(disk)
    } catch (e) {
      cache = {}
      await save()
    }
  } catch (err) {
    console.error("初始化文件数据库失败:", err)
    cache = {}
  }
  isInitialized = true
}

async function save() {
  if (!cache) return
  writePromise = writePromise.then(async () => {
    try {
      const disk = serialize(cache!)
      await fs.writeFile(DB_FILE, JSON.stringify(disk, null, 2), "utf-8")
    } catch (err) {
      console.error("写入文件数据库失败:", err)
    }
  })
  await writePromise
}

// 模拟 Vercel KV 接口
export const fileKV = {
  async set(key: string, value: any): Promise<void> {
    await init()
    cache![key] = value
    await save()
  },

  async get(key: string): Promise<any | null> {
    await init()
    return cache![key] || null
  },

  async mget(...keys: string[]): Promise<(any | null)[]> {
    await init()
    return keys.map((key) => cache![key] || null)
  },

  async del(key: string): Promise<void> {
    await init()
    delete cache![key]
    await save()
  },

  async keys(pattern: string): Promise<string[]> {
    await init()
    const regexPattern = "^" + pattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, (m) => m === "*" ? ".*" : "\\" + m) + "$"
    const regex = new RegExp(regexPattern)
    return Object.keys(cache!).filter((key) => regex.test(key))
  },
}

// 适配原 memory-store 的类接口，供 dev 路由及测试使用
export const fileStore = {
  async clear(): Promise<void> {
    await init()
    cache = {}
    await save()
  },

  async getStats() {
    await init()
    const translations: Translation[] = []
    const progress: UserProgress[] = []

    for (const [key, value] of Object.entries(cache!)) {
      if (key.startsWith("translation:")) {
        translations.push(value as Translation)
      } else if (key.startsWith("progress:")) {
        progress.push(value as UserProgress)
      }
    }

    return {
      translationsCount: translations.length,
      translations,
      progressCount: progress.length,
      progress,
    }
  }
}

export default fileStore
