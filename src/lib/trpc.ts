import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { useAuthStore } from "@/store";
import logger from "@/lib/logger";

// TODO: replace with your AppRouter type once the server project is linked
// Typed adapter pattern: import type { AppRouter } from '../../your-server/src/router'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AppRouter = any;

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${process.env.EXPO_PUBLIC_API_URL}/api/trpc`,
      transformer: superjson,
      headers() {
        const token = useAuthStore.getState().token;
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});

export function logTRPCError(path: string, error: unknown): void {
  logger.error("tRPC error", { path, error });
}
