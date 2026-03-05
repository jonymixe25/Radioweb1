import React, { useState } from "react";
import { Code, Copy, Check } from "lucide-react";

export default function EmbedCode() {
  const [copied, setCopied] = useState(false);
  const appUrl = window.location.origin;
  
  const embedCode = `<iframe 
  src="${appUrl}" 
  width="100%" 
  height="600" 
  style="border:none; border-radius: 24px;" 
  allow="microphone"
></iframe>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass p-6 rounded-3xl flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-2">
        <Code className="w-5 h-5 text-blue-400" />
        <h3 className="font-display font-bold">Código de Inserción</h3>
      </div>
      
      <div className="relative group">
        <pre className="bg-black/40 rounded-2xl p-4 text-[10px] font-mono text-white/60 overflow-x-auto whitespace-pre-wrap break-all border border-white/5">
          {embedCode}
        </pre>
        <button
          onClick={copyToClipboard}
          className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      
      <p className="text-[10px] text-white/30 italic">
        Copia este código para insertar el reproductor de radio en tu sitio web.
      </p>
    </div>
  );
}
