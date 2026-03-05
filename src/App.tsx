import React, { useState } from "react";
import Broadcaster from "./components/Broadcaster";
import Listener from "./components/Listener";
import CoverGenerator from "./components/CoverGenerator";
import EmbedCode from "./components/EmbedCode";
import { Radio, LayoutDashboard, Music, Code as CodeIcon, Github } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"listener" | "broadcaster">("listener");
  const [coverUrl, setCoverUrl] = useState<string | undefined>(undefined);
  const [stationSettings, setStationSettings] = useState({
    name: "Lysten Radio",
    website: "https://radioweb1.vercel.app/",
    description: "Tu Radio, Tu Estilo, Tu Momento."
  });

  return (
    <div className="min-h-screen font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Background Elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Radio className="text-white w-6 h-6" />
            </div>
            <span className="font-display font-extrabold text-2xl tracking-tight">{stationSettings.name}</span>
          </div>
          
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/5">
            <button
              onClick={() => setActiveTab("listener")}
              className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === "listener" ? "bg-white text-black shadow-lg" : "text-white/60 hover:text-white"
              }`}
            >
              <Music className="w-4 h-4" />
              Sintonizar
            </button>
            <button
              onClick={() => setActiveTab("broadcaster")}
              className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === "broadcaster" ? "bg-white text-black shadow-lg" : "text-white/60 hover:text-white"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Panel Locutor
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Main Content Area */}
          <div className="lg:col-span-7 xl:col-span-8">
            <AnimatePresence mode="wait">
              {activeTab === "listener" ? (
                <motion.div
                  key="listener"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex flex-col items-center gap-8"
                >
                  <div className="text-center max-w-lg mb-4">
                    <h1 className="text-4xl md:text-5xl font-display font-extrabold mb-4 leading-tight">
                      {stationSettings.name.split(' ')[0]} <span className="text-emerald-400">{stationSettings.name.split(' ').slice(1).join(' ')}</span>
                    </h1>
                    <p className="text-white/50 text-lg">
                      {stationSettings.description}
                    </p>
                    {stationSettings.website && (
                      <a 
                        href={stationSettings.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-block mt-4 text-xs font-mono text-emerald-400 hover:underline"
                      >
                        {stationSettings.website}
                      </a>
                    )}
                  </div>
                  <Listener coverUrl={coverUrl} stationName={stationSettings.name} />
                </motion.div>
              ) : (
                <motion.div
                  key="broadcaster"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-8"
                >
                  <div className="flex flex-col gap-8">
                    <div className="text-left">
                      <h1 className="text-4xl font-display font-extrabold mb-4">
                        Centro de <span className="text-emerald-400">Control</span>
                      </h1>
                      <p className="text-white/50">
                        Inicia tu propia estación de radio en segundos. Conecta tu micrófono y empieza a transmitir.
                      </p>
                    </div>
                    <Broadcaster />
                  </div>
                  
                  <div className="flex flex-col gap-6">
                    <div className="glass p-6 rounded-3xl flex flex-col gap-4">
                      <div className="flex items-center gap-2 mb-2">
                        <LayoutDashboard className="w-5 h-5 text-emerald-400" />
                        <h3 className="font-display font-bold">Configuración de Estación</h3>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] text-white/40 uppercase font-bold mb-1 block">Nombre de la Radio</label>
                          <input 
                            type="text" 
                            value={stationSettings.name}
                            onChange={(e) => setStationSettings({...stationSettings, name: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-500/50"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 uppercase font-bold mb-1 block">Sitio Web (Vercel/URL)</label>
                          <input 
                            type="text" 
                            value={stationSettings.website}
                            onChange={(e) => setStationSettings({...stationSettings, website: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-500/50"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 uppercase font-bold mb-1 block">Slogan / Descripción</label>
                          <input 
                            type="text" 
                            value={stationSettings.description}
                            onChange={(e) => setStationSettings({...stationSettings, description: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-500/50"
                          />
                        </div>
                      </div>
                    </div>
                    <CoverGenerator onCoverGenerated={setCoverUrl} />
                    <EmbedCode />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar / Info */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-8">
            <div className="glass p-8 rounded-3xl">
              <h3 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
                <Music className="w-5 h-5 text-emerald-400" />
                ¿Qué es Lysten?
              </h3>
              <p className="text-white/60 text-sm leading-relaxed mb-6">
                Lysten Radio es una plataforma experimental que permite a cualquier persona convertirse en locutor de radio. 
                Utilizamos tecnología WebRTC y WebSockets para garantizar una transmisión de baja latencia.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <span className="text-emerald-400 font-bold text-xs">01</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Transmisión HD</h4>
                    <p className="text-white/40 text-xs">Audio cristalino procesado en tiempo real.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                    <span className="text-purple-400 font-bold text-xs">02</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">IA Generativa</h4>
                    <p className="text-white/40 text-xs">Crea carátulas únicas para tu estación con Gemini.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                    <span className="text-blue-400 font-bold text-xs">03</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Fácil de Insertar</h4>
                    <p className="text-white/40 text-xs">Lleva tu radio a cualquier sitio web con un simple iframe.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-4 text-white/20">
              <div className="flex items-center gap-4">
                <CodeIcon className="w-4 h-4" />
                <span className="text-[10px] font-mono uppercase tracking-widest">v1.0.0 Stable</span>
              </div>
              <Github className="w-4 h-4 hover:text-white transition-colors cursor-pointer" />
            </div>
          </div>

        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-white/5 text-center">
        <p className="text-white/20 text-xs uppercase tracking-widest">
          &copy; {new Date().getFullYear()} Lysten Radio. Hecho con pasión por la música.
        </p>
      </footer>
    </div>
  );
}
