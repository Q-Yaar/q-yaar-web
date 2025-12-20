import { Player } from "./Player";

export interface Team {
    team_id: string;
    game_id: string;
    team_name: string;
    team_colour: string;
    players: Player[];
    created: string;
    modified: string;
}