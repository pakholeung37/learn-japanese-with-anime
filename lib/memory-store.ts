import { Translation, UserProgress } from "@/types/anime"

// 内存存储
class MemoryStore {
  private translations = new Map<string, Translation>()
  private userProgress = new Map<string, UserProgress>()

  // 翻译相关方法
  setTranslation(key: string, translation: Translation): void {
    this.translations.set(key, translation)
  }

  getTranslation(key: string): Translation | null {
    return this.translations.get(key) || null
  }

  getTranslationsByPattern(pattern: string): Translation[] {
    const results: Translation[] = []
    const regex = new RegExp(pattern.replace("*", ".*"))

    for (const [key, value] of this.translations.entries()) {
      if (regex.test(key)) {
        results.push(value)
      }
    }

    return results
  }

  deleteTranslation(key: string): void {
    this.translations.delete(key)
  }

  getTranslationKeys(_pattern: string): string[] {
    const keys: string[] = []
    const pattern = _pattern.replace("*", "")

    for (const key of this.translations.keys()) {
      if (key.startsWith(pattern)) {
        keys.push(key)
      }
    }

    return keys
  }

  // 用户进度相关方法
  setUserProgress(key: string, progress: UserProgress): void {
    this.userProgress.set(key, progress)
  }

  getUserProgress(key: string): UserProgress | null {
    return this.userProgress.get(key) || null
  }

  getUserProgressByPattern(pattern: string): UserProgress[] {
    const results: UserProgress[] = []
    const regex = new RegExp(pattern.replace("*", ".*"))

    for (const [key, value] of this.userProgress.entries()) {
      if (regex.test(key)) {
        results.push(value)
      }
    }

    return results
  }

  getUserProgressKeys(pattern: string): string[] {
    const keys: string[] = []
    const regex = new RegExp(pattern.replace("*", ".*"))

    for (const key of this.userProgress.keys()) {
      if (regex.test(key)) {
        keys.push(key)
      }
    }

    return keys
  }

  // 清空所有数据
  clear(): void {
    this.translations.clear()
    this.userProgress.clear()
  }

  // 获取统计信息
  getStats(): {
    translationsCount: number
    progressCount: number
    translations: Translation[]
    progress: UserProgress[]
  } {
    return {
      translationsCount: this.translations.size,
      translations: Array.from(this.translations.values()),
      progressCount: this.userProgress.size,
      progress: Array.from(this.userProgress.values()),
    }
  }
}

// 单例实例
const memoryStore = new MemoryStore()

// 模拟Vercel KV的接口
export const mockKV = {
  async set(key: string, value: Translation | UserProgress): Promise<void> {
    if ("originalText" in value) {
      // 是Translation类型
      memoryStore.setTranslation(key, value as Translation)
    } else {
      // 是UserProgress类型
      memoryStore.setUserProgress(key, value as UserProgress)
    }
  },

  async get(key: string): Promise<Translation | UserProgress | null> {
    // 先尝试获取翻译
    const translation = memoryStore.getTranslation(key)
    if (translation) return translation

    // 再尝试获取用户进度
    const progress = memoryStore.getUserProgress(key)
    if (progress) return progress

    return null
  },

  async mget(
    ...keys: string[]
  ): Promise<(Translation | UserProgress | null)[]> {
    return keys.map((key) => {
      const translation = memoryStore.getTranslation(key)
      if (translation) return translation

      const progress = memoryStore.getUserProgress(key)
      if (progress) return progress

      return null
    })
  },

  async del(key: string): Promise<void> {
    memoryStore.deleteTranslation(key)
  },

  async keys(pattern: string): Promise<string[]> {
    const translationKeys = memoryStore.getTranslationKeys(pattern)
    const progressKeys = memoryStore.getUserProgressKeys(pattern)
    return [...translationKeys, ...progressKeys]
  },
}

export default memoryStore
