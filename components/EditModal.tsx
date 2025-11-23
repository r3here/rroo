import React, { useState, useEffect } from 'react';
import { VaultItem } from '../types';
import { getItems } from '../services/storageService';

interface Props {
  isOpen: boolean;
  item: VaultItem | null;
  onClose: () => void;
  onSave: (item: VaultItem) => void;
}

export const EditModal: React.FC<Props> = ({ isOpen, item, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('');
  const [existingCategories, setExistingCategories] = useState<string[]>([]);

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setContent(item.content);
      setSummary(item.summary || '');
      setAiSummary(item.aiSummary || '');
      setTags(item.tags.join(', '));
      setCategory(item.category || '');
    }
    if (isOpen) {
      getItems().then(items => {
        const cats = Array.from(new Set(items.map(i => i.category).filter(Boolean) as string[]));
        setExistingCategories(cats);
      });
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const handleSave = () => {
    const tagArray = tags.split(/[,，]/).map(t => t.trim()).filter(Boolean);
    
    const updatedItem: VaultItem = {
      ...item,
      title,
      content,
      summary,
      aiSummary,
      category,
      tags: tagArray
    };

    onSave(updatedItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-fade-in flex flex-col max-h-[90vh]">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
          编辑资料
        </h2>
        
        <div className="space-y-4 overflow-y-auto pr-2">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-500 uppercase mb-1">标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-500 uppercase mb-1">分类</label>
                <input
                  list="edit-category-options"
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <datalist id="edit-category-options">
                  {existingCategories.map(c => <option key={c} value={c} />)}
                </datalist>
             </div>
             <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-500 uppercase mb-1">标签 (逗号分隔)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
             </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-500 uppercase mb-1">内容 / URL</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-24 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-500 uppercase mb-1">个人备注 (Summary)</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full h-20 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            />
          </div>

          {aiSummary && (
            <div>
              <label className="block text-xs font-bold text-indigo-500 uppercase mb-1">AI 智能摘要 (只读)</label>
              <div className="w-full bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-xl px-4 py-3 text-xs text-indigo-800 dark:text-indigo-200">
                {aiSummary}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium shadow-lg shadow-indigo-600/20"
          >
            保存修改
          </button>
        </div>
      </div>
    </div>
  );
};
