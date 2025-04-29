import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import Head from "next/head";

export default function SignIn() {
  const router = useRouter();
  const { callbackUrl } = router.query;

  return (
    <>
      <Head>
        <title>Sign In - Sauna Playlist Generator</title>
      </Head>
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-green-900 to-black">
        <div className="w-full max-w-md rounded-lg bg-black/60 p-8 text-center shadow-xl">
          <h1 className="mb-6 text-4xl font-bold text-white">Sauna Playlist Generator</h1>
          <p className="mb-8 text-lg text-gray-300">
            Create personalized playlists for your sauna sessions based on mood and energy
          </p>
          <button
            onClick={() => signIn("spotify", { callbackUrl: callbackUrl as string || "/" })}
            className="rounded-full bg-green-500 px-8 py-3 font-medium text-white transition hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
          >
            <div className="flex items-center justify-center space-x-2">
              <svg 
                viewBox="0 0 24 24" 
                width="24" 
                height="24" 
                stroke="currentColor" 
                strokeWidth="2" 
                fill="none" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <polygon points="10 8 16 12 10 16 10 8"></polygon>
              </svg>
              <span>Sign in with Spotify</span>
            </div>
          </button>
        </div>
      </div>
    </>
  );
} 