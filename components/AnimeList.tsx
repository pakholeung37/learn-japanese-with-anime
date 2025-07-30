"use client";

import { useState, useEffect } from "react";
import { AnimeInfo } from "@/types/anime";
import { Play, BookOpen, Clock } from "lucide-react";
import Link from "next/link";

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
      const response = await fetch("/api/anime");
      if (!response.ok) {
        throw new Error("获取动画列表失败");
      }
      const data = await response.json();
      setAnimeList(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600 dark:text-gray-400">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg text-red-600 dark:text-red-400 mb-4">{error}</div>
          <button
            onClick={fetchAnimeList}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* 动画列表 */}
      <div className="space-y-6">
        {animeList.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              暂无动画资源
            </h3>
            <p className="text-gray-600 dark:text-gray-400">请在 app/res 目录下添加ASS字幕文件</p>
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {anime.title}
        </h3>
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Play className="w-4 h-4 mr-1" />
          <span>{anime.episodes.length} 集</span>
        </div>

        <div className="space-y-2 mb-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">剧集列表：</h4>
          <div className="max-h-32 overflow-y-auto">
            {anime.episodes.map((episode) => (
              <Link
                key={episode.id}
                href={`/episode/${episode.id}`}
                className="block p-2 rounded text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                第{episode.number}集{episode.title && ` - ${episode.title}`}
              </Link>
            ))}
          </div>
        </div>

        {/* <Link
          href={`/anime/${anime.id}`}
          className="inline-flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
        >
          <BookOpen className="w-4 h-4 mr-2" />
          开始学习
        </Link> */}
      </div>
    </div>
  );
}
