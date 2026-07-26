import { Player } from "./Player";

export interface Team {
    team_id: string;
    game_id: string;
    team_name: string;
    team_colour: string;
    team_type?: 'PLAYER' | 'SPECTATOR' | string;
    players: Player[];
    created: string;
    modified: string;
}

export const isPlayerTeam = (team: Team | { team_type?: string; team_name?: string }): boolean => {
    if (!team) return false;
    if (team.team_type) {
        return team.team_type.toUpperCase() === 'PLAYER';
    }
    if (team.team_name) {
        const name = team.team_name.toUpperCase();
        return name !== 'SPECTATOR' && name !== 'SPECTATORS';
    }
    return true;
};