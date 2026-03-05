import React, { useState } from "react";
import { Sparkles, Image as ImageIcon, Loader2 } from "lucide-react";
import { GoogleGenAI } from "@google/genai";

interface CoverGeneratorProps {
  onCoverGenerated: (url: string) => void;
}

export default function CoverGenerator({ onCoverGenerated }: CoverGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateCover = async () => {
    if (!prompt) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: {
          parts: [{ text: `A professional radio station cover art, high quality, digital art style, theme: ${prompt}` }],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
          }
        }
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          onCoverGenerated(imageUrl);
          break;
        }
      }
    } catch (err) {
      console.error("Error generating image:", err);
      setError("Error al generar la carátula. Intenta con otro texto.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="glass p-6 rounded-3xl flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-purple-400" />
        <h3 className="font-display font-bold">Generador de Carátulas IA</h3>
      </div>
      
      <div className="relative">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe el estilo de tu radio (ej: Cyberpunk, Jazz Lounge, Minimalista...)"
          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-purple-500/50 transition-colors min-h-[100px] resize-none"
        />
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <button
        onClick={generateCover}
        disabled={isGenerating || !prompt}
        className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Generando...</>
        ) : (
          <><ImageIcon className="w-4 h-4" /> Generar Carátula</>
        )}
      </button>
    </div>
  );
}
