import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, Radio, Loader2, Wifi, WifiOff } from "lucide-react";

interface ListenerProps {
  coverUrl?: string;
}

type PlayerStatus = "idle" | "connecting" | "buffering" | "live" | "offline";

export default function Listener({ coverUrl }: ListenerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [volume, setVolume] = useState(0.8);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const bufferThreshold = 0.5; // 500ms jitter buffer

  const startListening = async () => {
    setStatus("connecting");
    
    // Initialize Audio Context
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioContextClass({ sampleRate: 16000 });
    audioContextRef.current = audioCtx;

    // Create Gain Node for volume control
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = volume;
    gainNode.connect(audioCtx.destination);
    gainNodeRef.current = gainNode;

    // Resume context if suspended (browser policy)
    if (audioCtx.state === "suspended") {
      await audioCtx.resume();
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    socketRef.current = socket;

    socket.onopen = () => {
      setStatus("buffering");
    };

    socket.onmessage = async (event) => {
      if (event.data instanceof Blob) {
        const arrayBuffer = await event.data.arrayBuffer();
        const float32Array = new Float32Array(arrayBuffer);
        
        if (audioContextRef.current && isPlaying) {
          const buffer = audioContextRef.current.createBuffer(1, float32Array.length, 16000);
          buffer.getChannelData(0).set(float32Array);
          
          const source = audioContextRef.current.createBufferSource();
          source.buffer = buffer;
          source.connect(gainNodeRef.current!);
          
          const currentTime = audioContextRef.current.currentTime;
          
          // Implement Jitter Buffer
          // If nextStartTime is too far in the past, reset it to current + threshold
          if (nextStartTimeRef.current < currentTime) {
            nextStartTimeRef.current = currentTime + bufferThreshold;
          }
          
          source.start(nextStartTimeRef.current);
          nextStartTimeRef.current += buffer.duration;
          
          if (status !== "live") setStatus("live");
        }
      }
    };

    socket.onclose = () => {
      setStatus("offline");
      setIsPlaying(false);
    };

    socket.onerror = () => {
      setStatus("offline");
      setIsPlaying(false);
    };

    setIsPlaying(true);
  };

  const stopListening = () => {
    if (socketRef.current) {
      socketRef.current.close();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setIsPlaying(false);
    setStatus("idle");
    nextStartTimeRef.current = 0;
  };

  // Update volume in real-time
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(volume, audioContextRef.current?.currentTime || 0, 0.1);
    }
  }, [volume]);

  const getStatusDisplay = () => {
    switch (status) {
      case "connecting":
        return { label: "Conectando...", color: "bg-blue-500", icon: <Loader2 className="w-3 h-3 animate-spin" /> };
      case "buffering":
        return { label: "Sincronizando...", color: "bg-yellow-500", icon: <Loader2 className="w-3 h-3 animate-spin" /> };
      case "live":
        return { label: "En Vivo", color: "bg-red-500", icon: <div className="w-1.5 h-1.5 bg-white rounded-full" /> };
      case "offline":
        return { label: "Desconectado", color: "bg-gray-500", icon: <WifiOff className="w-3 h-3" /> };
      default:
        return null;
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="glass p-8 rounded-3xl flex flex-col items-center gap-6 shadow-2xl w-full max-w-md transition-all duration-500">
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-white/5 group">
        {coverUrl ? (
          <img 
            src={coverUrl} 
            alt="Radio Cover" 
            className={`w-full h-full object-cover transition-all duration-700 ${isPlaying ? 'scale-105' : 'scale-100 grayscale-[0.5]'}`}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Radio className={`w-20 h-20 transition-colors duration-500 ${isPlaying ? 'text-emerald-400/20' : 'text-white/10'}`} />
          </div>
        )}
        
        {statusDisplay && (
          <div className={`absolute top-4 right-4 flex items-center gap-2 ${statusDisplay.color} px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg transition-colors`}>
            {statusDisplay.icon}
            {statusDisplay.label}
          </div>
        )}
      </div>

      <div className="w-full text-center">
        <h3 className="text-xl font-display font-bold">Lysten Radio Player</h3>
        <p className="text-white/40 text-sm mt-1">
          {status === "live" ? "Transmisión en alta fidelidad" : "Pulsa reproducir para sintonizar"}
        </p>
      </div>

      <div className="flex items-center gap-6">
        <button
          onClick={isPlaying ? stopListening : startListening}
          disabled={status === "connecting"}
          className={`w-16 h-16 rounded-full flex items-center justify-center hover:scale-105 transition-all shadow-xl ${
            isPlaying ? 'bg-white text-black' : 'bg-emerald-500 text-white'
          } disabled:opacity-50`}
        >
          {isPlaying ? (
            <Pause className="w-8 h-8 fill-current" />
          ) : (
            status === "connecting" ? <Loader2 className="w-8 h-8 animate-spin" /> : <Play className="w-8 h-8 fill-current ml-1" />
          )}
        </button>
      </div>

      <div className="w-full flex flex-col gap-2 px-4">
        <div className="flex items-center justify-between text-[10px] text-white/30 uppercase tracking-widest font-bold">
          <div className="flex items-center gap-2">
            <Volume2 className="w-3 h-3" />
            Volumen
          </div>
          <span>{Math.round(volume * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
        />
      </div>

      {status === "live" && (
        <div className="flex items-center gap-2 text-[10px] text-emerald-400/60 font-mono">
          <Wifi className="w-3 h-3" />
          <span>Latencia optimizada</span>
        </div>
      )}
    </div>
  );
}

