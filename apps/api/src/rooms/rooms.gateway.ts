import {
	ConnectedSocket,
	MessageBody,
	OnGatewayConnection,
	OnGatewayDisconnect,
	OnGatewayInit,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
} from "@nestjs/websockets";
import {
	GameError,
	type Ack,
	type ClientEvents,
	type ServerEvents,
	type Settings,
} from "@impostor/game";
import type { Server, Socket } from "socket.io";
import { AuthService, SESSION_COOKIE } from "../auth/auth.service.js";
import { RoomsService, type Member, type Room } from "./rooms.service.js";

type GameSocket = Socket<
	ClientEvents,
	ServerEvents,
	Record<string, never>,
	{ userId: string | null; code: string | null; ip: string }
>;

function readCookie(
	header: string | undefined,
	name: string,
): string | undefined {
	const match = header
		?.split(";")
		.find((c) => c.trim().startsWith(`${name}=`));
	return match && decodeURIComponent(match.trim().slice(name.length + 1));
}

/** Fixed-window counter per key, false once the key goes over the limit */
function rateLimit(limit: number, windowMs: number) {
	const windows = new Map<string, { count: number; resetAt: number }>();
	let sweepAt = 0;
	return (key: string) => {
		const now = Date.now();
		if (now > sweepAt) {
			for (const [k, w] of windows)
				if (w.resetAt < now) windows.delete(k);
			sweepAt = now + windowMs;
		}
		let w = windows.get(key);
		if (!w || w.resetAt < now) {
			w = { count: 0, resetAt: now + windowMs };
			windows.set(key, w);
		}
		return ++w.count <= limit;
	};
}

const SLOW_DOWN = "Za szybko, zwolnij trochę";

function fail(err: unknown): { ok: false; error: string } {
	if (err instanceof GameError) return { ok: false, error: err.message };
	console.error(err);
	return { ok: false, error: "Coś poszło nie tak" };
}

@WebSocketGateway({ cors: { origin: process.env.WEB_URL, credentials: true } })
export class RoomsGateway
	implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
	@WebSocketServer()
	server: Server<ClientEvents, ServerEvents>;

	private readonly eventLimit = rateLimit(60, 10_000);
	private readonly createLimit = rateLimit(10, 10 * 60_000);

	constructor(
		private readonly rooms: RoomsService,
		private readonly auth: AuthService,
	) {}

	afterInit() {
		this.rooms.listen(
			(room) => this.broadcast(room),
			(socketId) => {
				const socket = this.server.sockets.sockets.get(socketId) as
					GameSocket | undefined;
				if (!socket) return;
				socket.data.code = null;
				socket.emit("room:kicked");
			},
		);
	}

	async handleConnection(client: GameSocket) {
		const user = await this.auth.userFromToken(
			readCookie(client.handshake.headers.cookie, SESSION_COOKIE),
		);
		client.data.userId = user?.id ?? null;
		client.data.code = null;
		client.data.ip = String(
			client.handshake.headers["cf-connecting-ip"] ??
				client.handshake.address,
		);
		// Over the limit the event is dropped and its ack gets an error
		client.use((packet, next) => {
			if (this.eventLimit(client.id)) return next();
			const ack = packet.at(-1);
			if (typeof ack === "function") ack({ ok: false, error: SLOW_DOWN });
		});
	}

	handleDisconnect(client: GameSocket) {
		this.rooms.disconnect(client.id);
	}

	private broadcast(room: Room) {
		for (const m of room.members) {
			if (m.socketId)
				this.server
					.to(m.socketId)
					.emit("room:state", this.rooms.view(room, m));
		}
	}

	private current(client: GameSocket): { room: Room; member: Member } {
		if (!client.data.code)
			throw new GameError("NO_ROOM", "Nie jesteś w żadnym pokoju");
		const room = this.rooms.get(client.data.code);
		return { room, member: this.rooms.memberBySocket(room, client.id) };
	}

	private leaveCurrent(client: GameSocket) {
		if (!client.data.code) return;
		try {
			const { room, member } = this.current(client);
			this.rooms.leave(room, member);
		} catch {}
		client.data.code = null;
	}

	private async run(
		client: GameSocket,
		fn: (ctx: { room: Room; member: Member }) => unknown,
	): Promise<Ack> {
		try {
			await fn(this.current(client));
			return { ok: true };
		} catch (err) {
			return fail(err);
		}
	}

	@SubscribeMessage("room:create")
	create(
		@ConnectedSocket() client: GameSocket,
		@MessageBody() data: { name: string; token: string },
	): Ack<{ code: string }> {
		if (!this.createLimit(client.data.ip))
			return { ok: false, error: SLOW_DOWN };
		try {
			this.leaveCurrent(client);
			const room = this.rooms.create(
				String(data?.name ?? ""),
				String(data?.token ?? ""),
				client.id,
				client.data.userId,
			);
			client.data.code = room.code;
			this.broadcast(room);
			return { ok: true, code: room.code };
		} catch (err) {
			return fail(err);
		}
	}

	@SubscribeMessage("room:join")
	join(
		@ConnectedSocket() client: GameSocket,
		@MessageBody() data: { code: string; name: string; token: string },
	): Ack<{ code: string }> {
		try {
			const code = String(data?.code ?? "").toUpperCase();
			if (client.data.code !== code) this.leaveCurrent(client);
			const room = this.rooms.join(
				code,
				String(data?.name ?? ""),
				String(data?.token ?? ""),
				client.id,
				client.data.userId,
			);
			client.data.code = room.code;
			return { ok: true, code: room.code };
		} catch (err) {
			return fail(err);
		}
	}

	@SubscribeMessage("room:leave")
	leave(@ConnectedSocket() client: GameSocket): Ack {
		this.leaveCurrent(client);
		return { ok: true };
	}

	@SubscribeMessage("room:kick")
	kick(
		@ConnectedSocket() client: GameSocket,
		@MessageBody() data: { playerId: string },
	) {
		return this.run(client, ({ room, member }) =>
			this.rooms.kick(room, member, String(data?.playerId)),
		);
	}

	@SubscribeMessage("room:rename")
	rename(
		@ConnectedSocket() client: GameSocket,
		@MessageBody() data: { name: string },
	) {
		return this.run(client, ({ room, member }) =>
			this.rooms.rename(room, member, String(data?.name ?? "")),
		);
	}

	@SubscribeMessage("room:settings")
	settings(
		@ConnectedSocket() client: GameSocket,
		@MessageBody() data: Partial<Settings>,
	) {
		const allowed: Partial<Settings> = {};
		for (const key of [
			"impostorHint",
			"voting",
			"impostorCanStart",
			"impostorGuess",
			"showCategory",
		] as const) {
			if (typeof data?.[key] === "boolean") allowed[key] = data[key];
		}
		if (typeof data?.impostorCount === "number")
			allowed.impostorCount = data.impostorCount;
		for (const key of ["categories", "packIds"] as const) {
			if (Array.isArray(data?.[key]))
				allowed[key] = data[key].map(String).slice(0, 50);
		}
		return this.run(client, ({ room, member }) =>
			this.rooms.updateSettings(room, member, allowed),
		);
	}

	@SubscribeMessage("game:start")
	start(@ConnectedSocket() client: GameSocket) {
		return this.run(client, ({ room, member }) =>
			this.rooms.start(room, member),
		);
	}

	@SubscribeMessage("game:ready")
	ready(@ConnectedSocket() client: GameSocket) {
		return this.run(client, ({ room, member }) =>
			this.rooms.act(room, member, {
				type: "ready",
				playerId: member.id,
			}),
		);
	}

	@SubscribeMessage("game:voting")
	voting(@ConnectedSocket() client: GameSocket) {
		return this.run(client, ({ room, member }) =>
			this.rooms.act(room, member, { type: "startVoting" }),
		);
	}

	@SubscribeMessage("game:vote")
	vote(
		@ConnectedSocket() client: GameSocket,
		@MessageBody() data: { targetId: string | null },
	) {
		const targetId =
			typeof data?.targetId === "string" ? data.targetId : null;
		return this.run(client, ({ room, member }) =>
			this.rooms.act(room, member, {
				type: "vote",
				playerId: member.id,
				targetId,
			}),
		);
	}

	@SubscribeMessage("game:reveal")
	reveal(@ConnectedSocket() client: GameSocket) {
		return this.run(client, ({ room, member }) =>
			this.rooms.act(room, member, { type: "reveal" }),
		);
	}

	@SubscribeMessage("game:guess")
	guess(
		@ConnectedSocket() client: GameSocket,
		@MessageBody() data: { text: string },
	) {
		const text = String(data?.text ?? "").slice(0, 60);
		return this.run(client, ({ room, member }) =>
			this.rooms.act(room, member, {
				type: "guess",
				playerId: member.id,
				text,
			}),
		);
	}

	@SubscribeMessage("game:skipGuess")
	skipGuess(@ConnectedSocket() client: GameSocket) {
		return this.run(client, ({ room, member }) =>
			this.rooms.act(room, member, { type: "skipGuess" }),
		);
	}

	@SubscribeMessage("game:lobby")
	lobby(@ConnectedSocket() client: GameSocket) {
		return this.run(client, ({ room, member }) =>
			this.rooms.act(room, member, { type: "lobby" }),
		);
	}
}
