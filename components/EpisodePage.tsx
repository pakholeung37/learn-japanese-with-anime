'use client';

import { useState, useEffect } from 'react';
import { SubtitleLine } from '@/lib/ass-parser';
import { Translation } from '@/types/anime';
import SubtitleRow from '@/components/SubtitleRow';
import { ArrowLeft, Play, Pause, RotateCcw } from 'lucide-react';
import Link from 'next/link';

interface EpisodePageProps {
  episodeId: string;
  animeTitle?: string;
  episodeNumber?: number;
}

interface EpisodeData {
  episode: string;
  subtitles: SubtitleLine[];
  translations: Translation[];
}

export default function EpisodePage({ episodeId, animeTitle, episodeNumber }: EpisodePageProps) {
  const [data, setData] = useState<EpisodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'completed' | 'incomplete'>('all');
  const [currentPosition, setCurrentPosition] = useState(0);

  useEffect(() => {
    fetchEpisodeData();
  }, [episodeId]);

  const fetchEpisodeData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/episodes/${episodeId}`);
      if (!response.ok) {
        throw new Error('获取剧集数据失败');
      }
      const episodeData = await response.json();
      setData(episodeData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTranslation = async (subtitleId: string, translatedText: string) => {
    if (!data) return;

    try {
      const subtitle = data.subtitles.find(s => s.id === subtitleId);
      if (!subtitle) return;

      const response = await fetch('/api/translations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          episodeId,
          subtitleId,
          originalText: subtitle.text,
          translatedText,
        }),
      });

      if (!response.ok) {
        throw new Error('保存翻译失败');
      }

      const result = await response.json();
      
      // 更新本地状态
      setData(prev => {
        if (!prev) return prev;
        
        const existingIndex = prev.translations.findIndex(t => t.subtitleId === subtitleId);
        const newTranslations = [...prev.translations];
        
        if (existingIndex >= 0) {
          newTranslations[existingIndex] = result.translation;
        } else {
          newTranslations.push(result.translation);
        }
        
        return {
          ...prev,
          translations: newTranslations
        };
      });
    } catch (error) {
      console.error('保存翻译失败:', error);
      throw error;
    }
  };

  const handleDeleteTranslation = async (subtitleId: string) => {
    try {
      const response = await fetch('/api/translations', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          episodeId,
          subtitleId,
        }),
      });

      if (!response.ok) {
        throw new Error('删除翻译失败');
      }

      // 更新本地状态
      setData(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          translations: prev.translations.filter(t => t.subtitleId !== subtitleId)
        };
      });
    } catch (error) {
      console.error('删除翻译失败:', error);
      throw error;
    }
  };

  const getFilteredSubtitles = () => {
    if (!data) return [];
    
    const { subtitles, translations } = data;
    const translationMap = new Map(translations.map(t => [t.subtitleId, t]));
    
    switch (filter) {
      case 'completed':
        return subtitles.filter(s => translationMap.has(s.id));
      case 'incomplete':
        return subtitles.filter(s => !translationMap.has(s.id));
      default:
        return subtitles;
    }
  };

  const getStats = () => {
    if (!data) return { total: 0, completed: 0 };
    
    const total = data.subtitles.length;
    const completed = data.translations.length;
    
    return { total, completed };
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
            onClick={fetchEpisodeData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  const filteredSubtitles = getFilteredSubtitles();
  const stats = getStats();
  const progress = stats.total > 0 ? (stats.completed / stats.total * 100).toFixed(1) : '0';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5 mr-1" />
                返回
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {animeTitle} - 第{episodeNumber}集
                </h1>
                <div className="text-sm text-gray-600">
                  进度：{stats.completed}/{stats.total} ({progress}%)
                </div>
              </div>
            </div>
            
            {/* 进度条 */}
            <div className="w-32">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 过滤器 */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex space-x-2">
          {[
            { key: 'all', label: `全部 (${stats.total})` },
            { key: 'completed', label: `已翻译 (${stats.completed})` },
            { key: 'incomplete', label: `未翻译 (${stats.total - stats.completed})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as any)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 字幕列表 */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        {filteredSubtitles.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            没有找到字幕数据
          </div>
        ) : (
          <div className="space-y-1">
            {filteredSubtitles.map((subtitle) => {
              const translation = data?.translations.find(t => t.subtitleId === subtitle.id);
              return (
                <SubtitleRow
                  key={subtitle.id}
                  subtitle={subtitle}
                  translation={translation}
                  episodeId={episodeId}
                  onSave={handleSaveTranslation}
                  onDelete={handleDeleteTranslation}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
