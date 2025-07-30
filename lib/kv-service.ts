import { kv } from '@vercel/kv';
import { Translation, UserProgress } from '@/types/anime';

/**
 * 保存用户翻译
 */
export async function saveTranslation(translation: Translation): Promise<void> {
  const key = `translation:${translation.episodeId}:${translation.subtitleId}`;
  await kv.set(key, translation);
}

/**
 * 获取用户翻译
 */
export async function getTranslation(episodeId: string, subtitleId: string): Promise<Translation | null> {
  const key = `translation:${episodeId}:${subtitleId}`;
  return await kv.get(key);
}

/**
 * 获取剧集的所有翻译
 */
export async function getEpisodeTranslations(episodeId: string): Promise<Translation[]> {
  const pattern = `translation:${episodeId}:*`;
  const keys = await kv.keys(pattern);
  
  if (keys.length === 0) return [];
  
  const translations = await kv.mget(...keys);
  return translations.filter(Boolean) as Translation[];
}

/**
 * 删除翻译
 */
export async function deleteTranslation(episodeId: string, subtitleId: string): Promise<void> {
  const key = `translation:${episodeId}:${subtitleId}`;
  await kv.del(key);
}

/**
 * 保存用户学习进度
 */
export async function saveUserProgress(progress: UserProgress): Promise<void> {
  const key = `progress:${progress.userId}:${progress.episodeId}`;
  await kv.set(key, progress);
}

/**
 * 获取用户学习进度
 */
export async function getUserProgress(userId: string, episodeId: string): Promise<UserProgress | null> {
  const key = `progress:${userId}:${episodeId}`;
  return await kv.get(key);
}

/**
 * 获取用户所有学习进度
 */
export async function getAllUserProgress(userId: string): Promise<UserProgress[]> {
  const pattern = `progress:${userId}:*`;
  const keys = await kv.keys(pattern);
  
  if (keys.length === 0) return [];
  
  const progressList = await kv.mget(...keys);
  return progressList.filter(Boolean) as UserProgress[];
}

/**
 * 更新学习进度中的完成字幕
 */
export async function markSubtitleCompleted(
  userId: string, 
  episodeId: string, 
  subtitleId: string
): Promise<void> {
  const progress = await getUserProgress(userId, episodeId) || {
    userId,
    episodeId,
    completedSubtitles: [],
    lastPosition: 0,
    updatedAt: Date.now()
  };
  
  if (!progress.completedSubtitles.includes(subtitleId)) {
    progress.completedSubtitles.push(subtitleId);
    progress.updatedAt = Date.now();
    await saveUserProgress(progress);
  }
}

/**
 * 获取学习统计信息
 */
export async function getStudyStats(userId: string): Promise<{
  totalEpisodes: number;
  completedSubtitles: number;
  totalTranslations: number;
}> {
  const allProgress = await getAllUserProgress(userId);
  const translationKeys = await kv.keys('translation:*');
  
  const totalEpisodes = allProgress.length;
  const completedSubtitles = allProgress.reduce(
    (sum, progress) => sum + progress.completedSubtitles.length, 
    0
  );
  const totalTranslations = translationKeys.length;
  
  return {
    totalEpisodes,
    completedSubtitles,
    totalTranslations
  };
}
