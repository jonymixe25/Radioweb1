import React, { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Radio, Signal, Music, Plus, Play, Trash2, Volume2 } from "lucide-react";

interface PlaylistItem {
  id: string;
  file?: File;
  url?: string;
  name: string;
}

export default function Broadcaster() {
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const [micVolume, setMicVolume] = useState(1);
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [urlInput, setUrlInput] = useState("");
  const [isAddingUrl, setIsAddingUrl] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const micGainRef = useRef<GainNode | null>(null);
  const musicGainRef = useRef<GainNode | null>(null);
  const musicSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const startBroadcast = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      
      const micSource = audioContext.createMediaStreamSource(stream);
      const micGain = audioContext.createGain();
      micGain.gain.value = micVolume;
      micGainRef.current = micGain;

      const musicGain = audioContext.createGain();
      musicGain.gain.value = musicVolume;
      musicGainRef.current = musicGain;

      const mixer = audioContext.createGain();
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      micSource.connect(micGain);
      micGain.connect(mixer);
      musicGain.connect(mixer);
      mixer.connect(processor);
      processor.connect(audioContext.destination);

      // Connect to WebSocket
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const socket = new WebSocket(`${protocol}//${window.location.host}`);
      socketRef.current = socket;

      socket.onopen = () => {
        socket.send(JSON.stringify({ type: "IDENTIFY_BROADCASTER" }));
        
        processor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(inputData.buffer);
          }
        };

        setIsBroadcasting(true);
        setError(null);
      };

      socket.onerror = () => {
        setError("Error de conexión con el servidor");
        stopBroadcast();
      };

    } catch (err) {
      console.error("Error starting broadcast:", err);
      setError("No se pudo acceder al micrófono. Por favor, concede los permisos.");
    }
  };

  const stopBroadcast = () => {
    if (musicSourceRef.current) {
      musicSourceRef.current.stop();
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (socketRef.current) {
      socketRef.current.close();
    }
    setIsBroadcasting(false);
    setCurrentPlayingId(null);
  };

  const addToPlaylist = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newItems: PlaylistItem[] = Array.from(files).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name
    }));

    setPlaylist(prev => [...prev, ...newItems]);
  };

  const removeFromPlaylist = (id: string) => {
    if (currentPlayingId === id) {
      stopMusic();
    }
    setPlaylist(prev => prev.filter(item => item.id !== id));
  };

  const addUrlToPlaylist = () => {
    if (!urlInput.trim()) return;
    
    // Basic URL validation
    try {
      new URL(urlInput);
    } catch (e) {
      setError("URL no válida");
      return;
    }

    const name = urlInput.split('/').pop() || "Canción Web";
    const newItem: PlaylistItem = {
      id: Math.random().toString(36).substr(2, 9),
      url: urlInput,
      name: name.split('?')[0]
    };

    setPlaylist(prev => [...prev, newItem]);
    setUrlInput("");
    setIsAddingUrl(false);
  };

  const playMusic = async (item: PlaylistItem) => {
    if (!audioContextRef.current || !musicGainRef.current) {
      setError("Inicia la transmisión primero para reproducir música.");
      return;
    }

    if (currentPlayingId === item.id) {
      stopMusic();
      return;
    }

    stopMusic();

    try {
      let arrayBuffer: ArrayBuffer;
      
      if (item.file) {
        arrayBuffer = await item.file.arrayBuffer();
      } else if (item.url) {
        const response = await fetch(item.url);
        if (!response.ok) throw new Error("Failed to fetch audio from URL");
        arrayBuffer = await response.arrayBuffer();
      } else {
        throw new Error("No audio source found");
      }

      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(musicGainRef.current);
      source.start();
      
      musicSourceRef.current = source;
      setCurrentPlayingId(item.id);

      source.onended = () => {
        if (currentPlayingId === item.id) {
          setCurrentPlayingId(null);
        }
      };
    } catch (err) {
      console.error("Error playing music:", err);
      setError("Error al reproducir el archivo de audio.");
    }
  };

  const stopMusic = () => {
    if (musicSourceRef.current) {
      musicSourceRef.current.stop();
      musicSourceRef.current = null;
    }
    setCurrentPlayingId(null);
  };

  useEffect(() => {
    if (micGainRef.current) {
      micGainRef.current.gain.setTargetAtTime(micVolume, audioContextRef.current?.currentTime || 0, 0.1);
    }
  }, [micVolume]);

  useEffect(() => {
    if (musicGainRef.current) {
      musicGainRef.current.gain.setTargetAtTime(musicVolume, audioContextRef.current?.currentTime || 0, 0.1);
    }
  }, [musicVolume]);

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="glass p-8 rounded-3xl flex flex-col items-center gap-6 shadow-2xl">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 ${isBroadcasting ? 'bg-emerald-500/20 neon-glow animate-pulse' : 'bg-white/5'}`}>
          {isBroadcasting ? (
            <Radio className="w-12 h-12 text-emerald-400" />
          ) : (
            <Mic className="w-12 h-12 text-white/40" />
          )}
        </div>
        
        <div className="text-center">
          <h2 className="text-2xl font-display font-bold mb-2">Panel de Locutor</h2>
          <p className="text-white/60 text-sm">
            {isBroadcasting ? "Transmitiendo en vivo..." : "Listo para iniciar la transmisión"}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl w-full text-center">
            {error}
          </div>
        )}

        <div className="w-full grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold flex items-center gap-2">
              <Mic className="w-3 h-3" /> Micrófono
            </label>
            <input 
              type="range" min="0" max="2" step="0.1" value={micVolume} 
              onChange={(e) => setMicVolume(parseFloat(e.target.value))}
              className="accent-emerald-500"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold flex items-center gap-2">
              <Music className="w-3 h-3" /> Música
            </label>
            <input 
              type="range" min="0" max="1" step="0.1" value={musicVolume} 
              onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
              className="accent-purple-500"
            />
          </div>
        </div>

        <button
          onClick={isBroadcasting ? stopBroadcast : startBroadcast}
          className={`w-full py-4 rounded-2xl font-semibold transition-all flex items-center justify-center gap-2 ${
            isBroadcasting 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-emerald-500 hover:bg-emerald-600 text-white'
          }`}
        >
          {isBroadcasting ? (
            <><MicOff className="w-5 h-5" /> Detener Transmisión</>
          ) : (
            <><Mic className="w-5 h-5" /> Iniciar Transmisión</>
          )}
        </button>

        {isBroadcasting && (
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <Signal className="w-4 h-4" />
            <span>Señal estable</span>
          </div>
        )}
      </div>

      <div className="glass p-6 rounded-3xl flex flex-col gap-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music className="w-5 h-5 text-purple-400" />
              <h3 className="font-display font-bold">Lista de Reproducción</h3>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsAddingUrl(!isAddingUrl)}
                className={`p-2 rounded-xl transition-colors ${isAddingUrl ? 'bg-purple-500 text-white' : 'bg-white/5 hover:bg-white/10'}`}
                title="Agregar desde URL"
              >
                <Plus className={`w-4 h-4 transition-transform ${isAddingUrl ? 'rotate-45' : ''}`} />
              </button>
              <label className="cursor-pointer bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-colors" title="Subir archivo">
                <Plus className="w-4 h-4" />
                <input type="file" multiple accept="audio/*" onChange={addToPlaylist} className="hidden" />
              </label>
            </div>
          </div>

          {isAddingUrl && (
            <div className="flex gap-2 animate-in slide-in-from-top-2 duration-200">
              <input 
                type="text" 
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Pega la URL del audio..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-purple-500/50"
              />
              <button 
                onClick={addUrlToPlaylist}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors"
              >
                Agregar
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {playlist.length === 0 ? (
            <div className="text-center py-8 text-white/20 text-sm italic">
              No hay canciones en la lista
            </div>
          ) : (
            playlist.map((item) => (
              <div key={item.id} className={`flex items-center justify-between p-3 rounded-xl transition-all ${currentPlayingId === item.id ? 'bg-purple-500/20 border border-purple-500/30' : 'bg-white/5 hover:bg-white/10'}`}>
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${currentPlayingId === item.id ? 'bg-purple-500 text-white' : 'bg-white/5 text-white/40'}`}>
                    <Music className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium truncate text-white/80">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => playMusic(item)}
                    className={`p-2 rounded-lg transition-colors ${currentPlayingId === item.id ? 'bg-white text-black' : 'hover:bg-white/10 text-white/60'}`}
                  >
                    <Play className="w-4 h-4 fill-current" />
                  </button>
                  <button 
                    onClick={() => removeFromPlaylist(item.id)}
                    className="p-2 hover:bg-red-500/20 text-white/40 hover:text-red-400 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
