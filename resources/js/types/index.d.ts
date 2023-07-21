import { IconType } from "react-icons";


export interface User {
    id: number;
    user_level:1|2|3;
    first_name: string;
    company_id:string;
    site:'Manila'|'Leyte'
    status:IStatus;
    group:ITeam;
    team?:ITeam;
    last_name: string;
    email: string;
    email_verified_at: string;
    updated_at:string;
}

export type PageProps<T extends Record<string, unknown> = Record<string, unknown>> = T & {
    auth: {
        user: User;
    };
    statuses:IStatus[];
    teams:ITeam[];
};


export interface INavRoute{
    href:string;
    icon:IconType;
    active?:boolean;
    label:string;
}

export interface ITeam{
    id:number;
    name:string;
    user_id:number;
    user:User;
    users:User[];
}

export interface IStatus{
    id:number;
    name:string;
}

export interface INotification{
    id:number;
    user_id:number;
    team_id:number;
    status_id:number;
    user:User;
    status:IStatus;
    message:string;
    created_at:string;
    updated_at:string;
}

export interface IAgentStatus{
    id:nubmer, 
    user_id:number,
    user:User;
    status_id:number,
    status:IStatus; 
    agent_session_id:number, 
    overtime_reason:string|null, 
    early_departure_reason:string|null, 
    created_at:string, 
    updated_at:string,
}

declare global {
    interface Window {
        Pusher: any;
        Echo:Echo
    }
}