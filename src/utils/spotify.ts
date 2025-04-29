import { AccessToken, SpotifyApi } from '@spotify/web-api-ts-sdk';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../pages/api/auth/[...nextauth]';

// Function to create a server-side Spotify API instance
export async function getSpotifyApiServer() {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken) {
    throw new Error('No access token available');
  }
  
  // Create a custom instance with the user's access token
  const accessToken: AccessToken = {
    access_token: session.accessToken,
    token_type: 'Bearer',
    expires_in: 3600, // Default to 1 hour, this is just a placeholder
    refresh_token: '',  // Required field but we don't need it
  };
  
  return SpotifyApi.withAccessToken('', accessToken);
}

// Types for playlist analysis
export type SessionType = 'calm' | 'building';

export interface SongAnalysis {
  id: string;
  name: string;
  artists: string[];
  duration_ms: number;
  tempo: number; // BPM
  energy: number; // 0-1
  acousticness: number; // 0-1
  instrumentalness: number; // 0-1
  valence: number; // 0-1, musical positiveness
  uri: string;
}

// Classify songs based on their audio features
export function classifySong(analysis: SongAnalysis): SessionType {
  // Song is calm if it has low energy, high acousticness, or high instrumentalness
  if (
    analysis.tempo < 100 || 
    analysis.energy < 0.5 || 
    analysis.acousticness > 0.6 || 
    analysis.instrumentalness > 0.5
  ) {
    return 'calm';
  } else {
    return 'building';
  }
}

// Get a formatted duration from milliseconds (mm:ss)
export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Build a playlist that fits within the target duration
export function buildPlaylist(
  songs: SongAnalysis[],
  sessionType: SessionType,
  targetDurationMs: number = 38 * 60 * 1000 // 38 minutes in milliseconds
): SongAnalysis[] {
  // Filter songs by session type
  const filteredSongs = songs.filter(song => classifySong(song) === sessionType);
  
  // Sort songs by energy (low to high for calm, high to low for building)
  const sortedSongs = [...filteredSongs].sort((a, b) => {
    if (sessionType === 'calm') {
      return a.energy - b.energy; // Low to high energy for calm sessions
    } else {
      return b.energy - a.energy; // High to low energy for building sessions
    }
  });
  
  // Build playlist to fit the target duration
  const playlist: SongAnalysis[] = [];
  let currentDuration = 0;
  
  for (const song of sortedSongs) {
    if (currentDuration + song.duration_ms <= targetDurationMs) {
      playlist.push(song);
      currentDuration += song.duration_ms;
    } else {
      // Try to find a song that fits exactly
      const remainingDuration = targetDurationMs - currentDuration;
      const perfectFit = sortedSongs.find(
        s => s.duration_ms <= remainingDuration && !playlist.includes(s)
      );
      
      if (perfectFit) {
        playlist.push(perfectFit);
        currentDuration += perfectFit.duration_ms;
      }
      
      break;
    }
  }
  
  return playlist;
} 