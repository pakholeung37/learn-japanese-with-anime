import { NextRequest, NextResponse } from 'next/server';
import { readSubtitleFile, getSubtitlePathByEpisodeId } from '@/lib/subtitle-scanner';
import { parseASS } from '@/lib/ass-parser';
import { getEpisodeTranslations } from '@/lib/kv-service';

interface RouteParams {
  params: Promise<{
    episodeId: string;
  }>;
}

export async function GET(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const { episodeId } = await context.params;
    
    const subtitlePath = await getSubtitlePathByEpisodeId(episodeId);
    
    if (!subtitlePath) {
      return NextResponse.json(
        { error: '找不到字幕文件' },
        { status: 404 }
      );
    }
    
    const content = await readSubtitleFile(subtitlePath);
    const parsed = parseASS(content);
    const translations = await getEpisodeTranslations(episodeId);
    
    return NextResponse.json({
      episode: episodeId,
      subtitles: parsed.dialogues,
      translations
    });
  } catch (error) {
    console.error('获取剧集字幕失败:', error);
    return NextResponse.json(
      { error: '获取剧集字幕失败' },
      { status: 500 }
    );
  }
}
