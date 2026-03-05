import React from "react";
import { Mic, MicOff, Radio, Signal, Volume2 } from "lucide-react";
import { useBroadcast } from "../contexts/BroadcastContext";

export default function Broadcaster() {
  const { isMicActive, startMic, stopMic, isMonitoring, setIsMonitoring, error } = useBroadcast();

  return (
    <div className="glass p-8 rounded-3xl flex flex-col items-center gap-6 shadow-2xl">
      <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 ${isMicActive ? 'bg-emerald-500/20 neon-glow animate-pulse' : 'bg-white/5'}`}>
        {isMicActive ? (
          <Radio className="w-12 h-12 text-emerald-400" />
        ) : (
          <Mic className="w-12 h-12 text-white/40" />
        )}
      </div>
      
      <div className="text-center">
        <h2 className="text-2xl font-display font-bold mb-2">Panel de Locutor</h2>
        <p className="text-white/60 text-sm">
          {isMicActive ? "Transmitiendo en vivo desde el micrófono..." : "Listo para iniciar la transmisión"}
        </p>
      </div>

      <div className="w-full flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10">
        <div className="flex items-center gap-3">
          <Volume2 className="w-5 h-5 text-white/40" />
          <span className="text-sm font-medium">Monitorear Audio</span>
        </div>
        <button
          onClick={() => setIsMonitoring(!isMonitoring)}
          className={`w-12 h-6 rounded-full transition-colors relative ${isMonitoring ? 'bg-emerald-500' : 'bg-white/10'}`}
        >
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isMonitoring ? 'left-7' : 'left-1'}`} />
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl w-full text-center">
          {error}
        </div>
      )}

      <button
        onClick={isMicActive ? stopMic : startMic}
        className={`w-full py-4 rounded-2xl font-semibold transition-all flex items-center justify-center gap-2 ${
          isMicActive 
            ? 'bg-red-500 hover:bg-red-600 text-white' 
            : 'bg-emerald-500 hover:bg-emerald-600 text-white'
        }`}
      >
        {isMicActive ? (
          <><MicOff className="w-5 h-5" /> Detener Micrófono</>
        ) : (
          <><Mic className="w-5 h-5" /> Activar Micrófono</>
        )}
      </button>

      {isMicActive && (
        <div className="flex items-center gap-2 text-xs text-emerald-400">
          <Signal className="w-4 h-4" />
          <span>Señal estable</span>
        </div>
      )}
    </div>
  );
}
