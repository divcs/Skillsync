/**
 * SkillSync Service Worker — Animation & Asset Cache
 * ─────────────────────────────────────────────────
 * Strategy per resource type:
 *   HTML pages          → Network-first (always fresh, fallback to cache)
 *   CSS / JS (own)      → Stale-while-revalidate (instant + background refresh)
 *   Lottie JSON / SVG   → Cache-first (heavy files; version bump forces refresh)
 *   CDN scripts         → Cache-first with 30-day TTL
 *   Images              → Cache-first with 7-day TTL
 *   Fonts (Google)      → Cache-first with 365-day TTL
 */

const CACHE_VERSION = 'v1.3'
const STATIC_CACHE  = `skillsync-static-${CACHE_VERSION}`
const LOTTIE_CACHE  = `skillsync-lottie-${CACHE_VERSION}`
const CDN_CACHE     = `skillsync-cdn-${CACHE_VERSION}`
const IMAGE_CACHE   = `skillsync-images-${CACHE_VERSION}`
const FONT_CACHE    = `skillsync-fonts-${CACHE_VERSION}`

// All known caches — anything not listed here gets deleted on activate
const ALL_CACHES = [STATIC_CACHE, LOTTIE_CACHE, CDN_CACHE, IMAGE_CACHE, FONT_CACHE]

// ── Files to pre-cache on install ───────────────────────────────────────────
const PRECACHE_STATIC = [
  '/',
  '/index.html',
  '/about.html',
  '/blog.html',
  '/contact.html',
  '/services.html',
  '/style.css',
  '/main.js',
  '/assets/logobw.svg',
  '/assets/logo.svg',
]

const PRECACHE_LOTTIE = [
  '/assets/skillsync.json',
  '/assets/lottie/1skillsync-fixed.json',
  '/assets/animate/pulse loader (1).json',
  '/assets/lottie-files/Floating Lines.json',
  '/assets/lottie-files/UI Animation.json',
  '/assets/lottie-files/search-for-employee/animations/12345.json',
  '/assets/lottie-files/rocket-launch/animations/88ef49fc-7868-4e1a-b677-2df4eb236ac7.json',
]

const PRECACHE_CDN = [
  'https://cdn.jsdelivr.net/npm/gsap@3.12.7/dist/gsap.min.js',
  'https://cdn.jsdelivr.net/npm/gsap@3.12.7/dist/ScrollTrigger.min.js',
  'https://cdn.jsdelivr.net/npm/gsap@3.12.7/dist/ScrollToPlugin.min.js',
  'https://unpkg.com/@studio-freight/lenis@1.0.42/dist/lenis.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js',
]

// TTL helpers (in seconds)
const DAY  = 86400
const WEEK = 7 * DAY
const MONTH = 30 * DAY
const YEAR  = 365 * DAY

// ── Install — pre-cache all critical assets ──────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting()

  event.waitUntil(
    Promise.all([
      // Static shell
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(PRECACHE_STATIC).catch((err) => {
          console.warn('[SW] Static pre-cache partial failure:', err)
        })
      }),

      // Lottie JSON files (heaviest payloads — highest cache priority)
      caches.open(LOTTIE_CACHE).then((cache) => {
        return Promise.allSettled(
          PRECACHE_LOTTIE.map((url) =>
            fetch(url, { cache: 'no-cache' })
              .then((res) => {
                if (res.ok) return cache.put(url, res)
              })
              .catch(() => { /* file may not exist yet; skip silently */ })
          )
        )
      }),

      // CDN scripts
      caches.open(CDN_CACHE).then((cache) => {
        return Promise.allSettled(
          PRECACHE_CDN.map((url) =>
            fetch(url, { mode: 'cors', credentials: 'omit' })
              .then((res) => {
                if (res.ok) return cache.put(url, res)
              })
              .catch(() => {})
          )
        )
      }),
    ])
  )
})

// ── Activate — purge stale caches ───────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !ALL_CACHES.includes(key))
          .map((key) => {
            console.log('[SW] Deleting stale cache:', key)
            return caches.delete(key)
          })
      )
    ).then(() => self.clients.claim())
  )
})

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true if the cached response is still within maxAge seconds.
 */
function isFresh(response, maxAge) {
  if (!response) return false
  const dateHeader = response.headers.get('date')
  if (!dateHeader) return true // no date → assume fresh (CDN already versioned)
  const age = (Date.now() - new Date(dateHeader).getTime()) / 1000
  return age < maxAge
}

/**
 * Cache-first with optional TTL. Falls back to network on miss or stale.
 */
async function cacheFirst(request, cacheName, maxAge = Infinity) {
  const cache    = await caches.open(cacheName)
  const cached   = await cache.match(request)

  if (cached && isFresh(cached, maxAge)) return cached

  try {
    const fresh = await fetch(request)
    if (fresh.ok) cache.put(request, fresh.clone())
    return fresh
  } catch {
    if (cached) return cached           // serve stale on network error
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
  }
}

/**
 * Network-first. Falls back to cache on network failure.
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  try {
    const fresh = await fetch(request)
    if (fresh.ok) cache.put(request, fresh.clone())
    return fresh
  } catch {
    const cached = await cache.match(request)
    if (cached) return cached
    // Return offline page if we have it
    const offline = await cache.match('/index.html')
    return offline || new Response('Offline', { status: 503 })
  }
}

/**
 * Stale-while-revalidate: serve cached immediately, update in background.
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName)
  const cached = await cache.match(request)

  // Kick off background revalidation regardless
  const fetchPromise = fetch(request).then((fresh) => {
    if (fresh.ok) cache.put(request, fresh.clone())
    return fresh
  }).catch(() => null)

  return cached || fetchPromise
}

// ── Route classification ─────────────────────────────────────────────────────

function isLottieAsset(url) {
  return (
    url.pathname.endsWith('.json') &&
    (url.pathname.includes('/lottie') ||
     url.pathname.includes('/animate') ||
     url.pathname.includes('/assets'))
  )
}

function isCdnScript(url) {
  return (
    url.hostname.includes('cdn.jsdelivr.net') ||
    url.hostname.includes('cdnjs.cloudflare.com') ||
    url.hostname.includes('unpkg.com')
  )
}

function isGoogleFont(url) {
  return (
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  )
}

function isImage(url) {
  return /\.(png|jpe?g|gif|webp|avif|svg|ico)$/i.test(url.pathname)
}

function isHtmlPage(url) {
  return (
    url.pathname.endsWith('.html') ||
    url.pathname === '/' ||
    url.pathname.endsWith('/')
  )
}

function isOwnStaticAsset(url, origin) {
  return (
    url.origin === origin &&
    (url.pathname.endsWith('.css') || url.pathname.endsWith('.js'))
  )
}

// ── Fetch handler ────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  // --- Lottie JSON (animation data) — cache-first, no TTL (version-locked)
  if (isLottieAsset(url)) {
    event.respondWith(cacheFirst(req, LOTTIE_CACHE))
    return
  }

  // --- CDN scripts (GSAP, Lenis, Lottie player) — cache-first, 30-day TTL
  if (isCdnScript(url)) {
    event.respondWith(cacheFirst(req, CDN_CACHE, MONTH))
    return
  }

  // --- Google Fonts — cache-first, 1-year TTL
  if (isGoogleFont(url)) {
    event.respondWith(cacheFirst(req, FONT_CACHE, YEAR))
    return
  }

  // --- Images — cache-first, 7-day TTL
  if (isImage(url)) {
    event.respondWith(cacheFirst(req, IMAGE_CACHE, WEEK))
    return
  }

  // --- Own CSS / JS — stale-while-revalidate (fast + always updating)
  if (isOwnStaticAsset(url, self.location.origin)) {
    event.respondWith(staleWhileRevalidate(req, STATIC_CACHE))
    return
  }

  // --- HTML pages — network-first (always fresh content)
  if (isHtmlPage(url) && url.origin === self.location.origin) {
    event.respondWith(networkFirst(req, STATIC_CACHE))
    return
  }

  // --- Everything else — default browser fetch (no SW involvement)
})

// ── Message channel — allow page to trigger cache invalidation ───────────────
self.addEventListener('message', (event) => {
  if (!event.data) return

  switch (event.data.type) {
    // Force delete all caches and re-install
    case 'CLEAR_ALL_CACHES':
      caches.keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .then(() => {
          event.source?.postMessage({ type: 'CACHES_CLEARED' })
          self.registration.update()
        })
      break

    // Warm-cache a list of Lottie URLs on demand (e.g., prefetch on idle)
    case 'PRECACHE_LOTTIE':
      if (Array.isArray(event.data.urls)) {
        caches.open(LOTTIE_CACHE).then((cache) => {
          event.data.urls.forEach((url) => {
            fetch(url).then((res) => { if (res.ok) cache.put(url, res) }).catch(() => {})
          })
        })
      }
      break

    // Respond with current cache version info
    case 'GET_VERSION':
      event.source?.postMessage({ type: 'VERSION', version: CACHE_VERSION })
      break
  }
})
