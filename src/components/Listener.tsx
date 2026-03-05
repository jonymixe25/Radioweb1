import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, Radio } from "lucide-react";

interface ListenerProps {
  coverUrl?: string;
}

export default function Listener({ coverUrl }: ListenerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  const startListening = () => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    socketRef.current = socket;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    audioContextRef.current = audioContext;
    
    const gainNode = audioContext.createGain();
    gainNode.gain.value = volume;
    gainNode.connect(audioContext.destination);
    gainNodeRef.current = gainNode;

    socket.onmessage = async (event) => {
      if (event.data instanceof Blob) {
        setIsLive(true);
        const arrayBuffer = await event.data.arrayBuffer();
        const float32Array = new Float32Array(arrayBuffer);
        
        if (audioContextRef.current && isPlaying && gainNodeRef.current) {
          const buffer = audioContextRef.current.createBuffer(1, float32Array.length, 16000);
          buffer.getChannelData(0).set(float32Array);
          
          const source = audioContextRef.current.createBufferSource();
          source.buffer = buffer;
          source.connect(gainNodeRef.current);
          
          const currentTime = audioContextRef.current.currentTime;
          if (nextStartTimeRef.current < currentTime) {
            // Add a small buffer offset (0.2s) to handle network jitter
            nextStartTimeRef.current = currentTime + 0.2;
          }
          
          source.start(nextStartTimeRef.current);
          nextStartTimeRef.current += buffer.duration;
        }
      }
    };

    socket.onclose = () => {
      setIsLive(false);
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
    setIsLive(false);
  };

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(volume, audioContextRef.current?.currentTime || 0, 0.1);
    }
  }, [volume]);

  return (
    <div className="glass p-8 rounded-3xl flex flex-col items-center gap-6 shadow-2xl w-full max-w-md">
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-white/5 group">
        {coverUrl ? (
          <img 
            src={coverUrl} 
            alt="Carátula de Radio" 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Radio className="w-20 h-20 text-white/10" />
          </div>
        )}
        
        {isLive && (
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest animate-pulse">
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
            En Vivo
          </div>
        )}
      </div>

      <div className="w-full text-center">
        <h3 className="text-xl font-display font-bold">Reproductor Lysten Radio</h3>
        <p className="text-white/40 text-sm mt-1">Sintonizando la frecuencia digital</p>
      </div>

      <div className="flex items-center gap-6">
        <button
          onClick={isPlaying ? stopListening : startListening}
          className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-xl"
        >
          {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
        </button>
      </div>

      <div className="w-full flex items-center gap-3 px-4">
        <Volume2 className="w-4 h-4 text-white/40" />
        <input 
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-white"
        />
      </div>
    </div>
  );
}
