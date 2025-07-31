import { Translation, UserProgress } from "@/types/anime"
import { 
  createTranslationKey, 
  createTranslationPattern, 
  normalizeEpisodeId 
} from "./id-utils"

// 动态导入存储服务
async function getKVClient() {
  // 检查是否在生产环境且有KV配置
  const isProduction = process.env.NODE_ENV === "production"
  const hasKVConfig =
    process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN

  if (isProduction && hasKVConfig) {
    // 生产环境使用Vercel KV
    const { kv } = await import("@vercel/kv")
    return kv
  } else {
    // 开发环境使用内存存储
    const { mockKV } = await import("./memory-store")
    return mockKV
  }
}

/**
 * 保存用户翻译
 */
export async function saveTranslation(translation: Translation): Promise<void> {
  const kv = await getKVClient()
  const key = createTranslationKey(translation.episodeId, translation.subtitleId)
  console.log("Saving translation with key:", key)
  console.log("Original episodeId:", translation.episodeId)
  console.log("Normalized episodeId:", normalizeEpisodeId(translation.episodeId))
  console.log("Translation data:", translation)
  await kv.set(key, translation)
}

/**
 * 获取用户翻译
 */
export async function getTranslation(
  episodeId: string,
  subtitleId: string,
): Promise<Translation | null> {
  const kv = await getKVClient()
  const key = createTranslationKey(episodeId, subtitleId)
  return (await kv.get(key)) as Translation | null
}

/**
 * 获取剧集的所有翻译
 */
export async function getEpisodeTranslations(
  episodeId: string,
): Promise<Translation[]> {
  const kv = await getKVClient()
  const pattern = createTranslationPattern(episodeId)
  console.log("Looking for translations with pattern:", pattern)
  console.log("Original episodeId:", episodeId)
  console.log("Normalized episodeId:", normalizeEpisodeId(episodeId))
  const keys = await kv.keys(pattern)
  console.log("Found keys:", keys)

  if (keys.length === 0) return []

  const translations = await kv.mget(...keys)
  const validTranslations = translations.filter(Boolean) as Translation[]
  console.log("Valid translations found:", validTranslations.length)
  return validTranslations
}

/**
 * 删除翻译
 */
export async function deleteTranslation(
  episodeId: string,
  subtitleId: string,
): Promise<void> {
  const kv = await getKVClient()
  const key = createTranslationKey(episodeId, subtitleId)
  await kv.del(key)
}

/**
 * 保存用户学习进度
 */
export async function saveUserProgress(progress: UserProgress): Promise<void> {
  const kv = await getKVClient()
  const key = `progress:${progress.userId}:${progress.episodeId}`
  await kv.set(key, progress)
}

/**
 * 获取用户学习进度
 */
export async function getUserProgress(
  userId: string,
  episodeId: string,
): Promise<UserProgress | null> {
  const kv = await getKVClient()
  const key = `progress:${userId}:${episodeId}`
  return (await kv.get(key)) as UserProgress | null
}

/**
 * 获取用户所有学习进度
 */
export async function getAllUserProgress(
  userId: string,
): Promise<UserProgress[]> {
  const kv = await getKVClient()
  const pattern = `progress:${userId}:*`
  const keys = await kv.keys(pattern)

  if (keys.length === 0) return []

  const progressList = await kv.mget(...keys)
  return progressList.filter(Boolean) as UserProgress[]
}

/**
 * 更新学习进度中的完成字幕
 */
export async function markSubtitleCompleted(
  userId: string,
  episodeId: string,
  subtitleId: string,
): Promise<void> {
  const progress = (await getUserProgress(userId, episodeId)) || {
    userId,
    episodeId,
    completedSubtitles: [],
    lastPosition: 0,
    updatedAt: Date.now(),
  }

  if (!progress.completedSubtitles.includes(subtitleId)) {
    progress.completedSubtitles.push(subtitleId)
    progress.updatedAt = Date.now()
    await saveUserProgress(progress)
  }
}

/**
 * 获取学习统计信息
 */
export async function getStudyStats(userId: string): Promise<{
  totalEpisodes: number
  completedSubtitles: number
  totalTranslations: number
}> {
  const kv = await getKVClient()
  const allProgress = await getAllUserProgress(userId)
  const translationKeys = await kv.keys("translation:*")

  const totalEpisodes = allProgress.length
  const completedSubtitles = allProgress.reduce(
    (sum, progress) => sum + progress.completedSubtitles.length,
    0,
  )
  const totalTranslations = translationKeys.length

  return {
    totalEpisodes,
    completedSubtitles,
    totalTranslations,
  }
}
