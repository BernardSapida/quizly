import { Home, Library, Plus } from "lucide-react-native";
import type { ComponentType } from "react";

export type TabConfig = {
  name: string;
  label: string;
  Icon: ComponentType<{ color: string; size: number }>;
};

// Settings is not a tab — it lives behind the gear in the Home header, so the bar
// stays reserved for the three things you actually do.
export const TABS: TabConfig[] = [
  { name: "index", label: "Home", Icon: Home },
  { name: "create", label: "Create", Icon: Plus },
  { name: "library", label: "Library", Icon: Library },
];

export const TAB_NAMES = new Set(TABS.map((t) => t.name));
