import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { pusher } from "@/lib/realtime";
import { keys } from "@/lib/query/keys";
import { useAuthStore } from "@/store";

export function useNotificationsRealtime() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user?.id);

  useEffect(() => {
    if (!pusher || !userId) return;

    const channel = pusher.subscribe(`private-user-${userId}`);

    channel.bind("notification.created", () => {
      queryClient.invalidateQueries({ queryKey: keys.notifications.all() });
    });

    channel.bind("notification.read", () => {
      queryClient.invalidateQueries({ queryKey: keys.notifications.unread() });
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`private-user-${userId}`);
    };
  }, [queryClient, userId]);
}
