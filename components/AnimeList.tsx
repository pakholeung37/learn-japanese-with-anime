'use client';

import { useState, useEffect } from 'react';
import { AnimeInfo } from '@/types/anime';
import { Play, BookOpen, Clock } from 'lucide-react';
import Link from 'next/link';

export default function AnimeList() {
  const [animeList, setAnimeList] = useState<AnimeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnimeList();
  }, []);

  const fetchAnimeList = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/anime');
      if (!response.ok) {
        throw new Error('获取动画列表失败');
      }
      const data = await response.json();
      setAnimeList(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-4">{error}</div>
          <button
            onClick={fetchAnimeList}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              通过动画学习日语
            </h1>
            <p className="text-gray-600">
              选择您想要学习的动画，开始翻译字幕的日语学习之旅
            </p>
          </div>
        </div>
      </div>

      {/* 动画列表 */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {animeList.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              暂无动画资源
            </h3>
            <p className="text-gray-600">
              请在 app/res 目录下添加ASS字幕文件
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {animeList.map((anime, i) => (
              <AnimeCard key={anime.id + i} anime={anime} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface AnimeCardProps {
  anime: AnimeInfo;
}

function AnimeCard({ anime }: AnimeCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {anime.title}
        </h3>
        <div className="flex items-center text-sm text-gray-600 mb-4">
          <Play className="w-4 h-4 mr-1" />
          <span>{anime.episodes.length} 集</span>
        </div>
        
        <div className="space-y-2 mb-4">
          <h4 className="text-sm font-medium text-gray-700">剧集列表：</h4>
          <div className="max-h-32 overflow-y-auto">
            {anime.episodes.slice(0, 5).map((episode) => (
              <Link
                key={episode.id}
                href={`/episode/${episode.id}`}
                className="block p-2 rounded text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                第{episode.number}集
                {episode.title && ` - ${episode.title}`}
              </Link>
            ))}
            {anime.episodes.length > 5 && (
              <div className="text-xs text-gray-500 p-2">
                还有 {anime.episodes.length - 5} 集...
              </div>
            )}
          </div>
        </div>

        <Link
          href={`/anime/${anime.id}`}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <BookOpen className="w-4 h-4 mr-2" />
          开始学习
        </Link>
      </div>
    </div>
  );
}
