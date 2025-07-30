import { promises as fs } from 'fs';
import path from 'path';
import { AnimeInfo, EpisodeInfo } from '@/types/anime';

const SUBTITLES_DIR = path.join(process.cwd(), 'app/res');

/**
 * 扫描字幕目录，获取所有动画和剧集信息
 */
export async function scanSubtitles(): Promise<AnimeInfo[]> {
  try {
    const animeList: AnimeInfo[] = [];
    const animeDirs = await fs.readdir(SUBTITLES_DIR);
    
    for (const animeDir of animeDirs) {
      const animePath = path.join(SUBTITLES_DIR, animeDir);
      const stat = await fs.stat(animePath);
      
      if (!stat.isDirectory()) continue;
      
      const episodes = await scanEpisodes(animePath, animeDir);
      
      if (episodes.length > 0) {
        animeList.push({
          id: generateAnimeId(animeDir),
          title: cleanAnimeName(animeDir),
          episodes
        });
      }
    }
    
    return animeList.sort((a, b) => a.title.localeCompare(b.title));
  } catch (error) {
    console.error('扫描字幕文件失败:', error);
    return [];
  }
}

/**
 * 扫描单个动画目录下的剧集
 */
async function scanEpisodes(animePath: string, animeDir: string): Promise<EpisodeInfo[]> {
  const episodes: EpisodeInfo[] = [];
  const files = await fs.readdir(animePath);
  
  // 过滤出日语字幕文件
  const subtitleFiles = files.filter(file => 
    file.endsWith('.JP.ass') || file.endsWith('.jp.ass')
  );
  
  for (const file of subtitleFiles) {
    const episodeNumber = extractEpisodeNumber(file);
    if (episodeNumber !== null) {
      episodes.push({
        id: generateEpisodeId(animeDir, episodeNumber),
        number: episodeNumber,
        subtitlePath: path.join(animePath, file),
        animeId: generateAnimeId(animeDir)
      });
    }
  }
  
  return episodes.sort((a, b) => a.number - b.number);
}

/**
 * 从文件名中提取剧集编号
 */
function extractEpisodeNumber(filename: string): number | null {
  // 匹配类似 [01], [02] 的模式
  const match = filename.match(/\[(\d+)\]/);
  if (match) {
    return parseInt(match[1], 10);
  }
  
  // 匹配 EP01, EP02 等模式
  const epMatch = filename.match(/EP(\d+)/i);
  if (epMatch) {
    return parseInt(epMatch[1], 10);
  }
  
  return null;
}

/**
 * 生成动画ID
 */
function generateAnimeId(animeDir: string): string {
  return animeDir.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
}

/**
 * 生成剧集ID
 */
function generateEpisodeId(animeDir: string, episodeNumber: number): string {
  const animeId = generateAnimeId(animeDir);
  return `${animeId}-ep${episodeNumber.toString().padStart(2, '0')}`;
}

/**
 * 清理动画名称
 */
function cleanAnimeName(dirName: string): string {
  // 移除常见的发布组标签
  return dirName
    .replace(/^\[.*?\]/, '') // 移除开头的方括号
    .replace(/\[.*?\]$/, '') // 移除结尾的方括号
    .trim();
}

/**
 * 根据episodeId获取字幕文件路径
 */
export async function getSubtitlePathByEpisodeId(episodeId: string): Promise<string | null> {
  try {
    const animeList = await scanSubtitles();
    
    for (const anime of animeList) {
      const episode = anime.episodes.find(ep => ep.id === episodeId);
      if (episode) {
        return episode.subtitlePath;
      }
    }
    
    return null;
  } catch (error) {
    console.error('获取字幕文件路径失败:', error);
    return null;
  }
}

/**
 * 根据episodeId获取剧集信息
 */
export async function getEpisodeInfo(episodeId: string): Promise<{ episode: EpisodeInfo; anime: AnimeInfo } | null> {
  try {
    const animeList = await scanSubtitles();
    
    for (const anime of animeList) {
      const episode = anime.episodes.find(ep => ep.id === episodeId);
      if (episode) {
        return { episode, anime };
      }
    }
    
    return null;
  } catch (error) {
    console.error('获取剧集信息失败:', error);
    return null;
  }
}

/**
 * 读取字幕文件内容
 */
export async function readSubtitleFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    console.error('读取字幕文件失败:', error);
    return '';
  }
}
