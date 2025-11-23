
import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { ItemCard } from './components/ItemCard';
import { AddModal } from './components/AddModal';
import { EditModal } from './components/EditModal';
import { SettingsModal } from './components/SettingsModal';
import { Sidebar } from './components/Sidebar';
import { DeduplicateModal } from './components/DeduplicateModal';
import { ImportConflictModal } from './components/ImportConflictModal';
import { getItems, saveItem, saveBatchItems, deleteBatchItems, getConfig, saveConfig, verifyConnection } from './services/storageService';
import { importFile } from './services/importService';
import { analyzeContent } from './services/geminiService';
import { VaultItem } from './types';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<VaultItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sidebar filters
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeduplicateOpen, setIsDeduplicateOpen] = useState(false);
  
  // Import Conflict State
  const [conflictQueue, setConflictQueue] = useState<{newItem: VaultItem, existing: VaultItem}[]>([]);
  const [isConflictOpen, setIsConflictOpen] = useState(false);
  const [skipAllConflicts, setSkipAllConflicts] = useState(false);

  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; label: string } | null>(null);

  // Auth State
  const [authEndpoint, setAuthEndpoint] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);

  // Theme State
  const [isDark, setIsDark] = useState(true);
  
  useEffect(() => {
    const config = getConfig();
    if (config.authToken) {
      setAuthToken(config.authToken);
      setAuthEndpoint(config.apiEndpoint || '');
      handleLogin(config.apiEndpoint || '', config.authToken);
    }

    if (localStorage.getItem('theme') === 'light') {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    } else {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  useEffect(() => {
    let result = items;

    if (selectedTag) {
      result = result.filter(i => i.tags.includes(selectedTag));
    }

    if (selectedCategory) {
      result = result.filter(i => i.category === selectedCategory);
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(i => 
        i.title.toLowerCase().includes(lower) || 
        i.tags.some(t => t.toLowerCase().includes(lower)) ||
        (i.summary && i.summary.toLowerCase().includes(lower)) ||
        (i.aiSummary && i.aiSummary.toLowerCase().includes(lower))
      );
    }

    setFilteredItems(result);
  }, [searchTerm, items, selectedTag, selectedCategory]);

  const handleLogin = async (endpoint: string, token: string) => {
    setIsCheckingAuth(true);
    setLoginError('');
    try {
      if (endpoint) {
        const isValid = await verifyConnection(endpoint, token);
        if (!isValid) throw new Error("连接失败");
      }
      saveConfig({ apiEndpoint: endpoint, authToken: token });
      setIsAuthenticated(true);
      loadData();
    } catch (e: any) {
      setLoginError(e.message || "登录失败");
      setIsAuthenticated(false);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getItems();
      data.sort((a, b) => b.createdAt - a.createdAt);
      setItems(data);
    } catch (error) {
      console.error("Failed to load", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveItem = async (item: VaultItem) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === item.id);
      if (idx >= 0) {
        const newItems = [...prev];
        newItems[idx] = item;
        return newItems;
      }
      return [item, ...prev];
    });
    await saveItem(item);
    loadData(); 
  };

  const handleDeleteItems = async (ids: string[]) => {
    // Optimistic update
    setItems(prev => prev.filter(i => !ids.includes(i.id)));
    try {
      await deleteBatchItems(ids);
    } catch (e) {
      console.error("Delete failed", e);
      alert("删除失败，请刷新重试");
      loadData();
    }
  };

  const handleDeleteGroup = async (type: 'tag' | 'category', name: string) => {
    setIsLoading(true);
    try {
      const toDelete = items.filter(item => {
        if (type === 'tag') return item.tags.includes(name);
        if (type === 'category') return item.category === name;
        return false;
      });
      const ids = toDelete.map(i => i.id);
      if (ids.length > 0) {
        await handleDeleteItems(ids);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenEdit = (item: VaultItem) => {
    setEditingItem(item);
    setIsEditOpen(true);
  };

  // --- AI Analysis Logic ---

  const handleSingleAiAnalyze = async (item: VaultItem) => {
    setIsLoading(true);
    try {
      const analysis = await analyzeContent(item.content);
      const updatedItem = { ...item, aiSummary: analysis.summary, tags: [...new Set([...item.tags, ...analysis.tags])] };
      await handleSaveItem(updatedItem);
    } catch (e) {
      alert("AI 分析失败，请检查配置或重试");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchAiAnalyze = async () => {
    const targetItems = filteredItems.length > 0 ? filteredItems : items;
    
    // Get Keys logic prioritized
    const config = getConfig();
    let keys: string[] = [];
    
    if (config.geminiApiKeys && config.geminiApiKeys.length > 0) {
      keys = config.geminiApiKeys;
    } else if (process.env.API_KEY) {
      keys = [process.env.API_KEY];
    }

    if (keys.length === 0) {
      alert("未检测到 API Key。请先在设置 -> AI 设置 中配置 Gemini API Key。");
      return;
    }

    if (!confirm(`即将在 ${keys.length} 个 Key 之间轮询，对 ${targetItems.length} 个项目进行分析。\n\n确定继续吗？`)) return;

    setIsLoading(true);
    setProgress({ current: 0, total: targetItems.length, label: "正在进行 AI 批量整理..." });

    let processed = 0;
    let keyIndex = 0;
    
    // Queue items
    const queue = [...targetItems.map(i => ({...i, retryCount: 0}))];
    const updatedItems: VaultItem[] = [];
    const maxRetries = 3;

    while (queue.length > 0) {
      const item = queue.shift()!;
      
      // Determine delay based on number of keys to optimize speed
      const delayMs = Math.max(500, 3000 / keys.length);
      await new Promise(resolve => setTimeout(resolve, delayMs));

      const currentKey = keys[keyIndex % keys.length];
      keyIndex++;

      try {
        const analysis = await analyzeContent(item.content, currentKey);
        updatedItems.push({ 
          ...item, 
          aiSummary: analysis.summary,
          tags: [...new Set([...item.tags, ...analysis.tags])] 
        });
      } catch (e) {
        console.error(`Analysis failed for ${item.title} with key ...${currentKey.slice(-4)}`);
        if (item.retryCount < maxRetries) {
          queue.push({ ...item, retryCount: item.retryCount + 1 });
        } else {
          updatedItems.push(item); // Keep original if all retries fail
        }
      }

      processed++;
      const currentProgress = Math.min(processed, targetItems.length);
      setProgress({ current: currentProgress, total: targetItems.length, label: "正在进行 AI 批量整理..." });
    }

    if (updatedItems.length > 0) {
      // Save in chunks
      const chunkSize = 20;
      for (let i = 0; i < updatedItems.length; i += chunkSize) {
        await saveBatchItems(updatedItems.slice(i, i + chunkSize));
      }
      await loadData();
    }
    
    setIsLoading(false);
    setProgress(null);
    alert("AI 整理完成！");
  };

  // --- Import Logic ---
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    setConflictQueue([]);
    setSkipAllConflicts(false);
    try {
      const rawItems = await importFile(file);
      const newQueue: {newItem: VaultItem, existing: VaultItem}[] = [];
      const readyToImport: VaultItem[] = [];

      for (const newItem of rawItems) {
        if (newItem.type === 'link') {
          const existing = items.find(i => i.type === 'link' && i.content === newItem.content);
          if (existing) newQueue.push({ newItem, existing });
          else readyToImport.push(newItem);
        } else {
          readyToImport.push(newItem);
        }
      }

      if (readyToImport.length > 0) {
        const chunkSize = 50;
        for (let i = 0; i < readyToImport.length; i += chunkSize) {
          await saveBatchItems(readyToImport.slice(i, i + chunkSize));
        }
      }

      if (newQueue.length > 0) {
        setConflictQueue(newQueue);
        setIsConflictOpen(true);
      } else {
        await loadData();
        alert(`成功导入 ${readyToImport.length} 条记录！`);
      }
    } catch (err: any) {
      alert(err.message || "导入失败");
    } finally {
      setIsLoading(false);
      if (e.target) e.target.value = ''; 
    }
  };

  const handleResolveConflict = async (action: 'keep' | 'skip' | 'skip-all') => {
    if (conflictQueue.length === 0) {
      setIsConflictOpen(false);
      await loadData();
      return;
    }
    const current = conflictQueue[0];
    const rest = conflictQueue.slice(1);

    if (action === 'skip-all') {
      setSkipAllConflicts(true);
      setIsConflictOpen(false);
      setConflictQueue([]);
      await loadData();
      return;
    }
    if (action === 'keep') {
      await saveItem(current.newItem);
    }
    setConflictQueue(rest);
    if (rest.length === 0) {
      setIsConflictOpen(false);
      await loadData();
    }
  };

  // --- Sidebar Drop ---
  const handleDropOnTag = async (itemId: string, tag: string) => {
    const item = items.find(i => i.id === itemId);
    if (item && !item.tags.includes(tag)) {
      await handleSaveItem({ ...item, tags: [...item.tags, tag] });
    }
  };

  const handleDropOnCategory = async (itemId: string, cat: string) => {
    const item = items.find(i => i.id === itemId);
    if (item && item.category !== cat) {
      await handleSaveItem({ ...item, category: cat });
    }
  };

  const handleRenameTag = async (oldTag: string, newTag: string) => {
    setIsLoading(true);
    try {
      const affectedItems = items.filter(i => i.tags.includes(oldTag));
      const batchToUpdate = affectedItems.map(item => ({
        ...item,
        tags: item.tags.map(t => t === oldTag ? newTag : t)
      }));
      await saveBatchItems(batchToUpdate);
      await loadData();
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-300">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 border border-gray-200 dark:border-slate-800 animate-slide-up">
          <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-8">MindVault</h1>
          <div className="space-y-5">
            <input type="password" value={authToken} onChange={(e) => setAuthToken(e.target.value)} placeholder="访问密码" className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-gray-900 dark:text-slate-200 outline-none" />
            <button type="button" onClick={() => setAuthEndpoint(authEndpoint ? '' : 'https://')} className="text-xs text-indigo-600 dark:text-indigo-400">{authEndpoint ? '收起高级' : '配置同步'}</button>
            {authEndpoint && <input type="text" value={authEndpoint} onChange={(e) => setAuthEndpoint(e.target.value)} placeholder="Worker URL" className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-sm dark:text-slate-200" />}
            {loginError && <div className="text-red-500 text-sm text-center">{loginError}</div>}
            <button onClick={() => handleLogin(authEndpoint, authToken)} disabled={isCheckingAuth || !authToken} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-xl">{isCheckingAuth ? '...' : '解锁'}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-200 dark:bg-black text-gray-900 dark:text-slate-200 font-sans transition-colors duration-300">
      {progress && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="w-64 bg-gray-700 rounded-full h-2 mb-4 overflow-hidden"><div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${(progress.current / progress.total) * 100}%` }} /></div>
          <p className="text-white font-mono">{progress.label} {progress.current} / {progress.total}</p>
        </div>
      )}

      <Header 
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAdd={() => setIsAddOpen(true)}
        onImport={handleImport}
        onToggleTheme={toggleTheme}
        onDeduplicate={() => setIsDeduplicateOpen(true)}
        onBatchAI={handleBatchAiAnalyze}
        isDark={isDark}
        isSyncing={isLoading && !progress}
        itemCount={items.length}
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
      />

      <div className="container mx-auto px-4 py-6 flex gap-6">
        <Sidebar 
          items={items}
          selectedTag={selectedTag}
          selectedCategory={selectedCategory}
          onSelectTag={(t) => { setSelectedTag(t); setSelectedCategory(null); }}
          onSelectCategory={(c) => { setSelectedCategory(c); setSelectedTag(null); }}
          onDropOnTag={handleDropOnTag}
          onDropOnCategory={handleDropOnCategory}
          onRenameTag={handleRenameTag}
          onDeleteGroup={handleDeleteGroup}
        />

        <main className="flex-1 min-w-0">
          {items.length === 0 && !isLoading ? (
            <div className="text-center py-20"><h3 className="text-xl font-bold mb-2">资料库为空</h3><button onClick={() => setIsAddOpen(true)} className="text-indigo-500">+ 添加</button></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pb-10">
              {filteredItems.map(item => (
                <ItemCard key={item.id} item={item} onDelete={(id) => handleDeleteItems([id])} onEdit={handleOpenEdit} onAiAnalyze={handleSingleAiAnalyze} />
              ))}
            </div>
          )}
        </main>
      </div>

      <AddModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onSave={handleSaveItem} />
      <EditModal isOpen={isEditOpen} item={editingItem} onClose={() => setIsEditOpen(false)} onSave={handleSaveItem} />
      <DeduplicateModal isOpen={isDeduplicateOpen} items={items} onClose={() => setIsDeduplicateOpen(false)} onDelete={handleDeleteItems} />
      <ImportConflictModal isOpen={isConflictOpen} newItem={conflictQueue[0]?.newItem} existingItem={conflictQueue[0]?.existing} remainingCount={Math.max(0, conflictQueue.length - 1)} onResolve={handleResolveConflict} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};

export default App;
