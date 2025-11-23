
import React, { useState, useEffect } from 'react';
import { getConfig, saveConfig, getItems, deleteBatchItems } from '../services/storageService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [apiKeys, setApiKeys] = useState('');
  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'deploy-backend' | 'deploy-frontend' | 'danger'>('general');

  useEffect(() => {
    if (isOpen) {
      const config = getConfig();
      setApiEndpoint(config.apiEndpoint || '');
      setAuthToken(config.authToken || '');
      setApiKeys(config.geminiApiKeys?.join('\n') || '');
    }
  }, [isOpen]);

  const handleSave = () => {
    let cleanEndpoint = apiEndpoint.trim();
    if (cleanEndpoint && cleanEndpoint.endsWith('/')) {
      cleanEndpoint = cleanEndpoint.slice(0, -1);
    }
    
    // Correctly parse multiline keys
    const cleanKeys = apiKeys
      .split(/[\n,]+/) // Split by newline or comma
      .map(k => k.trim())
      .filter(k => k.length > 0);

    saveConfig({ 
      apiEndpoint: cleanEndpoint, 
      authToken,
      geminiApiKeys: cleanKeys
    });
    
    alert("设置已保存！即将刷新页面以应用更改。");
    window.location.reload();
  };

  const handleDeleteAll = async () => {
    const confirmText = prompt("⚠️ 警告！此操作将永久删除所有数据！\n请输入 'DELETE' 确认：");
    if (confirmText === 'DELETE') {
      try {
        const items = await getItems();
        const allIds = items.map(i => i.id);
        if (allIds.length > 0) {
          await deleteBatchItems(allIds);
        }
        alert("数据已清空，即将刷新页面");
        window.location.reload();
      } catch (e) {
        alert("清空失败: " + e);
      }
    }
  };

  const copyCode = () => {
    const code = workerCode.trim();
    navigator.clipboard.writeText(code);
    alert("代码已复制到剪贴板！");
  };

  const workerCode = `
export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS,DELETE",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    
    if (url.pathname === "/" && request.method === "GET") {
      return new Response("MindVault Backend is Online.", { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "text/plain" } 
      });
    }

    const auth = request.headers.get("Authorization");
    const expectedToken = env.SECRET_TOKEN || "my-default-password";
    
    if (!auth || auth !== \`Bearer \${expectedToken}\`) {
      return new Response(JSON.stringify({ error: "Unauthorized: Password incorrect" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const path = url.pathname;

    try {
      if (!env.VAULT_KV) {
        throw new Error("KV not bound. Bind 'VAULT_KV' in Cloudflare Settings.");
      }

      // Get All Items
      if (request.method === "GET" && path === "/items") {
        const data = await env.VAULT_KV.get("items");
        return new Response(data || "[]", { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Add Single Item
      if (request.method === "POST" && path === "/items") {
        const item = await request.json();
        let current = await env.VAULT_KV.get("items", { type: "json" });
        if (!current || !Array.isArray(current)) current = [];
        
        const index = current.findIndex(i => i.id === item.id);
        if (index > -1) current[index] = item;
        else current.unshift(item);

        await env.VAULT_KV.put("items", JSON.stringify(current));
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Batch Add Items (For Import)
      if (request.method === "POST" && path === "/batch_items") {
        const items = await request.json();
        if (!Array.isArray(items)) {
           return new Response(JSON.stringify({ error: "Body must be an array" }), { status: 400, headers: corsHeaders });
        }
        
        let current = await env.VAULT_KV.get("items", { type: "json" });
        if (!current || !Array.isArray(current)) current = [];
        
        const currentMap = new Map(current.map(i => [i.id, i]));
        for (const item of items) {
          currentMap.set(item.id, item);
        }
        
        const newItems = Array.from(currentMap.values()).sort((a, b) => b.createdAt - a.createdAt);

        await env.VAULT_KV.put("items", JSON.stringify(newItems));
        return new Response(JSON.stringify({ success: true, count: items.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Batch Delete Items
      if (request.method === "POST" && path === "/batch_delete") {
        const { ids } = await request.json();
        if (!Array.isArray(ids)) {
           return new Response(JSON.stringify({ error: "ids must be an array" }), { status: 400, headers: corsHeaders });
        }
        
        let current = await env.VAULT_KV.get("items", { type: "json" });
        if (current && Array.isArray(current)) {
          current = current.filter(i => !ids.includes(i.id));
          await env.VAULT_KV.put("items", JSON.stringify(current));
        }
        return new Response(JSON.stringify({ success: true, count: ids.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Delete Single Item (Legacy support)
      if (request.method === "DELETE" && path.startsWith("/items/")) {
        const id = path.split("/").pop();
        let current = await env.VAULT_KV.get("items", { type: "json" });
        if (current && Array.isArray(current)) {
          current = current.filter(i => i.id !== id);
          await env.VAULT_KV.put("items", JSON.stringify(current));
        }
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ error: "API Endpoint Not Found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  },
};

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
        
        <div className="flex border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 overflow-x-auto">
          <button onClick={() => setActiveTab('general')} className={`flex-shrink-0 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'general' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500 bg-white dark:bg-slate-800/50' : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'}`}>1. 连接配置</button>
          <button onClick={() => setActiveTab('ai')} className={`flex-shrink-0 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'ai' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500 bg-white dark:bg-slate-800/50' : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'}`}>2. AI 设置</button>
          <button onClick={() => setActiveTab('deploy-backend')} className={`flex-shrink-0 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'deploy-backend' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500 bg-white dark:bg-slate-800/50' : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'}`}>3. 部署后端</button>
          <button onClick={() => setActiveTab('deploy-frontend')} className={`flex-shrink-0 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'deploy-frontend' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500 bg-white dark:bg-slate-800/50' : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'}`}>4. 部署前端</button>
          <button onClick={() => setActiveTab('danger')} className={`flex-shrink-0 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'danger' ? 'text-red-600 dark:text-red-400 border-b-2 border-red-500 bg-red-50 dark:bg-red-900/20' : 'text-gray-500 dark:text-slate-400 hover:text-red-500'}`}>5. 危险区域</button>
        </div>

        <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900">
          {activeTab === 'general' && (
            <div className="p-8 max-w-lg mx-auto mt-8">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6">连接配置</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-500 uppercase mb-2">Worker URL</label>
                  <input type="text" value={apiEndpoint} onChange={(e) => setApiEndpoint(e.target.value)} className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-gray-900 dark:text-slate-200 focus:border-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-500 uppercase mb-2">访问密码</label>
                  <input type="password" value={authToken} onChange={(e) => setAuthToken(e.target.value)} className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-gray-900 dark:text-slate-200 focus:border-indigo-500 outline-none" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="p-8 max-w-lg mx-auto mt-8">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6">AI 设置</h3>
              <div className="space-y-6">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/50 mb-4">
                  <p className="text-sm text-indigo-700 dark:text-indigo-300">
                    为了提高分析速度并避免 API 限制，您可以输入多个 Gemini API Key。系统会自动轮询使用。
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-500 uppercase mb-2">Gemini API Keys (每行一个)</label>
                  <textarea 
                    value={apiKeys} 
                    onChange={(e) => setApiKeys(e.target.value)} 
                    rows={8}
                    placeholder="AIzaSy...&#10;AIzaSy...&#10;AIzaSy..."
                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-gray-900 dark:text-slate-200 focus:border-indigo-500 outline-none font-mono text-xs leading-relaxed resize-none" 
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'deploy-backend' && (
            <div className="flex h-full flex-col md:flex-row">
              <div className="w-full md:w-1/3 p-6 border-r border-gray-200 dark:border-slate-800"><h3 className="font-bold dark:text-white mb-4">后端部署</h3><p className="text-sm text-gray-500">请复制右侧代码更新您的 Worker。<br/><br/>更新后请重新部署 Worker。</p></div>
              <div className="w-full md:w-2/3 bg-gray-100 dark:bg-[#0d1117] flex flex-col">
                <div className="flex justify-between items-center px-4 py-2 border-b border-gray-300 dark:border-slate-700"><button onClick={copyCode} className="text-xs bg-indigo-600 text-white px-3 py-1 rounded">复制</button></div>
                <pre className="flex-1 p-4 overflow-auto text-xs font-mono text-gray-800 dark:text-slate-300">{workerCode}</pre>
              </div>
            </div>
          )}

          {activeTab === 'deploy-frontend' && (
             <div className="p-8"><h3 className="font-bold dark:text-white">前端部署</h3><p className="text-sm text-gray-500">Build command: npm run build<br/>Output directory: dist</p></div>
          )}

          {activeTab === 'danger' && (
            <div className="p-8 max-w-lg mx-auto mt-8 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-red-600 dark:text-red-500 mb-2">危险区域</h3>
              <p className="text-sm text-gray-600 dark:text-slate-400 mb-6">
                此操作将永久删除您的所有书签和笔记数据，且无法恢复。请谨慎操作。
              </p>
              <button onClick={handleDeleteAll} className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-600/20 transition-all">
                清空所有数据
              </button>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">关闭</button>
          {(activeTab === 'general' || activeTab === 'ai') && <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors">保存</button>}
        </div>
      </div>
    </div>
  );
};
