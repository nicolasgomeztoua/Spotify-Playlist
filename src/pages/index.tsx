import { signIn, signOut, useSession } from "next-auth/react";
import Head from "next/head";
import Image from "next/image"; // Import next/image
import { useState, useEffect, useCallback } from "react"; // Add useCallback
import type { Session } from "next-auth";

interface Playlist {
  id: string;
  name: string;
  images: Array<{ url: string }>;
  tracks: { total: number };
}

interface Track {
  id: string;
  audioFeatures?: {
    energy: number;
    tempo: number;
  };
}

export default function Home() {
  const { data: sessionData } = useSession();
  const [step, setStep] = useState<'selectPlaylist' | 'analyze' | 'results'>('selectPlaylist');
  const [sourcePlaylistId, setSourcePlaylistId] = useState<string>('');
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzedTracks, setAnalyzedTracks] = useState<Track[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState<string>('Sauna Playlist');
  const [saunaSessionType, setSaunaSessionType] = useState<'relaxing' | 'energizing' | 'balanced'>('relaxing');

  // Fetch user's playlists (wrapped in useCallback)
  const fetchPlaylists = useCallback(async () => {
    if (!sessionData?.accessToken) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/spotify/user-playlists', {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch playlists');
      }

      // Add type annotation for the fetched data
      const data: { playlists: Playlist[] } = await response.json() as { playlists: Playlist[] };
      setPlaylists(data.playlists ?? []);
    } catch (err) {
      setError('Failed to load playlists. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  // Add dependencies for useCallback
  }, [sessionData?.accessToken, setIsLoading, setError, setPlaylists]);

  // Analyze the selected playlist
  const analyzePlaylist = async () => {
    if (!sourcePlaylistId || !sessionData?.accessToken) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/spotify/source-playlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playlistId: sourcePlaylistId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze playlist');
      }

      // Add type annotation for the fetched data
      const data: { tracks: Track[] } = await response.json() as { tracks: Track[] };
      setAnalyzedTracks(data.tracks ?? []);
      setStep('analyze');
    } catch (err) {
      setError('Failed to analyze playlist. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new playlist based on analyzed tracks
  const createPlaylist = async () => {
    if (analyzedTracks.length === 0 || !sessionData?.accessToken) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Filter tracks based on sauna session type
      const filteredTracks = filterTracksBySaunaType(analyzedTracks, saunaSessionType);
      
      const response = await fetch('/api/spotify/create-playlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          name: newPlaylistName,
          tracks: filteredTracks.map(track => track.id),
          description: `${saunaSessionType} sauna playlist created with Sauna Playlist Generator`
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create playlist');
      }
      
      // No need to use the response data here
      setStep('results');
    } catch (err) {
      setError('Failed to create playlist. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter tracks based on sauna session type
  const filterTracksBySaunaType = (tracks: Track[], sessionType: 'relaxing' | 'energizing' | 'balanced'): Track[] => {
    // This is a simplified version - in a real app, this would use the audio features
    // to make intelligent decisions about which tracks fit the session type
    switch (sessionType) {
      case 'relaxing':
        return tracks.filter(track => 
          track.audioFeatures?.energy !== undefined && 
          track.audioFeatures?.tempo !== undefined && 
          track.audioFeatures.energy < 0.5 && 
          track.audioFeatures.tempo < 100);
      case 'energizing':
        return tracks.filter(track => 
          track.audioFeatures?.energy !== undefined && 
          track.audioFeatures?.tempo !== undefined && 
          track.audioFeatures.energy > 0.6 && 
          track.audioFeatures.tempo > 110);
      case 'balanced':
      default:
        return tracks.filter(track => 
          track.audioFeatures?.energy !== undefined && 
          track.audioFeatures?.tempo !== undefined && 
          track.audioFeatures.energy >= 0.4 && 
          track.audioFeatures.energy <= 0.7 && 
          track.audioFeatures.tempo >= 90 && 
          track.audioFeatures.tempo <= 120);
    }
  };

  // When component mounts, fetch playlists if user is authenticated
  useEffect(() => {
    if (sessionData?.accessToken) {
      // Add void operator to handle floating promise
      void fetchPlaylists();
    }
  // Add fetchPlaylists to dependency array
  }, [sessionData, fetchPlaylists]);

  return (
    <>
      <Head>
        <title>Sauna Playlist Generator</title>
        <meta name="description" content="Generate customized playlists for your sauna sessions" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <main className="flex min-h-screen flex-col bg-gradient-to-b from-[#16161e] to-[#1e1e2a]">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <header className="mb-8 flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white">Sauna Playlist Generator</h1>
            <AuthButton sessionData={sessionData} />
          </header>

          {/* Main content */}
          {!sessionData ? (
            <div className="flex flex-col items-center justify-center rounded-xl bg-white/5 p-12 text-center">
              <h2 className="mb-4 text-2xl font-semibold text-white">Welcome to Sauna Playlist Generator</h2>
              <p className="mb-6 text-lg text-gray-300">
                Create customized Spotify playlists for your sauna sessions based on mood and energy levels.
              </p>
              <button
                className="rounded-full bg-green-600 px-8 py-3 font-semibold text-white transition hover:bg-green-700"
                onClick={() => void signIn("spotify")}
              >
                Sign in with Spotify
              </button>
            </div>
          ) : (
            <div>
              {isLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                  <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-green-500"></div>
                </div>
              )}
              
              {error && (
                <div className="mb-4 rounded-md bg-red-500/20 p-4 text-red-200">
                  <p>{error}</p>
                </div>
              )}
              
              {step === 'selectPlaylist' && (
                <div className="rounded-xl bg-white/5 p-6">
                  <h2 className="mb-4 text-xl font-semibold text-white">Select a Source Playlist</h2>
                  
                  {playlists.length === 0 ? (
                    <button
                      className="mb-4 rounded-md bg-green-600 px-4 py-2 font-medium text-white transition hover:bg-green-700"
                      onClick={fetchPlaylists}
                    >
                      Load My Playlists
                    </button>
                  ) : (
                    <div className="mb-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                      {playlists.map((playlist) => (
                        <button
                          key={playlist.id}
                          className={`flex flex-col items-center rounded-md p-4 text-center transition hover:bg-white/10 ${
                            sourcePlaylistId === playlist.id ? 'bg-white/20 ring-2 ring-green-500' : 'bg-white/5'
                          }`}
                          onClick={() => setSourcePlaylistId(playlist.id)}
                        >
                          {/* Replace img with next/image Image */}
                          <Image
                            src={playlist.images?.[0]?.url ?? '/placeholder-playlist.png'} // Use ?? instead of ||
                            alt={playlist.name}
                            width={128} // Add width (32 * 4)
                            height={128} // Add height (32 * 4)
                            className="mb-2 rounded-md object-cover" // Removed h-32 w-32 as width/height are set
                          />
                          <p className="text-sm font-medium text-white">{playlist.name}</p>
                          <p className="text-xs text-gray-400">{playlist.tracks.total} tracks</p>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {sourcePlaylistId && (
                    <button
                      className="w-full rounded-md bg-green-600 py-2 font-medium text-white transition hover:bg-green-700"
                      onClick={analyzePlaylist}
                    >
                      Analyze Playlist
                    </button>
                  )}
                </div>
              )}
              
              {step === 'analyze' && (
                <div className="rounded-xl bg-white/5 p-6">
                  <h2 className="mb-4 text-xl font-semibold text-white">Customize Your Sauna Playlist</h2>
                  
                  <div className="mb-6 grid gap-6 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-300">Playlist Name</label>
                      <input
                        type="text"
                        value={newPlaylistName}
                        onChange={(e) => setNewPlaylistName(e.target.value)}
                        className="w-full rounded-md border border-gray-700 bg-gray-800 p-2 text-white"
                        placeholder="Enter playlist name"
                      />
                    </div>
                    
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-300">Sauna Session Type</label>
                      <select
                        value={saunaSessionType}
                        onChange={(e) => setSaunaSessionType(e.target.value as 'relaxing' | 'energizing' | 'balanced')}
                        className="w-full rounded-md border border-gray-700 bg-gray-800 p-2 text-white"
                      >
                        <option value="relaxing">Relaxing</option>
                        <option value="energizing">Energizing</option>
                        <option value="balanced">Balanced</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="mb-2 text-lg font-medium text-white">Analyzed Tracks</h3>
                    <p className="mb-4 text-sm text-gray-400">
                      We analyzed {analyzedTracks.length} tracks from your playlist. 
                      Approximately {filterTracksBySaunaType(analyzedTracks, saunaSessionType).length} tracks match your selected sauna session type.
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-4">
                    <button
                      className="rounded-md bg-gray-700 px-4 py-2 font-medium text-white transition hover:bg-gray-600"
                      onClick={() => setStep('selectPlaylist')}
                    >
                      Back
                    </button>
                    <button
                      className="rounded-md bg-green-600 px-4 py-2 font-medium text-white transition hover:bg-green-700"
                      onClick={createPlaylist}
                    >
                      Create Playlist
                    </button>
                  </div>
                </div>
              )}
              
              {step === 'results' && (
                <div className="rounded-xl bg-white/5 p-6 text-center">
                  <div className="mb-8 flex flex-col items-center">
                    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h2 className="mb-2 text-2xl font-bold text-white">Playlist Created!</h2>
                    <p className="text-gray-300">Your new sauna playlist is ready to use.</p>
                  </div>
                  
                  <div className="flex flex-wrap justify-center gap-4">
                    <button
                      className="rounded-md bg-green-600 px-4 py-2 font-medium text-white transition hover:bg-green-700"
                      onClick={() => window.open('https://open.spotify.com/playlist/recently-created', '_blank')}
                    >
                      Open in Spotify
                    </button>
                    <button
                      className="rounded-md bg-gray-700 px-4 py-2 font-medium text-white transition hover:bg-gray-600"
                      onClick={() => setStep('selectPlaylist')}
                    >
                      Create Another Playlist
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function AuthButton({ sessionData }: { sessionData: Session | null }) {
  return (
    <button
      className="rounded-full bg-white/10 px-4 py-2 font-medium text-white no-underline transition hover:bg-white/20"
      onClick={sessionData ? () => void signOut() : () => void signIn("spotify")}
    >
      {sessionData ? "Sign out" : "Sign in"}
    </button>
  );
}
