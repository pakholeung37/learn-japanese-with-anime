import { NextRequest, NextResponse } from 'next/server';
import { scanSubtitles } from '@/lib/subtitle-scanner';

export async function GET() {
  try {
    const animeList = await scanSubtitles();
    return NextResponse.json(animeList);
  } catch (error) {
    console.error('获取动画列表失败:', error);
    return NextResponse.json(
      { error: '获取动画列表失败' },
      { status: 500 }
    );
  }
}
