import NextAuth, { type NextAuthOptions, type Session as NextAuthSession, type Account, type User as NextAuthUser } from "next-auth";
import type { JWT } from "next-auth/jwt";
import SpotifyProvider from "next-auth/providers/spotify";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "../../../server/db";
import { env } from "../../../env";
import { accounts, sessions, users, verificationTokens } from "../../../server/db/schema";

const scope = [
  "user-read-email",
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-private",
  "playlist-modify-public",
  "user-library-read",
].join(" ");

// Define the expected shape of the refreshed token response from Spotify
interface SpotifyRefreshedTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string; // Spotify might send a new refresh token
  scope: string;
}

// Extend the built-in types
declare module "next-auth" {
  interface Session {
    accessToken?: string;
    // user object is inherited from NextAuthSession
    error?: "RefreshAccessTokenError";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number; // UNIX timestamp in seconds
    account?: Account | null; // Keep track of account details if needed
    user?: NextAuthUser; // Store original user object
    error?: "RefreshAccessTokenError";
  }
}

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    if (!token.refreshToken) {
      throw new Error("Missing refresh token");
    }

    const url = "https://accounts.spotify.com/api/token";
    const bodyParams = {
      grant_type: "refresh_token",
      refresh_token: token.refreshToken, // No need for assertion after check above
    };
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + Buffer.from(env.SPOTIFY_CLIENT_ID + ":" + env.SPOTIFY_CLIENT_SECRET).toString("base64")
      },
      body: new URLSearchParams(bodyParams),
    });

    const refreshedTokens = await response.json() as SpotifyRefreshedTokens;

    if (!response.ok) {
      // Throw an actual error object
      throw new Error(`Failed to refresh token: ${response.status} ${response.statusText}`);
    }

    const newTokenData = {
      ...token,
      accessToken: refreshedTokens.access_token,
      expiresAt: Math.floor(Date.now() / 1000 + refreshedTokens.expires_in),
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      error: undefined,
    };
    return newTokenData;
  } catch (error) {
    console.error("RefreshAccessToken - Error:", error); // Log the specific error
    // Return the object directly to satisfy TypeScript type
    return {
      ...token,
      error: "RefreshAccessTokenError", // Set error flag
    };
  }
}

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    SpotifyProvider({
      clientId: env.SPOTIFY_CLIENT_ID,
      clientSecret: env.SPOTIFY_CLIENT_SECRET,
      authorization: {
        params: { scope },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }: { token: JWT; account: Account | null; user?: NextAuthUser }): Promise<JWT> {
      // Initial sign in
      if (account && user) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        // Assign the expires_at value directly from the account object
        // It's already the correct absolute timestamp in seconds
        token.expiresAt = account.expires_at;
        token.user = user;
        token.account = account;
        return token;
      }

      // Return previous token if it has not expired yet
      // Compare Date.now() (ms) with expiresAt (s) * 1000
      if (token.expiresAt && Date.now() < token.expiresAt * 1000) {
        return token;
      }

      // Access token has expired, try to update it
      const refreshedToken = await refreshAccessToken(token);
      return refreshedToken;
    },
    async session({ session, token }: { session: NextAuthSession; token: JWT }): Promise<NextAuthSession> {
      // Add accessToken and error state to the session object
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    }
  },
cookies: {
  sessionToken: {
    name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
    options: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    },
  },
  callbackUrl: {
    name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.callback-url' : 'next-auth.callback-url',
    options: {
      sameSite: 'lax', // Typically not httpOnly
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    },
  },
  csrfToken: {
    // Note: Using __Host- prefix is often recommended for CSRF tokens if possible
    // It requires the path to be '/' and no domain attribute.
    name: process.env.NODE_ENV === 'production' ? '__Host-next-auth.csrf-token' : 'next-auth.csrf-token',
    options: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    },
  },
  state: { // Added back for OAuth state verification
     name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.state' : 'next-auth.state',
     options: {
       httpOnly: true,
       sameSite: 'lax',
       path: '/',
       secure: process.env.NODE_ENV === 'production',
       maxAge: 60 * 15 // 15 minutes - match default if not specified
     },
   },
  // Consider adding pkceCodeVerifier if using PKCE flow with Spotify (OAuth 2.1)
  // pkceCodeVerifier: {
  //   name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.pkce.code_verifier' : 'next-auth.pkce.code_verifier',
  //   options: {
  //     httpOnly: true,
  //     sameSite: 'lax',
  //     path: '/',
  //     secure: process.env.NODE_ENV === 'production',
  //     maxAge: 60 * 15 // 15 minutes - match default if not specified
  //   }
  // }
},
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
  },
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
export default NextAuth(authOptions); 