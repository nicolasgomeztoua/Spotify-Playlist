import type { NextApiRequest, NextApiResponse } from "next";
import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import { getToken } from "next-auth/jwt";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get token from the request
    // Using any for req is necessary to work with NextAuth's typing constraints
    const token = await getToken({ req });
    
    if (!token?.accessToken) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Create a Spotify API client with the access token
    // The SDK requires a clientId and an access token to initialize
    const clientId = process.env.SPOTIFY_CLIENT_ID!;
    const accessToken = {
      access_token: token.accessToken,
      token_type: "Bearer",
      expires_in: 3600, // Default value
      refresh_token: token.refreshToken! || "", // Include refresh token if available
      expires_at: token.expiresAt ?? 0
    };
    
    const spotify = SpotifyApi.withAccessToken(clientId, accessToken);
    
    // Fetch the user's playlists
    const response = await spotify.currentUser.playlists.playlists(50, 0);
    
    // Return the playlists
    return res.status(200).json({ playlists: response.items });
  } catch (error) {
    console.error("Error fetching playlists:", error);
    return res.status(500).json({ error: "Failed to fetch playlists" });
  }
} 