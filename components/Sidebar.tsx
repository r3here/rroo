
import React, { useState, useMemo } from 'react';
import { VaultItem } from '../types';

interface Props {
  items: VaultItem[];
  selectedTag: string | null;
  selectedCategory: string | null;
  onSelectTag: (tag: string | null) => void;
  onSelectCategory: (cat: string | null) => void;
  onDropOnTag: (itemId: string, tag: string) => void;
  onDropOnCategory: (itemId: string, cat: string) => void;
  onRenameTag: (oldTag: string, newTag: string) => void;
  onDeleteGroup: (type: 'tag' | 'category', name: string) => void;
}

export const Sidebar: React.FC<Props> = ({ 
  items, 
  selectedTag, 
  selectedCategory, 
  onSelectTag, 
  onSelectCategory, 
  onDropOnTag, 
  onDropOnCategory,
  onRenameTag,
  onDeleteGroup
}) => {
  const [mode, setMode] = useState<'category' | 'tag'>('category');
  const [isDragOver, setIsDragOver] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // --- Stats Calculation ---
  const tagCounts = useMemo(() => items.reduce((acc, item) => {
    item.tags.forEach(tag => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>), [items]);

  const sortedTags = useMemo(() => Object.keys(tagCounts).sort(), [tagCounts]);

  const categoryCounts = useMemo(() => items.reduce((acc, item) => {
    const cat = item.category || '未分类';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>), [items]);

  const allCategories = useMemo(() => {
    const existing = Object.keys(categoryCounts);
    return Array.from(new Set([...existing, ...customCategories, '未分类'])).sort();
  }, [categoryCounts, customCategories]);

  // --- Handlers ---

  const handleDragOver = (e: React.DragEvent, target: string | null) => {
    e.preventDefault();
    setIsDragOver(target);
  };

  const handleDrop = (e: React.DragEvent, target: string) => {
    e.preventDefault();
    setIsDragOver(null);
    const itemId = e.dataTransfer.getData("text/plain");
    if (itemId) {
      if (mode === 'tag') {
        onDropOnTag(itemId, target);
      } else {
        onDropOnCategory(itemId, target);
      }
    }
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      const name = newCategoryName.trim();
      if (!allCategories.includes(name)) {
        setCustomCategories([...customCategories, name]);
      }
      setNewCategoryName('');
    }
  };

  const handleBulkDelete = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    if (confirm(`⚠️ 警告：确定要删除 "${name}" 下的所有书签吗？此操作无法撤销！`)) {
      onDeleteGroup(mode, name);
    }
  };

  // --- Collapsed View ---
  if (isCollapsed) {
    return (
      <div className="relative group hidden lg:flex flex-col w-16 h-[calc(100vh-5rem)] bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border-r border-gray-200 dark:border-slate-800 items-center pt-4 transition-all duration-300">
        <button 
          onClick={() => setIsCollapsed(false)}
          className="p-2 text-gray-500 hover:text-indigo-500 dark:text-slate-400 rounded-lg mb-6"
          title="展开侧边栏"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
        </button>
        
        {/* Vertical Mode Icons */}
        <button onClick={() => { setMode('category'); setIsCollapsed(false); }} className={`p-3 mb-2 rounded-xl transition-colors ${mode === 'category' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'text-gray-400 dark:text-slate-500'}`}>
          <span className="text-xl">📂</span>
        </button>
        <button onClick={() => { setMode('tag'); setIsCollapsed(false); }} className={`p-3 rounded-xl transition-colors ${mode === 'tag' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'text-gray-400 dark:text-slate-500'}`}>
          <span className="text-xl">🏷️</span>
        </button>
      </div>
    );
  }

  // --- Expanded View ---
  return (
    <div className="hidden lg:flex flex-col w-64 h-[calc(100vh-5rem)] bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border-r border-gray-200 dark:border-slate-800 flex-shrink-0 transition-all duration-300 rounded-r-2xl">
      {/* Header & Collapse */}
      <div className="flex items-center justify-between p-4 pb-2">
        <h2 className="font-bold text-gray-700 dark:text-slate-200 text-sm">资料库管理</h2>
        <button 
          onClick={() => setIsCollapsed(true)}
          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title="收起"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
        </button>
      </div>

      {/* Vertical Mode Switcher */}
      <div className="flex flex-col px-4 gap-2 mb-4">
        <button
          onClick={() => { setMode('category'); onSelectTag(null); }}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all border ${
            mode === 'category' 
              ? 'bg-white dark:bg-slate-800 border-indigo-100 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 shadow-sm' 
              : 'border-transparent text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
          }`}
        >
          <span className="text-lg">📂</span>
          <span className="text-sm font-bold">分类管理</span>
        </button>
        
        <button
          onClick={() => { setMode('tag'); onSelectCategory(null); }}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all border ${
            mode === 'tag' 
              ? 'bg-white dark:bg-slate-800 border-indigo-100 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 shadow-sm' 
              : 'border-transparent text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
          }`}
        >
          <span className="text-lg">🏷️</span>
          <span className="text-sm font-bold">标签管理</span>
        </button>
      </div>

      <div className="px-4 mb-2">
        <div className="h-px bg-gray-200 dark:bg-slate-800 w-full"></div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 space-y-1 scrollbar-thin">
        <button
          onClick={() => { onSelectTag(null); onSelectCategory(null); }}
          className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex justify-between items-center ${
            selectedTag === null && selectedCategory === null
              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
              : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
          }`}
        >
          <span>全部资料</span>
          <span className="text-xs opacity-60 bg-gray-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">{items.length}</span>
        </button>

        {mode === 'tag' && sortedTags.map(tag => (
          <div
            key={tag}
            onDragOver={(e) => handleDragOver(e, tag)}
            onDragLeave={() => setIsDragOver(null)}
            onDrop={(e) => handleDrop(e, tag)}
            className={`relative group rounded-lg transition-colors ${
              isDragOver === tag ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : ''
            }`}
          >
            <button
              onClick={() => onSelectTag(tag)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex justify-between items-center ${
                selectedTag === tag
                  ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400 border border-gray-100 dark:border-slate-700'
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className="truncate mr-2"># {tag}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs opacity-60 bg-gray-200 dark:bg-slate-700 px-1.5 rounded-full shrink-0">
                  {tagCounts[tag]}
                </span>
                <div 
                  onClick={(e) => handleBulkDelete(e, tag)}
                  className="hidden group-hover:flex w-6 h-6 items-center justify-center rounded hover:bg-red-100 dark:hover:bg-red-900/50 text-gray-400 hover:text-red-500 transition-colors"
                  title="删除该标签下的所有书签"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </div>
              </div>
            </button>
          </div>
        ))}

        {mode === 'category' && allCategories.map(cat => (
          <div
            key={cat}
            onDragOver={(e) => handleDragOver(e, cat)}
            onDragLeave={() => setIsDragOver(null)}
            onDrop={(e) => handleDrop(e, cat)}
            className={`relative group rounded-lg transition-colors ${
              isDragOver === cat ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : ''
            }`}
          >
            <button
              onClick={() => onSelectCategory(cat)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex justify-between items-center ${
                selectedCategory === cat
                  ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400 border border-gray-100 dark:border-slate-700'
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className="truncate mr-2 flex items-center gap-2">
                <span className="opacity-70">📂</span> {cat}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs opacity-60 bg-gray-200 dark:bg-slate-700 px-1.5 rounded-full shrink-0">
                  {categoryCounts[cat] || 0}
                </span>
                <div 
                  onClick={(e) => handleBulkDelete(e, cat)}
                  className="hidden group-hover:flex w-6 h-6 items-center justify-center rounded hover:bg-red-100 dark:hover:bg-red-900/50 text-gray-400 hover:text-red-500 transition-colors"
                  title="删除该分类下的所有书签"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </div>
              </div>
            </button>
          </div>
        ))}
      </div>

      {/* New Category Input */}
      {mode === 'category' && (
        <div className="p-4 border-t border-gray-200 dark:border-slate-800 bg-white/30 dark:bg-slate-900/30">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 focus-within:border-indigo-500 transition-colors">
            <input 
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              placeholder="新建分类..."
              className="w-full bg-transparent text-xs px-2 outline-none text-gray-700 dark:text-slate-300"
            />
            <button 
              onClick={handleAddCategory}
              className="p-1.5 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-md text-indigo-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>
          <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-2 px-1 text-center">
            拖拽卡片到分类可快速归档
          </p>
        </div>
      )}
    </div>
  );
};
