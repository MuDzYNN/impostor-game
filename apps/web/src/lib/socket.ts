import type { ClientEvents, ServerEvents } from "@impostor/game";
import { io, type Socket } from "socket.io-client";
import { API_URL } from "./api";

let socket: Socket<ServerEvents, ClientEvents> | null = null;

export function getSocket() {
	socket ??= io(API_URL, {
		withCredentials: true,
		transports: ["websocket"],
	});
	return socket;
}
