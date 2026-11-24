/** Formato local e de intercâmbio da versão 1. */
export type Collection = 'sheet' | 'review' | 'idea' | 'favorite' | 'reflection';
export interface StoredRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: 1;
}

export interface CreationSheet extends StoredRecord {
  title: string;
  category?: string;
  idea?: string;
  motivation?: string;
  characters?: string;
  context?: string;
  atmosphere?: string;
  message?: string;
  interpretation?: string;
  composition?: string;
  outfit?: string;
  lighting?: string;
  palette?: string[];
  skill?: string;
  references?: string;
  notes?: string;
  finish?: '' | 'Leve' | 'Narrativo' | 'Destaque';
  ideaId?: string;
}

type Score = 1 | 2 | 3 | 4 | 5;
export type ArtworkReview = StoredRecord & {
  title: string;
  date: string;
  worked: string;
  next: string;
} & ({free: true; scores: null} | {free: false; scores: [Score, Score, Score, Score, Score]});

export interface ArtIdea extends StoredRecord {title: string; category: string; idea: string}
export interface Reflection extends StoredRecord {checks: boolean[]; note: string; sheetId: string}
export interface Backup {
  application: 'Ateliê ARTHEUS';
  schemaVersion: 1;
  exportedAt: string;
  records: {sheet: CreationSheet[]; review: ArtworkReview[]; idea: ArtIdea[]; favorite: StoredRecord[]; reflection: Reflection[]};
  preferences: {theme?: 'night' | 'paper'; 'magia-page'?: number; 'grimorio-page'?: number};
}

