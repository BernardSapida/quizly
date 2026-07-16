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
  /** How many of `term_count` are enumeration terms. They are the ones worth
   *  knowing about before you open a set: a list you have to produce whole is a
   *  different night's work than a term you have to recognise. */
  enum_count: number;
  choice_mastered: number;
  written_mastered: number;
  last_seen_at: number | null;
  /** The name of the folder this set is filed under, or null when it is loose.
   *  Joined on so a set row can say which subject it belongs to without the list
   *  having to fetch every folder to look it up. */
  folder_name: string | null;
};

export type FolderWithProgress = Folder & {
  set_count: number;
  term_count: number;
  enum_count: number;
  choice_mastered: number;
  written_mastered: number;
  last_seen_at: number | null;
};
