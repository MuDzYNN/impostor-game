const CACHE = "impostor-v2";
const PRECACHE = ["/", "/local", "/packs", "/icon.svg", "/icon-192.png"];

self.addEventListener("install", (event) => {
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter((k) => k !== CACHE)
						.map((k) => caches.delete(k)),
				),
			)
			.then(() => self.clients.claim()),
	);
});

async function networkFirst(request, fallbackUrl) {
	const cache = await caches.open(CACHE);
	try {
		const response = await fetch(request);
		if (response.ok) cache.put(request, response.clone());
		return response;
	} catch {
		return (
			(await cache.match(request)) ??
			(fallbackUrl && (await cache.match(fallbackUrl))) ??
			Response.error()
		);
	}
}

async function cacheFirst(request) {
	const cache = await caches.open(CACHE);
	const cached = await cache.match(request);
	if (cached) return cached;
	const response = await fetch(request);
	if (response.ok) cache.put(request, response.clone());
	return response;
}

self.addEventListener("fetch", (event) => {
	const { request } = event;
	if (request.method !== "GET") return;
	const url = new URL(request.url);

	if (url.origin !== self.location.origin) {
		// Word lists from the API, so local games keep working offline
		if (url.pathname === "/words" || url.pathname === "/packs")
			event.respondWith(networkFirst(request));
		return;
	}
	if (url.pathname.startsWith("/_next/static/"))
		event.respondWith(cacheFirst(request));
	else if (request.mode === "navigate")
		event.respondWith(networkFirst(request, "/local"));
	else event.respondWith(networkFirst(request));
});
