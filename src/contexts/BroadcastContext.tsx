import React, { createContext, useContext, useState, useRef, useEffect } from "react";

interface BroadcastContextType {
  isBroadcasting: boolean;
  isMicActive: boolean;
  activeSongId: string | null;
  isMonitoring: boolean;
  setIsMonitoring: (value: boolean) => void;
  startMic: () => Promise<void>;
  stopMic: () => void;
  playSong: (songUrl: string, songId: string, onEnd?: () => void) => Promise<void>;
  stopSong: () => void;
  error: string | null;
}

const BroadcastContext = createContext<BroadcastContextType | undefined>(undefined);

export function BroadcastProvider({ children }: { children: React.ReactNode }) {
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [activeSongId, setActiveSongId] = useState<string | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const songIntervalRef = useRef<number | null>(null);
  const monitorGainRef = useRef<GainNode | null>(null);

  const connectSocket = () => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return Promise.resolve();
    
    return new Promise<void>((resolve, reject) => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const socket = new WebSocket(`${protocol}//${window.location.host}`);
      socketRef.current = socket;

      socket.onopen = () => {
        socket.send(JSON.stringify({ type: "IDENTIFY_BROADCASTER" }));
        resolve();
      };

      socket.onerror = () => {
        setError("Error de conexión con el servidor");
        reject();
      };
    });
  };

  const startMic = async () => {
    try {
      await connectSocket();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      }
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      micProcessorRef.current = processor;

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(inputData.buffer);
        }
      };

      setIsMicActive(true);
      setIsBroadcasting(true);
      setError(null);
    } catch (err) {
      setError("No se pudo acceder al micrófono.");
    }
  };

  const stopMic = () => {
    if (micProcessorRef.current) {
      micProcessorRef.current.disconnect();
    }
    setIsMicActive(false);
    if (!activeSongId) setIsBroadcasting(false);
  };

  const playSong = async (songUrl: string, songId: string, onEnd?: () => void) => {
    console.log("Attempting to play song:", songUrl);
    if (!songUrl) {
      console.error("No song URL provided");
      return;
    }

    try {
      await connectSocket();
      stopSong(); // Stop any current song

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      }

      let response;
      const fetchUrl = songUrl.startsWith("/") ? window.location.origin + songUrl : songUrl;
      
      try {
        console.log("Fetching song directly:", fetchUrl);
        response = await fetch(fetchUrl);
        if (!response.ok) throw new Error(`Direct fetch failed with status: ${response.status}`);
      } catch (err: any) {
        console.warn("Direct fetch failed or CORS issue:", err.message);
        
        // Check if it's a local URL or blob URL
        const isLocal = songUrl.startsWith("/") || songUrl.startsWith("blob:") || songUrl.includes(window.location.host);
        
        if (isLocal) {
          console.error("Local/Internal resource failed to load:", songUrl);
          throw new Error(`No se pudo cargar el recurso local: ${err.message}`);
        }

        console.log("Trying proxy for external URL:", songUrl);
        try {
          response = await fetch(`/api/proxy-audio?url=${encodeURIComponent(songUrl)}`);
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Proxy fetch failed (${response.status}): ${errorText}`);
          }
        } catch (proxyErr: any) {
          console.error("Proxy fetch failed:", proxyErr.message);
          throw new Error(`Error de red al intentar cargar la canción externa: ${proxyErr.message}`);
        }
      }

      console.log("Song fetched successfully, decoding...");
      const arrayBuffer = await response.arrayBuffer();
      
      const tempContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const decodedBuffer = await tempContext.decodeAudioData(arrayBuffer);
      
      const offlineContext = new OfflineAudioContext(
        1,
        Math.ceil(decodedBuffer.duration * 16000),
        16000
      );
      
      const source = offlineContext.createBufferSource();
      source.buffer = decodedBuffer;
      source.connect(offlineContext.destination);
      source.start();
      
      const resampledBuffer = await offlineContext.startRendering();
      await tempContext.close();

      const data = resampledBuffer.getChannelData(0);
      const chunkSize = 4096;
      let offset = 0;
      const startTime = performance.now();

      const sendNextChunk = () => {
        if (offset >= data.length || !songIntervalRef.current) {
          if (offset >= data.length) {
            stopSong();
            if (onEnd) onEnd();
          }
          return;
        }

        const chunk = data.slice(offset, offset + chunkSize);
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(chunk.buffer);
        }

        // Monitoring
        if (isMonitoring && audioContextRef.current) {
          const buffer = audioContextRef.current.createBuffer(1, chunk.length, 16000);
          buffer.getChannelData(0).set(chunk);
          const source = audioContextRef.current.createBufferSource();
          source.buffer = buffer;
          source.connect(audioContextRef.current.destination);
          source.start();
        }

        offset += chunkSize;

        const elapsed = performance.now() - startTime;
        const expectedElapsed = (offset / 16000) * 1000;
        const delay = Math.max(0, expectedElapsed - elapsed);
        
        songIntervalRef.current = window.setTimeout(sendNextChunk, delay);
      };

      songIntervalRef.current = window.setTimeout(sendNextChunk, 0);

      setActiveSongId(songId);
      setIsBroadcasting(true);
      setError(null);
    } catch (err: any) {
      console.error("Error playing song:", err);
      setError(`Error al reproducir la canción: ${err.message || "Error de red"}`);
    }
  };

  const stopSong = () => {
    if (songIntervalRef.current) {
      clearTimeout(songIntervalRef.current);
      songIntervalRef.current = null;
    }
    setActiveSongId(null);
    if (!isMicActive) setIsBroadcasting(false);
  };

  return (
    <BroadcastContext.Provider value={{ 
      isBroadcasting, 
      isMicActive, 
      activeSongId, 
      isMonitoring,
      setIsMonitoring,
      startMic, 
      stopMic, 
      playSong, 
      stopSong, 
      error 
    }}>
      {children}
    </BroadcastContext.Provider>
  );
}

export function useBroadcast() {
  const context = useContext(BroadcastContext);
  if (context === undefined) {
    throw new Error("useBroadcast must be used within a BroadcastProvider");
  }
  return context;
}
