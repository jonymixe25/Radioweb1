import React, { useState, useRef, useEffect } from "react";
import { Music, Play, Plus, Trash2, ListMusic, Volume2, Upload, Link as LinkIcon, X, Square, Loader2 } from "lucide-react";
import { useBroadcast } from "../contexts/BroadcastContext";

interface Song {
  id: string;
  title: string;
  artist: string;
  url: string;
}

interface Playlist {
  id: string;
  name: string;
  songs: Song[];
}

export default function PlaylistLibrary() {
  const { playSong, stopSong, activeSongId } = useBroadcast();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAutoplay, setIsAutoplay] = useState(true);

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    try {
      const response = await fetch("/api/playlists");
      const data = await response.json();
      setPlaylists(data);
    } catch (err) {
      console.error("Error fetching playlists:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [showAddSong, setShowAddSong] = useState(false);
  const [newSong, setNewSong] = useState({ title: "", artist: "", url: "" });
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSongEnd = (playlistId: string, currentSongId: string) => {
    if (!isAutoplay) return;
    
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    const currentIndex = playlist.songs.findIndex(s => s.id === currentSongId);
    if (currentIndex !== -1 && currentIndex < playlist.songs.length - 1) {
      const nextSong = playlist.songs[currentIndex + 1];
      playSong(nextSong.url, nextSong.id, () => handleSongEnd(playlistId, nextSong.id));
    }
  };

  const startPlaylist = (playlistId: string) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist && playlist.songs.length > 0) {
      const firstSong = playlist.songs[0];
      playSong(firstSong.url, firstSong.id, () => handleSongEnd(playlistId, firstSong.id));
    }
  };

  const addPlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    const id = Date.now().toString();
    try {
      await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: newPlaylistName })
      });
      setPlaylists([...playlists, { id, name: newPlaylistName, songs: [] }]);
      setNewPlaylistName("");
    } catch (err) {
      console.error("Error adding playlist:", err);
    }
  };

  const deletePlaylist = async (id: string) => {
    try {
      await fetch(`/api/playlists/${id}`, { method: "DELETE" });
      setPlaylists(playlists.filter(p => p.id !== id));
      if (activePlaylistId === id) setActivePlaylistId(null);
    } catch (err) {
      console.error("Error deleting playlist:", err);
    }
  };

  const addSongToActive = async () => {
    if (!activePlaylistId || !newSong.title || !newSong.url) return;
    
    setIsSaving(true);
    const songId = Date.now().toString();
    try {
      await fetch(`/api/playlists/${activePlaylistId}/songs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newSong, id: songId })
      });
      
      setPlaylists(playlists.map(p => {
        if (p.id === activePlaylistId) {
          return {
            ...p,
            songs: [...p.songs, { ...newSong, id: songId }]
          };
        }
        return p;
      }));
      
      setNewSong({ title: "", artist: "", url: "" });
      setShowAddSong(false);
    } catch (err) {
      console.error("Error adding song:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setNewSong({
        ...newSong,
        title: newSong.title || file.name.replace(/\.[^/.]+$/, ""),
        url: url
      });
    }
  };

  const activePlaylist = playlists.find(p => p.id === activePlaylistId);

  return (
    <div className="glass p-6 rounded-3xl flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-display font-bold flex items-center gap-2">
          <ListMusic className="w-5 h-5 text-emerald-400" />
          Biblioteca de Playlists
        </h3>
        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
          <span className="text-[10px] uppercase font-bold text-white/40">Autoplay</span>
          <button
            onClick={() => setIsAutoplay(!isAutoplay)}
            className={`w-8 h-4 rounded-full transition-colors relative ${isAutoplay ? 'bg-emerald-500' : 'bg-white/10'}`}
          >
            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${isAutoplay ? 'left-4.5' : 'left-0.5'}`} />
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newPlaylistName}
          onChange={(e) => setNewPlaylistName(e.target.value)}
          placeholder="Nueva playlist..."
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-500/50 flex-1"
        />
        <button
          onClick={addPlaylist}
          className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-xl transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 overflow-y-auto max-h-[200px] pr-2 custom-scrollbar">
        {playlists.map((playlist) => (
          <div
            key={playlist.id}
            onClick={() => {
              setActivePlaylistId(playlist.id);
              setShowAddSong(false);
            }}
            className={`group flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border ${
              activePlaylistId === playlist.id
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-white/5 border-transparent hover:bg-white/10"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                activePlaylistId === playlist.id ? "bg-emerald-500 text-white" : "bg-white/5 text-white/40"
              }`}>
                <Music className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">{playlist.name}</h4>
                <p className="text-white/40 text-xs">{playlist.songs.length} canciones</p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deletePlaylist(playlist.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-2 text-white/20 hover:text-red-400 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {activePlaylist && (
        <div className="mt-4 pt-6 border-t border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-emerald-400 text-sm uppercase tracking-wider">Contenido: {activePlaylist.name}</h4>
            <div className="flex gap-2">
              <button 
                onClick={() => startPlaylist(activePlaylistId)}
                className="flex items-center gap-2 text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
              >
                <Play className="w-3 h-3 fill-current" />
                Iniciar Playlist
              </button>
              <button 
                onClick={() => setShowAddSong(!showAddSong)}
                className="flex items-center gap-2 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg transition-colors"
              >
                {showAddSong ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                {showAddSong ? "Cancelar" : "Añadir Canción"}
              </button>
            </div>
          </div>

          {showAddSong && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Título"
                  value={newSong.title}
                  onChange={(e) => setNewSong({...newSong, title: e.target.value})}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500/50"
                />
                <input
                  type="text"
                  placeholder="Artista"
                  value={newSong.artist}
                  onChange={(e) => setNewSong({...newSong, artist: e.target.value})}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20" />
                  <input
                    type="text"
                    placeholder="URL del audio (mp3, wav...)"
                    value={newSong.url}
                    onChange={(e) => setNewSong({...newSong, url: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="audio/*"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-colors border border-white/10"
                  title="Subir archivo"
                >
                  <Upload className="w-4 h-4 text-white/60" />
                </button>
              </div>
              <button
                onClick={addSongToActive}
                disabled={!newSong.title || !newSong.url || isSaving}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-2"
              >
                {isSaving ? <><Loader2 className="w-3 h-3 animate-spin" /> Guardando...</> : "Guardar Canción"}
              </button>
            </div>
          )}

          <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500/40" />
              </div>
            ) : activePlaylist.songs.length === 0 ? (
              <p className="text-white/20 text-xs text-center py-4 italic">Esta playlist está vacía</p>
            ) : (
              activePlaylist.songs.map((song) => (
                <div key={song.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors group">
                  <div className="flex items-center gap-3">
                    <Volume2 className="w-4 h-4 text-emerald-500/50" />
                    <div>
                      <p className="text-sm font-medium">{song.title}</p>
                      <p className="text-[10px] text-white/40">{song.artist}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeSongId === song.id ? (
                      <button 
                        onClick={stopSong}
                        className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                        title="Detener Transmisión"
                      >
                        <Square className="w-4 h-4 fill-current" />
                      </button>
                    ) : (
                      <button 
                        onClick={() => playSong(song.url, song.id, () => handleSongEnd(activePlaylistId, song.id))}
                        className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"
                        title="Transmitir Canción"
                      >
                        <Play className="w-4 h-4 fill-current" />
                      </button>
                    )}
                    <button 
                      onClick={async () => {
                        try {
                          await fetch(`/api/playlists/${activePlaylistId}/songs/${song.id}`, { method: "DELETE" });
                          setPlaylists(playlists.map(p => {
                            if (p.id === activePlaylistId) {
                              return { ...p, songs: p.songs.filter(s => s.id !== song.id) };
                            }
                            return p;
                          }));
                        } catch (err) {
                          console.error("Error deleting song:", err);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-white/10 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
