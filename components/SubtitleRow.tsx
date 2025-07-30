'use client';

import { useState, useEffect } from 'react';
import { SubtitleLine } from '@/lib/ass-parser';
import { Translation } from '@/types/anime';
import { Save, Trash2, Clock } from 'lucide-react';

interface SubtitleRowProps {
  subtitle: SubtitleLine;
  translation?: Translation;
  episodeId: string;
  onSave: (subtitleId: string, translatedText: string) => Promise<void>;
  onDelete: (subtitleId: string) => Promise<void>;
}

export default function SubtitleRow({ 
  subtitle, 
  translation, 
  episodeId, 
  onSave, 
  onDelete 
}: SubtitleRowProps) {
  const [translatedText, setTranslatedText] = useState(translation?.translatedText || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setTranslatedText(translation?.translatedText || '');
  }, [translation]);

  const handleSave = async () => {
    if (!translatedText.trim()) return;
    
    setIsSaving(true);
    try {
      await onSave(subtitle.id, translatedText);
      setIsEditing(false);
    } catch (error) {
      console.error('保存翻译失败:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!translation) return;
    
    try {
      await onDelete(subtitle.id);
      setTranslatedText('');
    } catch (error) {
      console.error('删除翻译失败:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSave();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setTranslatedText(translation?.translatedText || '');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 shadow-sm hover:shadow-md transition-shadow">
      {/* 时间戳 */}
      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-2">
        <Clock className="w-4 h-4 mr-1" />
        <span>{subtitle.startTime} → {subtitle.endTime}</span>
        {subtitle.style && (
          <span className="ml-4 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs">
            {subtitle.style}
          </span>
        )}
      </div>

      {/* 原文 */}
      <div className="mb-3">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">原文：</div>
        <div className="text-lg text-gray-900 dark:text-white leading-relaxed bg-gray-50 dark:bg-gray-700 p-3 rounded">
          {subtitle.text}
        </div>
      </div>

      {/* 翻译 */}
      <div className="mb-3">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">翻译：</div>
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={translatedText}
              onChange={(e) => setTranslatedText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入您的翻译..."
              className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder-gray-500 dark:placeholder-gray-400"
              rows={3}
              autoFocus
            />
            <div className="flex space-x-2">
              <button
                onClick={handleSave}
                disabled={isSaving || !translatedText.trim()}
                className="flex items-center px-3 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <Save className="w-4 h-4 mr-1" />
                {isSaving ? '保存中...' : '保存'}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setTranslatedText(translation?.translatedText || '');
                }}
                className="px-3 py-2 bg-gray-600 dark:bg-gray-500 text-white rounded-md hover:bg-gray-700 dark:hover:bg-gray-400 text-sm"
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className={`p-3 rounded-md cursor-text transition-colors ${
              translatedText
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-gray-900 dark:text-white'
                : 'bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-150 dark:hover:bg-gray-600'
            }`}
          >
            {translatedText || '点击添加翻译...'}
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      {translation && !isEditing && (
        <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
          <span>
            已保存 {new Date(translation.timestamp).toLocaleString()}
          </span>
          <button
            onClick={handleDelete}
            className="flex items-center text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            删除
          </button>
        </div>
      )}
    </div>
  );
}
