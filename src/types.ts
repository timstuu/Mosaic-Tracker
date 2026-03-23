export enum MediaType {
  MOVIE = 'movie',
  SERIES = 'series',
  DOCUMENTARY = 'documentary',
  BOOK = 'book',
  GAME = 'game'
}

export enum MediaStatus {
  COMPLETED = 'completed',
  PLANNED = 'planned',
  ACTIVE = 'active'
} 

export interface MediaItem {
  id: string;
  title: string;
  type: MediaType;
  status: MediaStatus;
  rating: number; // 0-5
  dateAdded: string; // ISO string
  dateCompleted?: string; // ISO string
  watchDate?: string; // For movies, series, documentaries
  startDate?: string; // For books, games
  endDate?: string; // For books, games
  platform?: string; // For movies, series, documentaries (Streaming Platform)
  console?: string; // For games
  link?: string; // For backlog items
  notes?: string;
  imageUrl?: string;
  tags?: string;
  isbn?: string;
}

export type ViewType = 'landing' | 'tracker' | 'archive' | 'analytics';

export interface Challenge {
  id: string;
  name: string;
  mediaType: MediaType;
  targetCount: number;
  startDate: string; // ISO string
  endDate: string; // ISO string
  dateCreated: string; // ISO string
}
