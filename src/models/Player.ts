import { UserData } from "./Login";

export interface Player {
    profile_name: string;
    user_profile: UserData;
    profile_pic: Record<string, any>;
    created: string;
    modified: string;
    is_suspended: boolean;
}