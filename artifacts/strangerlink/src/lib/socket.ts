import { io, Socket } from "socket.io-client";

export const socket: Socket = io({ path: "/socket.io" });

export type MessageFrom = "me" | "stranger";

export interface ChatMessage {
  id: string;
  text: string;
  from: MessageFrom;
  timestamp: number;
}

export interface RoomMessage {
  id: string;
  text: string;
  nickname?: string;
  from?: string;
  system: boolean;
  room: string;
  timestamp: number;
}
