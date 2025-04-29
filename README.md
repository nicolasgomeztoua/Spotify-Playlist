# Spotify Playlist Generator for Sauna Sessions

A web application that automates the creation of music playlists for sauna experiences based on song characteristics like BPM, energy, acousticness, and instrumentalness.

## Features

- Authentication with Spotify
- Analysis of source playlist songs for audio features
- Classification of songs into "Calm" or "Building Energy" categories
- Automated generation of 38-minute playlists optimized for sauna sessions
- Creates new playlists directly in your Spotify account
- Simple dashboard interface

## Setup

### Prerequisites

- Node.js (v18 or newer)
- PostgreSQL database
- Spotify Developer account

### Spotify Developer Setup

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/)
2. Create a new application
3. Set the redirect URI to `http://localhost:3000/api/auth/callback/spotify`
4. Note your Client ID and Client Secret

### Environment Variables

Create a `.env` file in the root directory with:

```
# Spotify API credentials
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# Auth secret - Generate a random string
AUTH_SECRET=your_auth_secret

# Database URL for PostgreSQL
DATABASE_URL=postgres://postgres:postgres@localhost:5432/spotify_playlist
```

### Database Setup

1. Run `./start-database.sh` to start a PostgreSQL instance (if using Docker)
2. Run `npm run db:push` to set up the database schema

### Installation and Running

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` to access the application.

## Usage

1. Sign in with your Spotify account
2. Enter the ID of a source playlist (you can find this in the Spotify URL)
3. The system will analyze songs and classify them as "Calm" or "Building Energy"
4. Select your session type and enter a name for your new playlist
5. Click "Create 38-min Playlist" to generate and save a new playlist to your Spotify account

## Technical Details

- Built with Next.js, TypeScript, and TailwindCSS
- Uses Spotify Web API TypeScript SDK
- Song classification based on:
  - BPM (Tempo)
  - Energy level
  - Acousticness
  - Instrumentalness
- Playlists optimized to fit in exactly 38 minutes with appropriate energy progression
