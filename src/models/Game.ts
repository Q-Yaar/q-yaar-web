import { Team } from './Team';

export interface GameMaster {
  profile_name: string;
  email_id: string;
  phone: string;
}

// Defining these as types allows for easier refactoring if you add more game types later
export type GameType = "HIDE_N_SEEK" | string;
export type GameStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | string;
export type GameVisibilityMode = "PUBLIC" | "PRIVATE" | string;

export interface Game {
  game_id: string;
  game_code: string;
  game_type: GameType;
  game_visibility_mode?: GameVisibilityMode;
  name: string;
  description: string;
  game_status: GameStatus;
  game_master: GameMaster;
  created: string;
  modified: string;
  teams?: Team[];
}