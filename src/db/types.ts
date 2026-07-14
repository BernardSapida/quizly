export type TermKind = "standard" | "enumeration";

/** The two practice modes. Progress in each is tracked independently. */
export type StudyMode = "choice" | "written";

export type Folder = {
  id: string;
  name: string;
  color: string | null;
  created_at: number;
  updated_at: number;
};

export type Set = {
  id: string;
  folder_id: string | null;
  name: string;
  description: string | null;
  position: number;
  created_at: number;
  updated_at: number;
};

export type Term = {
  id: string;
  set_id: string;
  kind: TermKind;
  term: string;
  definition: string;
  /** JSON array of accepted items. Enumeration terms only. */
  answers: string | null;
  position: number;
  flagged: number;
  created_at: number;
  updated_at: number;
};

export type Progress = {
  term_id: string;
  mode: StudyMode;
  mastered: number;
  wrong_count: number;
  last_seen_at: number | null;
};

/** A term with its progress in one mode joined on. */
export type StudyTerm = Term & {
  mastered: number;
  wrong_count: number;
};

/** Mastery counts for one pool of terms, per mode. */
export type PoolProgress = {
  total: number;
  choice: number;
  written: number;
};

export type SetWithProgress = Set & {
  term_count: number;
  choice_mastered: number;
  written_mastered: number;
  last_seen_at: number | null;
};

export type FolderWithProgress = Folder & {
  set_count: number;
  term_count: number;
  choice_mastered: number;
  written_mastered: number;
  last_seen_at: number | null;
};
