import type { NextApiRequest, NextApiResponse } from "next";
import {
  SpotifyApi,
  type Track,
  type PlaylistedTrack,
  type AudioFeatures,
} from "@spotify/web-api-ts-sdk";
import { getToken } from "next-auth/jwt";

interface SourcePlaylistRequestBody {
  playlistId: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Initial token fetch
    const token = await getToken({ req }); // Fetches the JWT containing session info

    if (!token?.accessToken) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const accessToken = token.accessToken; // Extract token for logging

    // Get the playlist ID from the request body
    const { playlistId } = req.body as SourcePlaylistRequestBody;

    if (!playlistId) {
      return res.status(400).json({ error: "Playlist ID is required" });
    }

    // Initial Spotify client setup
    const clientId = process.env.SPOTIFY_CLIENT_ID ?? "";

    // Create initial SDK instance for fetching playlist items
    const initialAccessToken = {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: token.expiresAt
        ? Math.max(0, Math.floor(token.expiresAt - Date.now() / 1000))
        : 3600,
      refresh_token: token.refreshToken ?? "",
      expires_at: token.expiresAt ?? 0,
    };
    const initialSpotify = SpotifyApi.withAccessToken(
      clientId,
      initialAccessToken,
    );

    // Fetch tracks from the playlist using the SDK's methods
    const allPlaylistTracks: PlaylistedTrack<Track>[] = [];
    let offset = 0;
    const limit = 50; // Use a valid limit (e.g., 50)
    let hasMoreTracks = true;

    // Fetch tracks with pagination
    while (hasMoreTracks) {
      try {
        const playlistTracks = await initialSpotify.playlists.getPlaylistItems(
          playlistId,
          undefined,
          undefined,
          limit,
          offset,
        ); // Use initialSpotify here

        if (playlistTracks.items.length === 0) {
          hasMoreTracks = false;
          break;
        }

        // Add fetched items to our collection
        allPlaylistTracks.push(...playlistTracks.items);

        // Move to next page
        offset += limit;

        // Check if we've reached the end
        if (!playlistTracks.next) {
          // Check if there's a next page URL
          hasMoreTracks = false;
        }
      } catch (error) {
        console.error("Error fetching playlist tracks page:", error);
        // Stop pagination on error and potentially inform the user
        return res
          .status(500)
          .json({ error: "Failed to fetch all playlist tracks." });
      }
    }

    // Extract valid track objects and their IDs
    const validTracks: Track[] = allPlaylistTracks
      .map((item) => item.track)
      .filter((track): track is Track => !!track?.id); // Use optional chaining

    const trackIds = validTracks.map((track) => track.id);

    if (trackIds.length === 0) {
      return res.status(200).json({ tracks: [] }); // No valid tracks found
    }

    // The Spotify client initialized earlier should still be valid due to NextAuth's refresh logic.
    // No need to re-fetch token or re-initialize the client here.
    const allAudioFeatures: AudioFeatures[] = [];

    // Get audio features for all tracks in batches of 100
    for (let i = 0; i < trackIds.length; i += 100) {
      const batch = trackIds.slice(i, i + 100);
      try {
        // Use the SDK instance initialized outside the loop
        const featuresResult = await initialSpotify.tracks.audioFeatures(batch);

        // Filter out null results from the features array if any
        // The type guard (f is AudioFeatures) correctly narrows the type for validFeatures
        const validFeatures = featuresResult.filter(
          (f): f is AudioFeatures => f !== null,
        );
        allAudioFeatures.push(...validFeatures);
      } catch (error) {
        console.error(
          `Error fetching audio features for batch ${Math.floor(i / 100) + 1}:`,
          error,
        ); // Keep error log
        const message =
          error instanceof Error
            ? error.message
            : "Failed to fetch audio features for a batch";
        const statusCode =
          message.includes("403") || message.includes("Bad OAuth") ? 403 : 500;
        // Stop processing if any batch fails
        return res
          .status(statusCode)
          .json({
            error: `Analysis failed during audio feature fetch: ${message}`,
          });
      }
    }

    // Combine track data with audio features
    const tracksWithFeatures = validTracks.map((track) => {
      const features = allAudioFeatures.find((f) => f.id === track.id);
      return {
        id: track.id,
        name: track.name,
        artists: track.artists.map((artist) => artist.name),
        album: track.album?.name ?? "Unknown Album",
        duration_ms: track.duration_ms,
        audioFeatures: features, // features can be undefined if not found
      };
    });

    // Return the analyzed tracks
    return res.status(200).json({ tracks: tracksWithFeatures });
  } catch (error) {
    console.error("Overall error analyzing playlist:", error);
    const message =
      error instanceof Error ? error.message : "Failed to analyze playlist";
    // Determine status code based on error if possible (e.g., 403 for permission issues)
    const statusCode =
      message.includes("403") || message.includes("Bad OAuth") ? 403 : 500;
    return res.status(statusCode).json({ error: message });
  }
}
