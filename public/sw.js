// Offline support, so the app opens with no signal (gyms are often dead zones).
// Vite gives assets content-hashed names, and there's no build step for this file,
// so on install it reads the asset URLs out of the page itself.
//   Page loads:      network first (always the latest deploy when online), cached copy offline.
//   Hashed assets:   cache first (a new deploy means new names, so a cached file is never stale).
//   After an online page load, cached assets the new page no longer uses are deleted.
const CACHE = 'recomp83-v1'
const SHELL = ['./manifest.webmanifest', './favicon.svg', './apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png']

const inScope = (path) => new URL(path, self.registration.scope).href
const PAGE = () => inScope('./')
// Vite tags its scripts and styles `crossorigin`, and some servers answer with `Vary: Origin`,
// which makes an exact cache lookup miss the very files we stored. These are same-origin
// static files, so Vary never matters here.
const MATCH = { ignoreVary: true }

function assetsIn(html) {
  return [...html.matchAll(/(?:src|href)="\.\/([^"]+)"/g)].map((m) => inScope(`./${m[1]}`))
}

async function prune(cache, html) {
  const keep = new Set(assetsIn(html))
  for (const req of await cache.keys()) {
    if (new URL(req.url).pathname.includes('/assets/') && !keep.has(req.url)) await cache.delete(req)
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE)
    const res = await fetch(PAGE(), { cache: 'no-cache' })
    const html = await res.clone().text()
    await cache.put(PAGE(), res)
    await cache.addAll([...new Set([...SHELL.map(inScope), ...assetsIn(html)])])
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key)
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE)
      try {
        const res = await fetch(req)
        if (res.ok) {
          const html = await res.clone().text()
          await cache.put(PAGE(), res.clone())
          event.waitUntil(prune(cache, html))
        }
        return res
      } catch {
        return (await cache.match(PAGE(), MATCH)) ?? Response.error()
      }
    })())
    return
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE)
    const hit = await cache.match(req, MATCH)
    if (hit) return hit
    const res = await fetch(req)
    if (res.ok && new URL(req.url).pathname.includes('/assets/')) await cache.put(req, res.clone())
    return res
  })())
})
