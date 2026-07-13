import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import logger from "@/lib/logger";
import { pusher } from "./pusher";

export { pusher };

export function useRealtimeConnection() {
  const queryClient = useQueryClient();
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (!pusher) return;

    pusher.connection.bind("connected", () => {
      logger.info("[Pusher] connected");
    });
    pusher.connection.bind("disconnected", () => {
      logger.info("[Pusher] disconnected");
    });
    pusher.connection.bind("error", (err: unknown) => {
      logger.error("[Pusher] connection error", err);
    });

    pusher.connect();

    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        const prev = appState.current;
        appState.current = nextState;

        if (
          (prev === "active" && nextState === "background") ||
          nextState === "inactive"
        ) {
          logger.info("[Pusher] app backgrounded — disconnecting");
          pusher.disconnect();
        } else if (prev !== "active" && nextState === "active") {
          logger.info("[Pusher] app foregrounded — reconnecting");
          pusher.connect();
          queryClient.invalidateQueries();
        }
      }
    );

    return () => {
      subscription.remove();
      pusher.disconnect();
    };
  }, [queryClient]);
}
