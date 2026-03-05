import React, { useState } from "react";
import Broadcaster from "./components/Broadcaster";
import Listener from "./components/Listener";
import CoverGenerator from "./components/CoverGenerator";
import EmbedCode from "./components/EmbedCode";
import PlaylistLibrary from "./components/PlaylistLibrary";
import { BroadcastProvider } from "./contexts/BroadcastContext";
import { Radio, LayoutDashboard, Music, Code as CodeIcon, Github, Lock, Unlock, Key } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Analytics } from "@vercel/analytics/react";

export default function App() {
  return (
    <BroadcastProvider>
      <AppContent />
    </BroadcastProvider>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<"listener" | "broadcaster">("listener");
  const [coverUrl, setCoverUrl] = useState<string | undefined>(undefined);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple password for demo purposes
    if (password === "admin123") {
      setIsAuthenticated(true);
      setAuthError(false);
    } else {
      setAuthError(true);
      setTimeout(() => setAuthError(false), 2000);
    }
  };

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
            <span className="font-display font-extrabold text-2xl tracking-tight">Lysten Radio</span>
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
                      Tu Radio, <span className="text-emerald-400">Tu Estilo</span>, Tu Momento.
                    </h1>
                    <p className="text-white/50 text-lg">
                      Sintoniza transmisiones en vivo de todo el mundo con calidad digital superior.
                    </p>
                  </div>
                  <Listener coverUrl={coverUrl} />
                </motion.div>
              ) : (
                <motion.div
                  key="broadcaster"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="w-full"
                >
                  {!isAuthenticated ? (
                    <div className="max-w-md mx-auto glass p-10 rounded-[2.5rem] flex flex-col items-center gap-8 shadow-2xl border border-white/10">
                      <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center">
                        <Lock className="w-10 h-10 text-emerald-400" />
                      </div>
                      <div className="text-center">
                        <h2 className="text-3xl font-display font-extrabold mb-2">Acceso Restringido</h2>
                        <p className="text-white/40 text-sm">Ingresa la contraseña para acceder al panel de control.</p>
                      </div>
                      <form onSubmit={handleLogin} className="w-full space-y-4">
                        <div className="relative group">
                          <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-emerald-400 transition-colors" />
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Contraseña (admin123)"
                            className={`w-full bg-white/5 border ${authError ? 'border-red-500/50' : 'border-white/10'} rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-emerald-500/50 transition-all text-lg`}
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                        >
                          Desbloquear Panel
                        </button>
                        {authError && (
                          <p className="text-red-400 text-xs text-center animate-bounce">Contraseña incorrecta</p>
                        )}
                      </form>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="flex flex-col gap-8">
                        <div className="text-left flex items-center justify-between">
                          <div>
                            <h1 className="text-4xl font-display font-extrabold mb-2">
                              Centro de <span className="text-emerald-400">Control</span>
                            </h1>
                            <p className="text-white/50">
                              Inicia tu propia estación de radio en segundos.
                            </p>
                          </div>
                          <button 
                            onClick={() => setIsAuthenticated(false)}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-white/40 hover:text-white"
                            title="Cerrar Sesión"
                          >
                            <Unlock className="w-5 h-5" />
                          </button>
                        </div>
                        <Broadcaster />
                        <PlaylistLibrary />
                      </div>
                      
                      <div className="flex flex-col gap-6">
                        <CoverGenerator onCoverGenerated={setCoverUrl} />
                        <EmbedCode />
                      </div>
                    </div>
                  )}
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
                    <span className="text-[10px] font-mono uppercase tracking-widest">v1.0.0 Estable</span>
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
      <Analytics />
    </div>
  );
}
