'use client';

import { useState, useEffect } from 'react';
import { Database, Trash2, RefreshCw } from 'lucide-react';

interface DevStats {
  environment: string;
  storage: string;
  stats: {
    translationsCount: number;
    progressCount: number;
  };
  note: string;
}

export default function DevTools() {
  const [stats, setStats] = useState<DevStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // 只在开发环境显示
  useEffect(() => {
    setIsVisible(typeof window !== 'undefined' && process.env.NODE_ENV === 'development');
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/dev');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('获取开发统计失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearData = async () => {
    if (!confirm('确定要清空所有内存数据吗？')) return;
    
    try {
      const response = await fetch('/api/dev', { method: 'DELETE' });
      if (response.ok) {
        await fetchStats(); // 刷新统计
        alert('数据已清空');
      }
    } catch (error) {
      console.error('清空数据失败:', error);
      alert('清空数据失败');
    }
  };

  useEffect(() => {
    if (isVisible) {
      fetchStats();
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg text-sm max-w-xs">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <Database className="w-4 h-4 mr-2" />
          <span className="font-medium">开发工具</span>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="p-1 hover:bg-gray-700 rounded"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      {stats && (
        <div className="space-y-2">
          <div className="text-xs text-gray-300">
            存储: {stats.storage} ({stats.environment})
          </div>
          <div className="text-xs">
            翻译: {stats.stats.translationsCount} 条<br />
            进度: {stats.stats.progressCount} 条
          </div>
          <div className="text-xs text-yellow-400">
            {stats.note}
          </div>
          <button
            onClick={clearData}
            className="flex items-center text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            清空数据
          </button>
        </div>
      )}
    </div>
  );
}
