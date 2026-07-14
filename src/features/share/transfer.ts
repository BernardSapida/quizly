import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { repo } from "@/db";
import { parseAnswers } from "@/features/study/grading";
import {
  ImportError,
  QUIZLY_VERSION,
  parseExportFile,
  toFilename,
  type ExportFile,
} from "./format";

export type ExportScope =
  | { setId: string }
  | { folderId: string }
  | { all: true };

export async function buildExport(scope: ExportScope): Promise<ExportFile> {
  const { folders, sets, terms } = await repo.getSetsForExport(scope);
  const folderIds = new Set(folders.map((f) => f.id));

  return {
    quizlyVersion: QUIZLY_VERSION,
    folders: folders.map((folder) => ({ id: folder.id, name: folder.name })),
    sets: sets.map((set) => ({
      id: set.id,
      // Sharing a single set flattens it: its folder is not in this file, so the
      // pointer would dangle. Only "export all" carries the folders to point at.
      folderId:
        set.folder_id && folderIds.has(set.folder_id) ? set.folder_id : null,
      name: set.name,
      description: set.description,
      position: set.position,
      updatedAt: set.updated_at,
      terms: terms
        .filter((t) => t.set_id === set.id)
        .map((t) => ({
          id: t.id,
          kind: t.kind,
          term: t.term,
          definition: t.definition,
          answers: t.answers ? parseAnswers(t.answers) : null,
          position: t.position,
          updatedAt: t.updated_at,
        })),
    })),
  };
}

export type SaveResult = {
  saved: boolean;
  /** Name of the folder the user picked, for the confirmation message. */
  folder?: string;
  /** Absent when the user simply backed out of the picker — that is not an error. */
  reason?: string;
};

/**
 * Writes the file into a folder the user picks: Downloads, an SD card, a synced
 * Drive folder. A real save, which is what the download icon has always implied.
 *
 * This is the backup path. The share sheet below is for sending a copy to someone,
 * and the difference matters: a file you tapped through to Gmail is not a file you
 * can find again in six weeks when your phone dies.
 */
export async function saveExport(
  scope: ExportScope,
  name: string
): Promise<SaveResult> {
  const data = await buildExport(scope);
  if (data.sets.length === 0) {
    return { saved: false, reason: "There's nothing to export yet." };
  }

  let directory: Directory;
  try {
    directory = await Directory.pickDirectoryAsync();
  } catch {
    // Backing out of the system picker rejects rather than resolving. Silently
    // doing nothing is the correct response to "never mind".
    return { saved: false };
  }

  try {
    const file = directory.createFile(toFilename(name), "application/json");
    file.write(JSON.stringify(data, null, 2));
  } catch {
    return {
      saved: false,
      reason: "Couldn't write the file there. Try a different folder.",
    };
  }

  return { saved: true, folder: directory.name };
}

/**
 * Writes the export to a cache file and hands it to the OS share sheet. Any
 * transport works — Messenger, Drive, Bluetooth. The app does not care.
 */
export async function shareExport(
  scope: ExportScope,
  name: string
): Promise<{ shared: boolean; reason?: string }> {
  const data = await buildExport(scope);
  if (data.sets.length === 0) {
    return { shared: false, reason: "There's nothing to export yet." };
  }

  const file = new File(Paths.cache, toFilename(name));
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(data, null, 2));

  if (!(await Sharing.isAvailableAsync())) {
    return { shared: false, reason: "Sharing isn't available on this device." };
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: "application/json",
    dialogTitle: `Share ${name}`,
    UTI: "public.json",
  });
  return { shared: true };
}

/** Opens the picker and parses the chosen file. Returns null if the user cancels. */
export async function pickExportFile(): Promise<ExportFile | null> {
  const result = await File.pickFileAsync({ mimeTypes: ["application/json"] });
  if (result.canceled) return null;

  const picked = result.result;
  let raw: string;
  try {
    raw = await picked.text();
  } catch {
    throw new ImportError("Couldn't read that file.");
  }

  return parseExportFile(raw);
}
