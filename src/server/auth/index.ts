import NextAuth from "next-auth";
import { cache } from "react";
import type { Session } from "next-auth";
import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next";

import { authConfig } from "~/server/auth/config";

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const { auth: uncachedAuth, handlers, signIn, signOut } = NextAuth(authConfig);

// Define the auth function type
type AuthFunction = (
  req: GetServerSidePropsContext["req"] | NextApiRequest,
  res: GetServerSidePropsContext["res"] | NextApiResponse
) => Promise<Session | null>;

// Cache the auth function with proper typing
const auth = cache<AuthFunction>((req, res) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  return uncachedAuth(req, res) as Promise<Session | null>;
});

export { auth, handlers, signIn, signOut };
