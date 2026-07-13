import { Pusher } from "pusher-js";

const key = process.env.EXPO_PUBLIC_PUSHER_KEY ?? "";
const cluster = process.env.EXPO_PUBLIC_PUSHER_CLUSTER ?? "ap1";

// No-op stub when credentials are missing so the app runs without Pusher configured.
export const pusher = key
  ? new Pusher(key, { cluster })
  : (null as unknown as Pusher);
