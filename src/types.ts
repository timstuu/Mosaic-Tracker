export enum MediaType {
  MOVIE = 'movie',
  SHOW = 'show',
  DOCUMENTARY = 'documentary',
  BOOK = 'book',
  GAME = 'game'
}

export enum MediaStatus {
  COMPLETED = 'completed',
  PLANNED = 'planned',
  ACTIVE = 'active',
  DNF = 'dnf'
} 

export interface MediaItem {
  id: string;
  title: string;
  type: MediaType;
  status: MediaStatus;
  rating: number; // 0-5
  dateAdded: string; // ISO string
  dateCompleted?: string; // ISO string
  watchDate?: string; // For movies, shows, documentaries
  startDate?: string; // For books, games, shows
  endDate?: string; // For books, games, shows
  platform?: string; // For movies, shows, documentaries (Streaming Platform)
  console?: string; // For games
  link?: string; // For backlog items
  notes?: string;
  imageUrl?: string;
  tags?: string;
  isbn?: string;
  reminderDate?: string; // YYYY-MM-DD, when to fire a push reminder
  reminderTime?: string; // HH:MM local time; empty falls back to 09:00
  reminderMessage?: string; // optional custom notification text
  reminderSentAt?: string; // ISO string, set once the reminder push was sent
  currentSeason?: number;
  currentEpisode?: number;
  totalSeasons?: number;
  totalEpisodes?: number;
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
