import {
	Injectable,
	NotFoundException,
	UnauthorizedException,
} from "@nestjs/common";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma.service.js";

export const SESSION_COOKIE = "impostor_session";
export const STATE_COOKIE = "impostor_oauth";
const SESSION_TTL_DAYS = 30;

interface Profile {
	id: string;
	name: string;
	avatarUrl: string | null;
}

interface Provider {
	authorizeUrl: string;
	tokenUrl: string;
	scope: string;
	clientId?: string;
	clientSecret?: string;
	profile(accessToken: string): Promise<Profile>;
}

async function getJson<T>(url: string, accessToken: string): Promise<T> {
	const res = await fetch(url, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	if (!res.ok)
		throw new UnauthorizedException("Nie udało się pobrać profilu");
	return res.json() as Promise<T>;
}

const providers: Record<string, Provider> = {
	discord: {
		authorizeUrl: "https://discord.com/oauth2/authorize",
		tokenUrl: "https://discord.com/api/oauth2/token",
		scope: "identify",
		clientId: process.env.DISCORD_CLIENT_ID,
		clientSecret: process.env.DISCORD_CLIENT_SECRET,
		async profile(token) {
			const u = await getJson<{
				id: string;
				username: string;
				global_name: string | null;
				avatar: string | null;
			}>("https://discord.com/api/users/@me", token);
			return {
				id: u.id,
				name: u.global_name ?? u.username,
				avatarUrl: u.avatar
					? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png`
					: null,
			};
		},
	},
	google: {
		authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
		tokenUrl: "https://oauth2.googleapis.com/token",
		scope: "openid profile",
		clientId: process.env.GOOGLE_CLIENT_ID,
		clientSecret: process.env.GOOGLE_CLIENT_SECRET,
		async profile(token) {
			const u = await getJson<{
				sub: string;
				name?: string;
				picture?: string;
			}>("https://openidconnect.googleapis.com/v1/userinfo", token);
			return {
				id: u.sub,
				name: u.name ?? "Gracz",
				avatarUrl: u.picture ?? null,
			};
		},
	},
};

@Injectable()
export class AuthService {
	private readonly secret = new TextEncoder().encode(process.env.JWT_SECRET);

	constructor(private readonly prisma: PrismaService) {}

	enabledProviders(): string[] {
		return Object.entries(providers)
			.filter(([, p]) => p.clientId && p.clientSecret)
			.map(([name]) => name);
	}

	private provider(name: string): Provider {
		const p = providers[name];
		if (!p?.clientId || !p.clientSecret)
			throw new NotFoundException("Nieznany dostawca logowania");
		return p;
	}

	private callbackUrl(name: string) {
		return `${process.env.API_URL}/auth/${name}/callback`;
	}

	loginUrl(name: string, state: string): string {
		const p = this.provider(name);
		const params = new URLSearchParams({
			client_id: p.clientId!,
			redirect_uri: this.callbackUrl(name),
			response_type: "code",
			scope: p.scope,
			state,
		});
		return `${p.authorizeUrl}?${params}`;
	}

	async finish(name: string, code: string): Promise<User> {
		const p = this.provider(name);
		const res = await fetch(p.tokenUrl, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				client_id: p.clientId!,
				client_secret: p.clientSecret!,
				grant_type: "authorization_code",
				code,
				redirect_uri: this.callbackUrl(name),
			}),
		});
		if (!res.ok)
			throw new UnauthorizedException("Logowanie nie powiodło się");
		const { access_token } = (await res.json()) as { access_token: string };
		const profile = await p.profile(access_token);

		const account = await this.prisma.account.findUnique({
			where: {
				provider_providerAccountId: {
					provider: name,
					providerAccountId: profile.id,
				},
			},
			include: { user: true },
		});
		if (account) return account.user;
		return this.prisma.user.create({
			data: {
				name: profile.name.slice(0, 20),
				avatarUrl: profile.avatarUrl,
				accounts: {
					create: { provider: name, providerAccountId: profile.id },
				},
			},
		});
	}

	sign(userId: string): Promise<string> {
		return new SignJWT({})
			.setProtectedHeader({ alg: "HS256" })
			.setSubject(userId)
			.setIssuedAt()
			.setExpirationTime(`${SESSION_TTL_DAYS}d`)
			.sign(this.secret);
	}

	async userFromToken(token: string | undefined): Promise<User | null> {
		if (!token) return null;
		try {
			const { payload } = await jwtVerify(token, this.secret);
			return payload.sub
				? this.prisma.user.findUnique({ where: { id: payload.sub } })
				: null;
		} catch {
			return null;
		}
	}

	cookieOptions() {
		return {
			httpOnly: true,
			sameSite: "lax" as const,
			secure: process.env.API_URL?.startsWith("https") ?? false,
			path: "/",
			maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
		};
	}
}
