import { repo, type ContentBundle } from "@/db";
import logger from "@/lib/logger";
import contents from "./data/contents.json";

type ContentFile = {
  quizlyVersion: number;
  hash: string;
  bundles: ContentBundle[];
};

const CONTENT = contents as unknown as ContentFile;

/** Changes whenever anything under contents/ changes. See scripts/build-contents.mjs. */
export const CONTENT_HASH = CONTENT.hash;

export async function syncContent(): Promise<void> {
  await repo.syncContent(CONTENT.bundles);
}

/**
 * Runs on launch, but only when the bundled content has actually changed — a normal
 * launch costs one string comparison instead of hundreds of upserts.
 *
 * Note this only fires when a NEW APK is installed, because the content is compiled
 * into the bundle. That is the tradeoff of authoring in-repo: content edits need a
 * rebuild. Sets shared *between* people still travel as files, with no rebuild.
 */
export async function syncContentIfChanged(
  lastHash: string | null,
  markSynced: (hash: string) => void
): Promise<void> {
  if (lastHash === CONTENT_HASH) return;

  try {
    await syncContent();
    markSynced(CONTENT_HASH);
  } catch (error) {
    // Broken content must never stop the app from opening.
    logger.error("content sync failed", error);
  }
}
