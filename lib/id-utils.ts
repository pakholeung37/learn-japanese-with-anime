/**
 * ID 序列化和反序列化工具
 * 解决 URL 编码不一致导致的 episodeId 匹配问题
 */

/**
 * 规范化 episodeId - 确保一致的编码格式
 * @param episodeId 原始的 episodeId
 * @returns 规范化后的 episodeId
 */
export function normalizeEpisodeId(episodeId: string): string {
  // 先完全解码，然后重新编码，确保一致性
  let decoded = episodeId
  
  // 多次解码直到不再变化（处理多重编码的情况）
  let prevDecoded = ''
  while (decoded !== prevDecoded) {
    prevDecoded = decoded
    try {
      decoded = decodeURIComponent(decoded)
    } catch {
      // 如果解码失败，停止解码
      break
    }
  }
  
  // 重新编码，确保一致的格式
  return encodeURIComponent(decoded)
}

/**
 * 创建翻译存储键
 * @param episodeId 剧集ID
 * @param subtitleId 字幕ID
 * @returns 存储键
 */
export function createTranslationKey(episodeId: string, subtitleId: string): string {
  const normalizedEpisodeId = normalizeEpisodeId(episodeId)
  return `translation:${normalizedEpisodeId}:${subtitleId}`
}

/**
 * 创建翻译查询模式
 * @param episodeId 剧集ID
 * @returns 查询模式
 */
export function createTranslationPattern(episodeId: string): string {
  const normalizedEpisodeId = normalizeEpisodeId(episodeId)
  return `translation:${normalizedEpisodeId}:*`
}

/**
 * 从存储键中提取 episodeId 和 subtitleId
 * @param key 存储键
 * @returns 提取的ID信息
 */
export function parseTranslationKey(key: string): { episodeId: string; subtitleId: string } | null {
  const match = key.match(/^translation:(.+):(.+)$/)
  if (!match) return null
  
  return {
    episodeId: match[1],
    subtitleId: match[2]
  }
}

/**
 * 比较两个 episodeId 是否相等（考虑编码差异）
 * @param id1 第一个ID
 * @param id2 第二个ID
 * @returns 是否相等
 */
export function compareEpisodeIds(id1: string, id2: string): boolean {
  return normalizeEpisodeId(id1) === normalizeEpisodeId(id2)
}
