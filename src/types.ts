export interface SkillsDirs {
  project?: string;
  user?: string;
}

export interface RunOptions {
  transcriptPath: string;
  skillsDirs: SkillsDirs;
  sessionId: string;
  fromTurn?: number;
}
