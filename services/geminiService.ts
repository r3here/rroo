
import { GoogleGenAI, Type } from "@google/genai";
import { AiAnalysisResult } from "../types";

export const analyzeContent = async (content: string, apiKey?: string): Promise<AiAnalysisResult> => {
  try {
    // Use provided key, or fallback to env var
    const key = apiKey || process.env.API_KEY;
    if (!key) throw new Error("No API Key provided");

    const ai = new GoogleGenAI({ apiKey: key });
    const modelId = "gemini-2.5-flash";
    
    // Explicitly request Chinese output in the prompt
    const prompt = `
      请分析以下内容（可能是 URL 或纯文本）。
      请务必使用 **简体中文** 输出结果。
      
      要求：
      1. title: 一个简明的中文标题。
      2. summary: 一段中文摘要（不超过2句话）。
      3. tags: 3-5 个相关的中文标签。
      4. type: 判断类型，只能是 'link' (如果是网址), 'note' (如果是普通文本), 'snippet' (如果是代码片段)。
      
      内容: "${content.substring(0, 5000)}"
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            tags: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            type: { type: Type.STRING, enum: ["link", "note", "snippet"] }
          },
          required: ["title", "summary", "tags", "type"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text) as AiAnalysisResult;

  } catch (error) {
    console.error("Gemini analysis failed:", error);
    throw error; // Re-throw to allow retry logic in App.tsx
  }
};
