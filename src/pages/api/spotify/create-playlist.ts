import type { NextApiRequest, NextApiResponse } from "next";
import { SpotifyApi, type AccessToken } from "@spotify/web-api-ts-sdk";
import { getToken } from "next-auth/jwt";

interface CreatePlaylistRequest {
  name: string;
  description?: string;
  tracks: string[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get token from the request
    const token = await getToken({ req }); // Removed unnecessary cast
    
    if (!token?.accessToken) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Get data from the request body
    const { name, description, tracks } = req.body as CreatePlaylistRequest;
    
    if (!name || !Array.isArray(tracks) || tracks.length === 0) {
      return res.status(400).json({ error: "Invalid request data" });
    }

    // Create a Spotify API client with the access token
    const clientId = process.env.SPOTIFY_CLIENT_ID ?? "";
    const expiresIn = token.expiresAt ? Math.max(0, Math.floor(token.expiresAt - Date.now() / 1000)) : 3600;
    const accessToken: AccessToken = {
      access_token: token.accessToken,
      token_type: "Bearer",
      expires_in: expiresIn,
      refresh_token: token.refreshToken ?? "", 
    };
    
    const spotify = SpotifyApi.withAccessToken(clientId, accessToken);
    
    // Get the current user's ID
    const currentUser = await spotify.currentUser.profile();
    
    // Create a new playlist
    const playlist = await spotify.playlists.createPlaylist(
      currentUser.id,
      {
        name,
        description: description ?? `Sauna playlist created for ${currentUser.display_name ?? 'you'}`,
        public: false
      }
    );
    
    // Add tracks to the playlist in batches of 100
    const trackUris = tracks.map((trackId: string) => `spotify:track:${trackId}`);
    
    for (let i = 0; i < trackUris.length; i += 100) {
      const batch = trackUris.slice(i, i + 100);
      await spotify.playlists.addItemsToPlaylist(playlist.id, batch);
    }
    
    // Return the created playlist
    return res.status(200).json({ playlist });
  } catch (error) {
    console.error("Error creating playlist:", error);
    const message = error instanceof Error ? error.message : "Failed to create playlist";
    const statusCode = message.includes("403") ? 403 : 500;
    return res.status(statusCode).json({ error: message });
  }
} 