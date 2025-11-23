import React from 'react';
import { VaultItem } from '../types';

interface Props {
  item: VaultItem;
  onDelete: (id: string) => void;
  onEdit: (item: VaultItem) => void;
  onAiAnalyze: (item: VaultItem) => void;
}

export const ItemCard: React.FC<Props> = ({ item, onDelete, onEdit, onAiAnalyze }) => {
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('确定要删除吗？')) {
      onDelete(item.id);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onEdit(item);
  };

  const handleAiClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAiAnalyze(item);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", item.id);
    e.dataTransfer.effectAllowed = "copy";
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const getIcon = () => {
    switch (item.type) {
      case 'link': return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      );
      case 'snippet': return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      );
      default: return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
  };

  const handleCardClick = () => {
    if (item.type === 'link') {
      window.open(item.content, '_blank');
    }
  };

  return (
    <div 
      draggable
      onDragStart={handleDragStart}
      onClick={handleCardClick}
      className={`
        group relative rounded-xl 
        bg-white dark:bg-slate-900 
        border border-transparent dark:border-slate-800
        shadow-md hover:shadow-xl dark:shadow-none
        hover:-translate-y-1
        transition-all duration-300 cursor-pointer overflow-hidden
        flex flex-col
      `}
    >
      <div className="p-5 pb-3 flex-1">
        <div className="flex justify-between items-start mb-3">
          <div className="flex gap-2 items-center">
            <div className={`p-2 rounded-lg ${
              item.type === 'link' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' : 
              item.type === 'snippet' ? 'bg-pink-50 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
            }`}>
              {getIcon()}
            </div>
            {item.category && (
              <span className="text-[10px] font-medium text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                📂 {item.category}
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400 dark:text-slate-600 font-mono">{formatDate(item.createdAt)}</span>
        </div>

        <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-2 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {item.title}
        </h3>

        {item.summary && (
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-3 line-clamp-3 leading-relaxed">
            {item.summary}
          </p>
        )}

        {/* AI Summary Section */}
        {item.aiSummary && (
          <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-lg">
            <div className="flex items-center gap-1 mb-1 text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
              AI 摘要
            </div>
            <p className="text-xs text-indigo-800 dark:text-indigo-200 leading-relaxed line-clamp-4">
              {item.aiSummary}
            </p>
          </div>
        )}
      </div>

      <div className="px-5 pb-5 pt-2 mt-auto">
        <div className="flex flex-wrap gap-2 mb-2">
          {item.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700">
              {tag}
            </span>
          ))}
          {item.tags.length > 3 && (
             <span className="text-[10px] px-2 py-1 text-gray-400">+{item.tags.length - 3}</span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 duration-200">
        <button 
          onClick={handleAiClick}
          className="p-2 text-purple-500 hover:text-white hover:bg-purple-500 bg-gray-100 dark:bg-slate-700 rounded-lg shadow-sm transition-all"
          title="AI 重新分析 (生成独立摘要)"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </button>
        <button 
          onClick={handleEditClick}
          className="p-2 text-gray-500 hover:text-white hover:bg-indigo-500 dark:text-slate-400 dark:hover:bg-indigo-500 bg-gray-100 dark:bg-slate-700 rounded-lg shadow-sm transition-all"
          title="编辑"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button 
          onClick={handleDelete}
          className="p-2 text-gray-500 hover:text-white hover:bg-red-500 dark:text-slate-400 dark:hover:bg-red-500 bg-gray-100 dark:bg-slate-700 rounded-lg shadow-sm transition-all"
          title="删除"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
};
