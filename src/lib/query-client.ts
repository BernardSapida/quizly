import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { STALE } from "@/lib/query/config";
import logger from "@/lib/logger";
import { useUIStore } from "@/store/slices/ui.slice";

const SESSION_INVALIDATED_CODE = "SESSION_INVALIDATED_ELSEWHERE";

function handleGlobalError(error: unknown) {
  logger.error("Request failed", error);
  if (
    error instanceof Error &&
    (error.message.includes(SESSION_INVALIDATED_CODE) ||
      (error as { code?: string }).code === SESSION_INVALIDATED_CODE)
  ) {
    useUIStore
      .getState()
      .setSessionExpiredModalVisible(true, "Your account was signed in on another device.");
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleGlobalError,
  }),
  mutationCache: new MutationCache({
    onError: handleGlobalError,
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: STALE.medium,
      refetchOnReconnect: true,
    },
  },
});
