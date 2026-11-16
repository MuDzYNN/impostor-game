import { Injectable, OnModuleDestroy } from "@nestjs/common";
import {
	cardFor,
	createGame,
	GameError,
	MAX_NAME_LENGTH,
	reduce,
	ROOM_CODE_ALPHABET,
	ROOM_CODE_LENGTH,
	type Action,
	type GameState,
	type RoomView,
	type Settings,
	wordHidden,
} from "@impostor/game";
import { randomBytes, randomInt } from "node:crypto";
import { PacksService } from "../packs/packs.service.js";
import { HistoryService } from "./history.service.js";

/** Grace period before a disconnected player is skipped in REVEAL or VOTING and loses host */
const SKIP_AFTER_MS = 30_000;
const REMOVE_AFTER_MS = 5 * 60_000;
const SWEEP_EVERY_MS = 5_000;

export interface Member {
	id: string;
	token: string;
	name: string;
	userId: string | null;
	socketId: string | null;
	spectator: boolean;
	disconnectedAt: number | null;
	skipped: boolean;
}

export interface Room {
	code: string;
	hostId: string;
	members: Member[];
	state: GameState;
}

type Listener = (room: Room) => void;

@Injectable()
export class RoomsService implements OnModuleDestroy {
	private readonly rooms = new Map<string, Room>();
	private readonly sweeper = setInterval(() => this.sweep(), SWEEP_EVERY_MS);
	private onChange: Listener = () => {};
	private onRemove: (socketId: string) => void = () => {};

	constructor(
		private readonly packs: PacksService,
		private readonly history: HistoryService,
	) {}

	onModuleDestroy() {
		clearInterval(this.sweeper);
	}

	listen(onChange: Listener, onRemove: (socketId: string) => void) {
		this.onChange = onChange;
		this.onRemove = onRemove;
	}

	get(code: string): Room {
		const room = this.rooms.get(code.toUpperCase());
		if (!room) throw new GameError("NO_ROOM", "Nie ma takiego pokoju");
		return room;
	}

	memberBySocket(room: Room, socketId: string): Member {
		const member = room.members.find((m) => m.socketId === socketId);
		if (!member)
			throw new GameError("NOT_MEMBER", "Nie jesteś w tym pokoju");
		return member;
	}

	private newCode(): string {
		let code: string;
		do {
			code = Array.from(
				{ length: ROOM_CODE_LENGTH },
				() => ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)],
			).join("");
		} while (this.rooms.has(code));
		return code;
	}

	private cleanName(room: Room, name: string, self?: Member): string {
		const clean = name
			.trim()
			.replace(/\s+/g, " ")
			.slice(0, MAX_NAME_LENGTH);
		if (!clean) throw new GameError("BAD_NAME", "Podaj nick");
		const taken = room.members.some(
			(m) => m !== self && m.name.toLowerCase() === clean.toLowerCase(),
		);
		if (taken)
			throw new GameError("NAME_TAKEN", "Ten nick jest już zajęty");
		return clean;
	}

	private apply(room: Room, action: Action) {
		const before = room.state;
		room.state = reduce(before, action);
		if (
			before.phase !== "RESULT" &&
			room.state.phase === "RESULT" &&
			room.state.round?.outcome
		) {
			const userIds = new Map(room.members.map((m) => [m.id, m.userId]));
			void this.history.record(
				room.code,
				room.state,
				userIds,
				before.scores,
			);
		}
		if (room.state.phase === "LOBBY") this.promoteSpectators(room);
	}

	private promoteSpectators(room: Room) {
		for (const m of room.members.filter((m) => m.spectator)) {
			m.spectator = false;
			room.state = reduce(room.state, {
				type: "addPlayer",
				player: { id: m.id, name: m.name },
			});
		}
	}

	private requireToken(token: string) {
		if (token.length < 8)
			throw new GameError("BAD_TOKEN", "Brak tokenu sesji");
	}

	create(
		name: string,
		token: string,
		socketId: string,
		userId: string | null,
	): Room {
		this.requireToken(token);
		const member: Member = {
			id: randomBytes(8).toString("hex"),
			token,
			name: "",
			userId,
			socketId,
			spectator: false,
			disconnectedAt: null,
			skipped: false,
		};
		const room: Room = {
			code: this.newCode(),
			hostId: member.id,
			members: [member],
			state: createGame(),
		};
		member.name = this.cleanName(room, name);
		room.state = reduce(room.state, {
			type: "addPlayer",
			player: { id: member.id, name: member.name },
		});
		this.rooms.set(room.code, room);
		return room;
	}

	join(
		code: string,
		name: string,
		token: string,
		socketId: string,
		userId: string | null,
	): Room {
		this.requireToken(token);
		const room = this.get(code);
		const existing = room.members.find((m) => m.token === token);
		if (existing) {
			if (existing.socketId && existing.socketId !== socketId)
				this.onRemove(existing.socketId);
			existing.socketId = socketId;
			existing.disconnectedAt = null;
			existing.skipped = false;
			existing.userId ??= userId;
			this.onChange(room);
			return room;
		}

		const midRound =
			room.state.phase !== "LOBBY" && room.state.phase !== "RESULT";
		const member: Member = {
			id: randomBytes(8).toString("hex"),
			token,
			name: this.cleanName(room, name),
			userId,
			socketId,
			spectator: midRound,
			disconnectedAt: null,
			skipped: false,
		};
		if (!midRound)
			room.state = reduce(room.state, {
				type: "addPlayer",
				player: { id: member.id, name: member.name },
			});
		room.members.push(member);
		this.onChange(room);
		return room;
	}

	disconnect(socketId: string) {
		for (const room of this.rooms.values()) {
			const member = room.members.find((m) => m.socketId === socketId);
			if (!member) continue;
			member.socketId = null;
			member.disconnectedAt = Date.now();
			this.onChange(room);
		}
	}

	leave(room: Room, member: Member) {
		room.members = room.members.filter((m) => m !== member);
		if (!member.spectator)
			this.apply(room, { type: "removePlayer", playerId: member.id });
		if (!room.members.length) {
			this.rooms.delete(room.code);
			return;
		}
		if (room.hostId === member.id) this.passHost(room);
		this.onChange(room);
	}

	kick(room: Room, host: Member, playerId: string) {
		this.requireHost(room, host);
		const target = room.members.find((m) => m.id === playerId);
		if (!target || target === host)
			throw new GameError("NOT_PLAYER", "Nie ma takiego gracza");
		if (target.socketId) this.onRemove(target.socketId);
		this.leave(room, target);
	}

	rename(room: Room, member: Member, name: string) {
		member.name = this.cleanName(room, name, member);
		if (!member.spectator)
			this.apply(room, {
				type: "renamePlayer",
				playerId: member.id,
				name: member.name,
			});
		this.onChange(room);
	}

	private passHost(room: Room) {
		const next = room.members.find((m) => m.socketId) ?? room.members[0];
		room.hostId = next.id;
	}

	requireHost(room: Room, member: Member) {
		if (room.hostId !== member.id)
			throw new GameError("NOT_HOST", "Tylko host może to zrobić");
	}

	updateSettings(room: Room, member: Member, settings: Partial<Settings>) {
		this.requireHost(room, member);
		this.apply(room, { type: "settings", settings });
		this.onChange(room);
	}

	async start(room: Room, member: Member) {
		this.requireHost(room, member);
		this.promoteSpectators(room);
		const words = await this.packs.wordsFor(room.state.settings.packIds);
		this.apply(room, { type: "start", words });
		for (const m of room.members) m.skipped = false;
		// Already-gone players should not stall the new round
		for (const m of room.members.filter(
			(m) =>
				m.disconnectedAt &&
				Date.now() - m.disconnectedAt > SKIP_AFTER_MS,
		)) {
			this.skip(room, m);
		}
		this.onChange(room);
	}

	/** Player actions, plus host-only phase changes */
	act(room: Room, member: Member, action: Action) {
		const hostOnly: Action["type"][] = ["startVoting", "reveal", "lobby"];
		const impostor = room.state.round?.impostorIds.includes(member.id);
		if (
			hostOnly.includes(action.type) ||
			(action.type === "skipGuess" && !impostor)
		)
			this.requireHost(room, member);
		else if (member.spectator)
			throw new GameError("SPECTATOR", "Dołączysz od następnej rundy");
		this.apply(room, action);
		this.onChange(room);
	}

	private skip(room: Room, member: Member) {
		if (member.spectator || member.skipped) return;
		member.skipped = true;
		this.apply(room, { type: "skip", playerId: member.id });
	}

	private sweep() {
		const now = Date.now();
		for (const room of [...this.rooms.values()]) {
			let changed = false;
			for (const m of [...room.members]) {
				if (!m.disconnectedAt) continue;
				const gone = now - m.disconnectedAt;
				if (gone > REMOVE_AFTER_MS) {
					this.leave(room, m);
					continue;
				}
				if (gone > SKIP_AFTER_MS) {
					if (
						(room.state.phase === "REVEAL" ||
							room.state.phase === "VOTING") &&
						!m.skipped
					) {
						this.skip(room, m);
						changed = true;
					}
					if (
						room.hostId === m.id &&
						room.members.some((o) => o.socketId)
					) {
						this.passHost(room);
						changed = true;
					}
				}
			}
			if (changed && this.rooms.has(room.code)) this.onChange(room);
		}
	}

	view(room: Room, member: Member): RoomView {
		const { state } = room;
		const round = state.round;
		const result = state.phase === "RESULT" && round;
		const hidden = wordHidden(state);
		return {
			code: room.code,
			hostId: room.hostId,
			meId: member.id,
			phase: state.phase,
			settings: state.settings,
			roundNo: state.roundNo,
			members: room.members.map((m) => ({
				id: m.id,
				name: m.name,
				connected: !!m.socketId,
				spectator: m.spectator,
				score: state.scores[m.id] ?? 0,
			})),
			round: round && {
				order: round.order,
				readyIds: round.ready,
				votedIds: Object.keys(round.votes),
				result: result
					? {
							word: hidden ? null : round.word,
							hint: hidden ? null : round.hint,
							category: round.category,
							impostorIds: round.impostorIds,
							votes: round.votes,
							outcome: round.outcome,
							guess: round.guess,
						}
					: null,
			},
			card: state.phase === "LOBBY" ? null : cardFor(state, member.id),
		};
	}
}
