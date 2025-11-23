import React, { useState } from 'react';
import { analyzeContent } from '../services/geminiService';
import { VaultItem } from '../types';
import { getItems } from '../services/storageService'; // hacky way to get existing categories for suggestion, better passed via props

// Simple ID generator
const generateId = () => Math.random().toString(36).substring(2, 15);

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: VaultItem) => void;
}

export const AddModal: React.FC<Props> = ({ isOpen, onClose, onSave }) => {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingCategories, setExistingCategories] = useState<string[]>([]);

  // Load categories on open
  React.useEffect(() => {
    if (isOpen) {
      getItems().then(items => {
        const cats = Array.from(new Set(items.map(i => i.category).filter(Boolean) as string[]));
        setExistingCategories(cats);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAnalyzeAndSave = async () => {
    if (!content.trim()) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const analysis = await analyzeContent(content);
      
      const newItem: VaultItem = {
        id: generateId(),
        content: content,
        title: analysis.title,
        summary: '', // Keep user summary empty
        aiSummary: analysis.summary, // Store AI result separately
        tags: analysis.tags,
        type: analysis.type,
        category: category || '未分类',
        createdAt: Date.now()
      };

      onSave(newItem);
      setContent('');
      setCategory('');
      onClose();
    } catch (e) {
      setError("AI 分析失败，请检查 API Key 或重试");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSimpleSave = () => {
    if (!content.trim()) return;

    const trimmed = content.trim();
    const isUrl = /^https?:\/\//i.test(trimmed);
    
    let title = "未命名记录";
    if (isUrl) {
      try {
        title = new URL(trimmed).hostname;
      } catch {
        title = trimmed.substring(0, 30);
      }
    } else {
      title = trimmed.split('\n')[0].substring(0, 20);
      if (title.length < trimmed.length) title += "...";
    }

    const newItem: VaultItem = {
      id: generateId(),
      content: trimmed,
      title: title,
      summary: '', 
      aiSummary: '',
      tags: ['手动添加'],
      type: isUrl ? 'link' : 'note',
      category: category || '未分类',
      createdAt: Date.now()
    };

    onSave(newItem);
    setContent('');
    setCategory('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-fade-in">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <span className="text-indigo-500 dark:text-indigo-400">✨</span> 添加新资料
        </h2>
        
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm text-gray-600 dark:text-slate-400 mb-2">
              分类 (可选)
            </label>
            <input 
              list="category-options"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="选择或输入新分类..."
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <datalist id="category-options">
              {existingCategories.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-slate-400 mb-2">
              粘贴 URL 或 文本笔记
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-32 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 text-gray-900 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none transition-colors"
              placeholder="https://... or 这是一个想法..."
              autoFocus
            />
            {error && <p className="text-red-500 dark:text-red-400 text-sm mt-2">{error}</p>}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white transition-colors"
          >
            取消
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={handleSimpleSave}
              disabled={isAnalyzing || !content.trim()}
              className="px-4 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 disabled:opacity-50 text-gray-700 dark:text-slate-200 rounded-xl font-medium transition-all"
            >
              直接保存
            </button>
            
            <button
              onClick={handleAnalyzeAndSave}
              disabled={isAnalyzing || !content.trim()}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-300 dark:disabled:bg-slate-700 disabled:text-gray-500 dark:disabled:text-slate-500 text-white px-6 py-2 rounded-xl font-medium transition-all shadow-lg shadow-indigo-600/20"
            >
              {isAnalyzing ? '分析中...' : '智能添加'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
