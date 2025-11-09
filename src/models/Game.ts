export interface Game {
  game_id: string;
  game_code: string;
  game_type: string;
  name: string;
  description: string;
  game_status: string;
  game_master: {
    profile_name: string;
    email_id: string;
    phone: string;
  };
  created: string;
  modified: string;
}
