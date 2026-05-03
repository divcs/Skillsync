gsap.registerPlugin(ScrollTrigger)

let globalClickListener = null

const stageCards = Array.from(document.querySelectorAll('.stage-card'))
const revealItems = document.querySelectorAll('[data-reveal]')
const progressBar = document.querySelector('.progress-bar')
const progressValue = document.getElementById('progress-value')
const journeyTitle = document.getElementById('journey-title')
const journeyKicker = document.getElementById('journey-kicker')
const journeyDetail = document.getElementById('journey-detail')
const carouselTrack = document.querySelector('.carousel-track')
const testimonialCards = Array.from(
  document.querySelectorAll('.testimonial-card'),
)
const carouselButtons = document.querySelectorAll('[data-carousel]')
const faqItems = Array.from(document.querySelectorAll('.faq-item'))
const contactForm = document.querySelector('.contact-form')

const progressLength = 2 * Math.PI * 88
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)',
).matches
const accentAnimations = {}
let currentSlide = 0
let carouselTimer
let journeyAnimation
const PRELOADER_SKIP_ONCE_KEY = 'skillsync-preloader-skip-once'
const LOGO_LOADER_SHOWN_KEY = 'skillsync-logo-loader-shown'
const LOGO_LOTTIE_PATH = 'assets/skillsync.json'

// Cache preloader decision once so multiple callers agree (avoids side effects of
// the sessionStorage flag removal in shouldRunPreloader())
let _preloaderWillRun = null
function preloaderWillRun() {
  if (_preloaderWillRun === null) _preloaderWillRun = shouldRunPreloader()
  return _preloaderWillRun
}

function safeStorageGet(storage, key) {
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

function safeStorageSet(storage, key, value) {
  try {
    storage.setItem(key, value)
  } catch {
    // Ignore storage failures (private mode / blocked storage).
  }
}

function safeStorageRemove(storage, key) {
  try {
    storage.removeItem(key)
  } catch {
    // Ignore storage failures (private mode / blocked storage).
  }
}

function isReloadNavigation() {
  const [navigationEntry] = performance.getEntriesByType('navigation')
  if (navigationEntry && navigationEntry.type) {
    return navigationEntry.type === 'reload'
  }

  if (performance.navigation) {
    return performance.navigation.type === 1
  }

  return false
}

function trackInternalNavigationClicks() {
  document.addEventListener(
    'click',
    (event) => {
      const link = event.target.closest('a[href]')
      if (!link) return
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      if (link.target && link.target !== '_self') return

      const rawHref = link.getAttribute('href') || ''
      if (
        !rawHref ||
        rawHref.startsWith('#') ||
        rawHref.startsWith('mailto:') ||
        rawHref.startsWith('tel:') ||
        rawHref.startsWith('javascript:')
      ) {
        return
      }

      let nextUrl
      try {
        nextUrl = new URL(link.href, window.location.href)
      } catch {
        return
      }

      if (nextUrl.origin !== window.location.origin) return

      safeStorageSet(sessionStorage, PRELOADER_SKIP_ONCE_KEY, '1')
    },
    true,
  )
}

function isCurrentPageHome() {
  const path = window.location.pathname.toLowerCase()
  const href = window.location.href.toLowerCase()
  return (
    path === '/' ||
    path.endsWith('/index.html') ||
    href.endsWith('/index.html') ||
    href.endsWith('/skillsync/') ||
    (href.includes('skillsync') && !href.includes('about') && !href.includes('services') && !href.includes('contact'))
  )
}

function shouldRunPreloader() {
  const fromInternalClick =
    safeStorageGet(sessionStorage, PRELOADER_SKIP_ONCE_KEY) === '1'

  if (fromInternalClick) {
    safeStorageRemove(sessionStorage, PRELOADER_SKIP_ONCE_KEY)
  }

  const isHomePage = isCurrentPageHome()
  const refreshVisit = isReloadNavigation()
  return (isHomePage && !fromInternalClick) || (refreshVisit && !fromInternalClick)
}

function shouldRunLogoLoader() {
  const isHomePage = isCurrentPageHome()
  const refreshVisit = isReloadNavigation()
  const alreadyShownInSession =
    safeStorageGet(sessionStorage, LOGO_LOADER_SHOWN_KEY) === '1'

  const shouldRun = isHomePage && !refreshVisit && !alreadyShownInSession
  console.log('[SkillSync Loader] Logo loader check:', { isHomePage, refreshVisit, alreadyShownInSession, shouldRun })
  return shouldRun
}

function runLogoLoader() {
  const logoLoader = document.getElementById('logo-loader')
  if (!logoLoader) return Promise.resolve()

  logoLoader.style.display = 'flex'
  gsap.set('#logo-loader', { yPercent: 0 })
  gsap.set('.loader-lottie-wrap', { opacity: 0, scale: 0.75 })
  gsap.set('.loader-brand', { opacity: 0, y: 16 })
  gsap.set('.loader-sub', { opacity: 0, y: 10 })
  gsap.set('.loader-line', { opacity: 0 })
  gsap.set('.loader-line span', { x: '-100%' })

  // Load the Lottie JSON animation
  const lottieContainer = document.getElementById('logo-loader-lottie')
  let loaderAnim = null
  if (typeof lottie !== 'undefined' && lottieContainer) {
    loaderAnim = lottie.loadAnimation({
      container: lottieContainer,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: encodeURI(LOGO_LOTTIE_PATH),
      rendererSettings: {
        preserveAspectRatio: 'xMidYMid slice',
        progressiveLoad: true,
      },
    })
  }

  return new Promise((resolve) => {
    const tl = gsap.timeline({
      onComplete: () => {
        if (loaderAnim) loaderAnim.destroy()
        logoLoader.style.display = 'none'
        resolve()
      },
    })

    tl
      .to('.loader-lottie-wrap', { opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out' })
      .to('.loader-brand', { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, '-=0.4')
      .to('.loader-sub', { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, '-=0.25')
      .to('.loader-line', { opacity: 1, duration: 0.3 }, '-=0.15')
      .to('.loader-line span', { x: '220%', duration: 1.1, ease: 'power2.inOut' })
      .to({}, { duration: 0.5 })
      .to('.loader-content', { opacity: 0, y: -16, duration: 0.4, ease: 'power2.in' })
      .to('#logo-loader', { yPercent: -100, duration: 0.85, ease: 'expo.inOut' }, '-=0.1')
  })
}



trackInternalNavigationClicks()

// SVG gradient for the progress orbit is injected once so the progress circle can glow.
if (progressBar) {
  const orbitSvg = document.querySelector('.progress-orbit svg')
  orbitSvg.insertAdjacentHTML(
    'afterbegin',
    `
      <defs>
        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#22d3ee"></stop>
          <stop offset="100%" stop-color="#8b5cf6"></stop>
        </linearGradient>
      </defs>
    `,
  )
  progressBar.style.strokeDasharray = `${progressLength}`
  progressBar.style.strokeDashoffset = `${progressLength * 0.75}`
}

async function initPreloader() {
  const greetings = [
    'Hello',
    'Hola',
    'Bonjour',
    'Ciao',
    'Hallo',
    'Konnichiwa',
    'Nǐ Hǎo',
    'Namaste',
  ]

  const logoLoader = document.getElementById('logo-loader')
  const greetingEl = document.getElementById('greeting')
  const preloader = document.getElementById('preloader')

  if (!greetingEl || !preloader) {
    if (logoLoader) {
      logoLoader.style.display = 'none'
    }
    document.body.classList.remove('is-loading')
    return
  }

  if (!preloaderWillRun()) {
    if (logoLoader) {
      logoLoader.style.display = 'none'
    }
    preloader.style.display = 'none'
    document.body.classList.remove('is-loading')
    initHeroReveal()
    return
  }

  if (shouldRunLogoLoader()) {
    safeStorageSet(sessionStorage, LOGO_LOADER_SHOWN_KEY, '1')
    await runLogoLoader()
  } else if (logoLoader) {
    logoLoader.style.display = 'none'
  }

  // ── BUILD COLUMN STRIPS (enigma-style) ──────────────────
  // Vertical strips spanning full screen height, hidden during greeting,
  // then slide UP staggered after greeting completes
  const NUM_COLS = window.innerWidth <= 768 ? 6 : 10
  const tilesContainer = document.createElement('div')
  tilesContainer.id = 'preloader-tiles'
  tilesContainer.className = 'preloader-tiles'
  tilesContainer.style.cssText = `
    position:fixed;inset:0;display:flex;
    flex-direction:row;z-index:10001;visibility:hidden;
    pointer-events:none;overflow:hidden;
  `
  for (let i = 0; i < NUM_COLS; i++) {
    const tile = document.createElement('div')
    tile.className = 'preloader-tile'
    tile.style.cssText = `flex:1;height:100%;background:#020617;`
    tilesContainer.appendChild(tile)
  }
  preloader.appendChild(tilesContainer)

  // Force solid bg directly — bypasses any CSS caching
  preloader.style.background = 'radial-gradient(ellipse at 50% 40%, #0d1340 0%, #020617 65%)'

  // ── GREETING SEQUENCE ──────────────────────────────────
  gsap.killTweensOf('#preloader')
  gsap.killTweensOf('#greeting')
  preloader.style.display = 'flex'
  gsap.set('#preloader', { opacity: 1 })
  gsap.set('#greeting', { opacity: 1 })

  document.body.classList.add('is-loading')

  function isComplexScript(word) {
    return /[\u0900-\u097F\u4E00-\u9FFF\u3040-\u30FF]/.test(word)
  }

  function splitText(word) {
    greetingEl.innerHTML = ''
    word.split('').forEach((letter) => {
      const span = document.createElement('span')
      span.textContent = letter
      span.classList.add('letter')
      greetingEl.appendChild(span)
    })
    return greetingEl.querySelectorAll('.letter')
  }

  const master = gsap.timeline()

  greetings.forEach((word) => {
    master.add(() => {
      const letters = splitText(word)

      gsap.fromTo(
        letters,
        { opacity: 0, y: 28, filter: 'blur(1.5px)' },
        {
          opacity: 1, y: 0, filter: 'blur(0px)',
          duration: 0.35, stagger: letters.length > 1 ? 0.025 : 0, ease: 'power2.out',
        },
      )

      gsap.to(letters, {
        opacity: 0, y: -18, filter: 'blur(3px)',
        duration: 0.28, delay: 0.5,
        stagger: letters.length > 1 ? 0.02 : 0, ease: 'power2.in',
      })
    })
    master.to({}, { duration: 0.7 })
  })

  // Fade out greeting text before tile wipe
  master.to('#greeting', {
    opacity: 0,
    y: -14,
    duration: 0.35,
    ease: 'power2.in',
  })

  // ── ENIGMA-STYLE COLUMN SLIDE-UP REVEAL ──────────────────────────
  // master.call() is the correct GSAP 3 API for timeline callbacks
  master.call(() => {
    if (!tilesContainer) {
      document.body.classList.remove('is-loading')
      preloader.style.display = 'none'
      initHeroReveal()
      window.dispatchEvent(new CustomEvent('preloader-done'))
      return
    }

    // Hard-clear greeting
    gsap.set('#greeting', { opacity: 0, visibility: 'hidden' })

    // Make tiles visible — position:fixed z:10001 covers everything
    tilesContainer.style.visibility = 'visible'
    gsap.set(tilesContainer.querySelectorAll('.preloader-tile'), { yPercent: 0 })

    gsap.to(tilesContainer.querySelectorAll('.preloader-tile'), {
      yPercent: -100,
      duration: 0.88,
      ease: 'power3.inOut',
      stagger: { each: 0.055, from: 'start' },
      onComplete: () => {
        tilesContainer.remove()
        preloader.style.display = 'none'
        document.body.classList.remove('is-loading')
        initHeroReveal()
        window.dispatchEvent(new CustomEvent('preloader-done'))
      },
    })
  })
}

// ── Hero Reveal (called from preloader onComplete) ─────────────────────────
// Only ensures the .hero-copy container is visible.
// Individual child animations are owned by initHeroEntranceSequence.
function initHeroReveal() {
  const heroCopy = document.querySelector('.hero-copy')
  if (!heroCopy) return
  gsap.set(heroCopy, { opacity: 1, visibility: 'visible', clearProps: 'transform' })
}


window.addEventListener('DOMContentLoaded', initPreloader)

// Wrap all init functions in try-catch to ensure they don't block each other
try { initLenis() } catch(e) { console.warn('initLenis error:', e) }
try { initCursor() } catch(e) { console.warn('initCursor error:', e) }
try { initHeroParallax() } catch(e) { console.warn('initHeroParallax error:', e) }
try { initLottieAccents() } catch(e) { console.warn('initLottieAccents error:', e) }
try { initReveals() } catch(e) { console.warn('initReveals error:', e) }
try { initJourney() } catch(e) { console.warn('initJourney error:', e) }
try { initServiceCards() } catch(e) { console.warn('initServiceCards error:', e) }
try { initMagneticButtons() } catch(e) { console.warn('initMagneticButtons error:', e) }
try { initCarousel() } catch(e) { console.warn('initCarousel error:', e) }
try { initFaq() } catch(e) { console.warn('initFaq error:', e) }
try { initForm() } catch(e) { console.warn('initForm error:', e) }
try { initMobileMenu() } catch(e) { console.warn('initMobileMenu error:', e) }

function initTeamAvatars() {
  const avatars = document.querySelectorAll('.team-avatar')
  avatars.forEach((wrapper) => {
    const img = wrapper.querySelector('img.avatar-img')
    if (!img) return

    // If image src exists, optimistically mark as having image so initials hide immediately
    if (img.src && img.src.trim().length > 0) {
      wrapper.classList.add('has-img')
    }

    // If image already loaded and valid, ensure class is present
    if (img.complete && img.naturalWidth > 0) {
      wrapper.classList.add('has-img')
    }

    // Add load/error listeners to keep state accurate
    img.addEventListener('load', () => wrapper.classList.add('has-img'))
    img.addEventListener('error', () => wrapper.classList.remove('has-img'))
  })
}

try { initTeamAvatars() } catch (e) { console.warn('initTeamAvatars error:', e) }

function initLenis() {
  const lenis = new Lenis({
    lerp: 0.08,
    smoothWheel: true,
  })

  lenis.on('scroll', ScrollTrigger.update)

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000)
  })

  gsap.ticker.lagSmoothing(0)
}

function initCursor() {
  if (window.matchMedia('(hover: none), (pointer: coarse)').matches) {
    return
  }

  const dot = document.querySelector('.cursor-dot')
  const ring = document.querySelector('.cursor-ring')
  const dotX = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3.out' })
  const dotY = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3.out' })
  const ringX = gsap.quickTo(ring, 'x', { duration: 0.32, ease: 'power3.out' })
  const ringY = gsap.quickTo(ring, 'y', { duration: 0.32, ease: 'power3.out' })
  const hoverTargets = document.querySelectorAll(
    '.cursor-hover, a, button, input, textarea',
  )

  window.addEventListener('mousemove', (event) => {
    document.body.classList.add('cursor-active')
    dotX(event.clientX)
    dotY(event.clientY)
    ringX(event.clientX)
    ringY(event.clientY)
  })

  window.addEventListener('mouseout', () => {
    document.body.classList.remove('cursor-active')
  })

  hoverTargets.forEach((target) => {
    target.addEventListener('mouseenter', () =>
      document.body.classList.add('cursor-expanded'),
    )
    target.addEventListener('mouseleave', () =>
      document.body.classList.remove('cursor-expanded'),
    )
  })
}

function initHeroParallax() {
  const sceneItems = document.querySelectorAll('[data-parallax]')

  window.addEventListener('mousemove', (event) => {
    const x = event.clientX / window.innerWidth - 0.5
    const y = event.clientY / window.innerHeight - 0.5

    sceneItems.forEach((item) => {
      const depth = Number(item.dataset.parallax)
      gsap.to(item, {
        x: x * depth * 160,
        y: y * depth * 120,
        duration: 0.9,
        ease: 'power3.out',
        overwrite: true,
      })
    })
  })

  gsap.to('.sky-glow-a', {
    xPercent: 8,
    yPercent: 6,
    duration: 12,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
  })

  gsap.to('.sky-glow-b', {
    xPercent: -10,
    yPercent: 10,
    duration: 14,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
  })

  gsap.to('.orb-c', {
    scale: 1.5,
    opacity: 0.45,
    duration: 2.6,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
  })

  gsap.to('.hero .mountain-back', {
    yPercent: -10,
    ease: 'none',
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: 'bottom top',
      scrub: true,
    },
  })

  gsap.to('.hero .mountain-mid', {
    yPercent: -16,
    ease: 'none',
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: 'bottom top',
      scrub: true,
    },
  })

  gsap.to('.hero .mountain-front', {
    yPercent: -24,
    ease: 'none',
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: 'bottom top',
      scrub: true,
    },
  })
}

function loadLottieAnimation({
  container,
  path,
  loop = true,
  autoplay = true,
  speed = 1,
  renderer = 'svg',
  assetsPath,
  preserveAspectRatio = 'xMidYMid meet',
}) {
  if (typeof lottie === 'undefined') {
    return null
  }

  const target =
    typeof container === 'string'
      ? document.getElementById(container)
      : container

  if (!target) {
    return null
  }

  const animation = lottie.loadAnimation({
    container: target,
    renderer,
    loop: prefersReducedMotion ? false : loop,
    autoplay: prefersReducedMotion ? false : autoplay,
    path: encodeURI(path),
    assetsPath: assetsPath ? encodeURI(assetsPath) : undefined,
    rendererSettings: {
      progressiveLoad: true,
      hideOnTransparent: true,
      preserveAspectRatio,
    },
  })

  animation.setSpeed(speed)

  if (prefersReducedMotion) {
    animation.addEventListener('DOMLoaded', () => {
      animation.goToAndStop(0, true)
    })
  }

  return animation
}

function bindLottieToScroll(
  animation,
  { trigger, start, end, fromFrame = 0, toFrame = null },
) {
  if (!animation || prefersReducedMotion) {
    return
  }

  const syncWithScroll = () => {
    const lastFrame = Math.max(0, Math.floor(animation.totalFrames - 1))
    const targetFrame =
      typeof toFrame === 'number' ? Math.min(toFrame, lastFrame) : lastFrame

    ScrollTrigger.create({
      trigger,
      start,
      end,
      scrub: true,
      onUpdate: ({ progress }) => {
        const frame = gsap.utils.interpolate(fromFrame, targetFrame, progress)
        animation.goToAndStop(frame, true)
      },
    })
  }

  if (animation.isLoaded || animation.totalFrames) {
    syncWithScroll()
    return
  }

  const handleReady = () => {
    animation.removeEventListener('DOMLoaded', handleReady)
    syncWithScroll()
  }

  animation.addEventListener('DOMLoaded', handleReady)
}

function initLottieAccents() {
  const compactViewport = window.matchMedia('(max-width: 1100px)').matches

  accentAnimations.heroFloatingLines = loadLottieAnimation({
    container: 'hero-floating-lines',
    path: 'assets/lottie-files/Floating Lines.json',
    loop: false,
    autoplay: false,
    speed: 0.4,
    preserveAspectRatio: 'xMidYMid slice',
  })

  bindLottieToScroll(accentAnimations.heroFloatingLines, {
    trigger: '.hero',
    start: 'top top',
    end: 'bottom top',
    fromFrame: 50,
    toFrame: 430,
  })

  accentAnimations.heroUi = loadLottieAnimation({
    container: 'hero-ui-lottie',
    path: 'assets/lottie-files/UI Animation.json',
    speed: 0.8,
  })

  accentAnimations.progressPulse = loadLottieAnimation({
    container: 'progress-pulse-lottie',
    path: 'assets/animate/pulse loader (1).json',
    speed: 0.92,
  })

  if (!compactViewport) {
    accentAnimations.jobMatch = loadLottieAnimation({
      container: 'job-match-lottie',
      path: 'assets/lottie-files/search-for-employee/animations/12345.json',
      speed: 0.92,
    })
  }

  accentAnimations.formRocket = loadLottieAnimation({
    container: 'form-rocket-lottie',
    path: 'assets/lottie-files/rocket-launch/animations/88ef49fc-7868-4e1a-b677-2df4eb236ac7.json',
    loop: false,
    autoplay: false,
    speed: 1.04,
  })
}

function initReveals() {
  revealItems.forEach((item) => {
    gsap.to(item, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: item,
        start: 'top 82%',
      },
    })
  })
}

function initJourney() {
  const lottieTarget = document.getElementById('journey-lottie')

  if (lottieTarget) {
    journeyAnimation = loadLottieAnimation({
      container: lottieTarget,
      loop: false,
      autoplay: false,
      path: 'assets/lottie/1skillsync-fixed.json',
      preserveAspectRatio: 'xMidYMid slice',
    })

    journeyAnimation.addEventListener('DOMLoaded', () => updateJourney(0))
  }

  if (window.innerWidth > 1100) {
    ScrollTrigger.create({
      trigger: '.journey-track',
      start: 'top top+=90',
      end: 'bottom bottom',
      pin: '.journey-pin',
      scrub: true,
      anticipatePin: 1,
      onUpdate: ({ progress }) => {
        updateJourney(progress)
      },
    })
  } else {
    updateJourney(0)
  }

  stageCards.forEach((card) => {
    card.addEventListener('click', () => {
      const stage = Number(card.dataset.stage)
      updateJourney(stage / (stageCards.length - 1))
    })
  })
}

function updateJourney(progress) {
  if (!stageCards.length || !journeyTitle || !journeyKicker || !journeyDetail || !progressValue) {
    return
  }

  const clamped = gsap.utils.clamp(0, 1, progress)
  const stageIndex = Math.min(
    stageCards.length - 1,
    Math.floor(clamped * stageCards.length),
  )
  const activeCard = stageCards[stageIndex]
  const percent = Math.round(25 + clamped * 75)

  document.body.dataset.stage = String(stageIndex)
  stageCards.forEach((card, index) => {
    card.classList.toggle('active', index === stageIndex)
  })

  if (activeCard) {
    journeyTitle.textContent = activeCard.dataset.title
    journeyKicker.textContent = activeCard.dataset.kicker
    journeyDetail.textContent = activeCard.dataset.detail
  }

  if (progressBar) {
    progressBar.style.strokeDashoffset = `${progressLength * (1 - percent / 100)}`
  }

  progressValue.textContent = `${percent}%`

  if (journeyAnimation && journeyAnimation.totalFrames) {
    const frame = journeyAnimation.totalFrames * clamped
    journeyAnimation.goToAndStop(frame, true)
  }
}

function initServiceCards() {
  const cards = document.querySelectorAll('.tilt-card')

  cards.forEach((card) => {
    card.addEventListener('mousemove', (event) => {
      const rect = card.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const rotateY = gsap.utils.mapRange(0, rect.width, -10, 10, x)
      const rotateX = gsap.utils.mapRange(0, rect.height, 10, -10, y)

      gsap.to(card, {
        rotateX,
        rotateY,
        transformPerspective: 1000,
        duration: 0.35,
        ease: 'power2.out',
      })
    })

    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        rotateX: 0,
        rotateY: 0,
        duration: 0.45,
        ease: 'power2.out',
      })
    })
  })
}

function initMagneticButtons() {
  const magneticItems = document.querySelectorAll('.magnetic')

  magneticItems.forEach((item) => {
    item.addEventListener('mousemove', (event) => {
      const rect = item.getBoundingClientRect()
      const x = event.clientX - rect.left - rect.width / 2
      const y = event.clientY - rect.top - rect.height / 2

      gsap.to(item, {
        x: x * 0.18,
        y: y * 0.18,
        duration: 0.35,
        ease: 'power2.out',
      })
    })

    item.addEventListener('mouseleave', () => {
      gsap.to(item, {
        x: 0,
        y: 0,
        duration: 0.45,
        ease: 'elastic.out(1, 0.4)',
      })
    })
  })
}

function initCarousel() {
  if (!carouselTrack || !testimonialCards.length) {
    return
  }

  const getMetrics = () => {
    const cardWidth = testimonialCards[0].offsetWidth
    const gap = 18
    const visibleCards = Math.max(
      1,
      Math.floor(
        (carouselTrack.parentElement.clientWidth + gap) / (cardWidth + gap),
      ),
    )
    const maxIndex = Math.max(0, testimonialCards.length - visibleCards)

    return { cardWidth, gap, maxIndex }
  }

  const moveCarousel = (index) => {
    const { cardWidth, gap, maxIndex } = getMetrics()
    currentSlide = index

    if (currentSlide > maxIndex) {
      currentSlide = 0
    }

    if (currentSlide < 0) {
      currentSlide = maxIndex
    }

    gsap.to(carouselTrack, {
      x: -(cardWidth + gap) * currentSlide,
      duration: 0.9,
      ease: 'power3.inOut',
    })
  }

  const startAutoplay = () => {
    clearInterval(carouselTimer)
    carouselTimer = setInterval(() => moveCarousel(currentSlide + 1), 4200)
  }

  carouselButtons.forEach((button) => {
    button.addEventListener('click', () => {
      moveCarousel(currentSlide + (button.dataset.carousel === 'next' ? 1 : -1))
      startAutoplay()
    })
  })

  window.addEventListener('resize', () => moveCarousel(currentSlide))
  moveCarousel(0)
  startAutoplay()
}

function initFaq() {
  faqItems.forEach((item, itemIndex) => {
    const question = item.querySelector('.faq-question')
    const answer = item.querySelector('.faq-answer')

    if (item.classList.contains('active')) {
      gsap.set(answer, { height: 'auto' })
    }

    question.addEventListener('click', () => {
      faqItems.forEach((otherItem, otherIndex) => {
        const otherAnswer = otherItem.querySelector('.faq-answer')
        const isActive =
          itemIndex === otherIndex && !otherItem.classList.contains('active')

        otherItem.classList.toggle('active', isActive)
        otherItem
          .querySelector('.faq-question')
          .setAttribute('aria-expanded', String(isActive))

        gsap.to(otherAnswer, {
          height: isActive ? 'auto' : 0,
          duration: 0.42,
          ease: 'power2.inOut',
        })
      })
    })
  })
}

function initForm() {
  if (!contactForm) {
    return
  }

  const submitButton = contactForm.querySelector("button[type='submit']")
  const formSuccess = contactForm.querySelector('.form-success')

  contactForm.addEventListener('submit', (event) => {
    event.preventDefault()

    if (!submitButton) {
      return
    }

    submitButton.textContent = 'Roadmap Requested'
    contactForm.classList.add('is-submitted')
    formSuccess?.classList.add('is-visible')

    if (!prefersReducedMotion && accentAnimations.formRocket) {
      accentAnimations.formRocket.stop()
      accentAnimations.formRocket.goToAndStop(0, true)
      accentAnimations.formRocket.play()
    }

    gsap.fromTo(
      submitButton,
      { scale: 0.96 },
      { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' },
    )
  })
}

function initMobileMenu() {
  const menuToggle = document.getElementById('mobileMenuToggle')
  const siteNav = document.getElementById('siteNav')
  const navLinks = siteNav?.querySelectorAll('a')

  if (!menuToggle || !siteNav) return

  // Ensure menu starts in closed state
  menuToggle.classList.remove('is-active')
  siteNav.classList.remove('is-open')

  // Toggle menu on button click
  const toggleClick = (e) => {
    e.stopPropagation()
    const isOpen = siteNav.classList.contains('is-open')
    
    if (isOpen) {
      menuToggle.classList.remove('is-active')
      siteNav.classList.remove('is-open')
    } else {
      menuToggle.classList.add('is-active')
      siteNav.classList.add('is-open')
    }
  }

  menuToggle.addEventListener('click', toggleClick)

  // Close menu when clicking a navigation link
  navLinks?.forEach((link) => {
    link.addEventListener('click', () => {
      menuToggle.classList.remove('is-active')
      siteNav.classList.remove('is-open')
    })
  })

  // Remove old global listener if exists
  if (globalClickListener) {
    document.removeEventListener('click', globalClickListener)
  }

  // Close menu when clicking outside
  globalClickListener = (e) => {
    if (!e.target.closest('header')) {
      if (siteNav.classList.contains('is-open')) {
        menuToggle.classList.remove('is-active')
        siteNav.classList.remove('is-open')
      }
    }
  }
  document.addEventListener('click', globalClickListener)

  // Close menu on window resize if needed
  window.addEventListener('resize', () => {
    if (window.innerWidth > 1100 && siteNav.classList.contains('is-open')) {
      menuToggle.classList.remove('is-active')
      siteNav.classList.remove('is-open')
    }
  })
}

/* ═══════════════════════════════════════════════════════
   PREMIUM ADDITIONS — Scroll Progress, Navbar Glass,
   Hero Word Split, Marquee Ticker, Back-to-Top, Reveals
═══════════════════════════════════════════════════════ */

if (typeof ScrollToPlugin !== 'undefined') {
  gsap.registerPlugin(ScrollToPlugin)
}

// ── Scroll Progress Bar ──────────────────────────────
function initScrollProgress() {
  const bar = document.getElementById('scroll-progress')
  if (!bar) return
  gsap.to(bar, {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: {
      trigger: document.documentElement,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.25,
    },
  })
}

// ── Navbar Scroll Glassmorphism ───────────────────────
function initNavbarScroll() {
  const header = document.querySelector('.site-header')
  if (!header) return
  ScrollTrigger.create({
    start: 'top -72',
    onEnter: () => header.classList.add('scrolled'),
    onLeaveBack: () => header.classList.remove('scrolled'),
  })
}

// ── Hero Reveal ───────────────────────────────────────
// Called from preloader onComplete after body.is-loading is removed.
// Uses simple fromTo instead of word-split to guarantee visibility.
function initHeroWordReveal() {
  const heroCopy = document.querySelector('.hero-copy')
  if (!heroCopy || prefersReducedMotion) return
  if (heroCopy.dataset.revealDone) return
  heroCopy.dataset.revealDone = '1'

  const h1    = heroCopy.querySelector('h1')
  const eyebrow = heroCopy.querySelector('.eyebrow')
  const text  = heroCopy.querySelector('.hero-text')
  const cta   = heroCopy.querySelector('.hero-actions')
  const metrics = heroCopy.querySelector('.hero-metrics')

  // Staggered entrance: eyebrow → h1 → paragraph → CTA → metrics
  const els = [eyebrow, h1, text, cta, metrics].filter(Boolean)
  gsap.fromTo(
    els,
    { opacity: 0, y: 28 },
    {
      opacity: 1,
      y: 0,
      duration: 0.75,
      stagger: 0.12,
      ease: 'power3.out',
      delay: 0.1,
      clearProps: 'all',
    },
  )
}

// ── Seamless Marquee Ticker ───────────────────────────
function initMarquee() {
  const inner = document.getElementById('marquee-inner')
  if (!inner) return
  const track = inner.querySelector('.marquee-track')
  if (!track) return

  const clone = track.cloneNode(true)
  inner.appendChild(clone)

  const tracks = inner.querySelectorAll('.marquee-track')
  const tl = gsap.timeline({ repeat: -1, defaults: { ease: 'none' } })
  tl.to(tracks, { xPercent: -100, duration: 30 })
  tl.set(tracks, { xPercent: 0 })

  inner.addEventListener('mouseenter', () => tl.timeScale(0.2))
  inner.addEventListener('mouseleave', () => tl.timeScale(1))
}

// ── Back To Top ──────────────────────────────────────
function initBackToTop() {
  const btn = document.getElementById('back-to-top')
  if (!btn) return

  ScrollTrigger.create({
    start: 'top -500',
    onEnter: () => btn.classList.add('is-visible'),
    onLeaveBack: () => btn.classList.remove('is-visible'),
  })

  btn.addEventListener('click', () => {
    if (typeof ScrollToPlugin !== 'undefined') {
      gsap.to(window, { scrollTo: 0, duration: 1.1, ease: 'power3.inOut' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  })
}

// ── Enhanced Section Stagger Reveals ─────────────────
function initEnhancedReveals() {
  if (prefersReducedMotion) return

  // Service cards
  const serviceCards = document.querySelectorAll('.service-card')
  if (serviceCards.length) {
    gsap.fromTo(
      serviceCards,
      { y: 60, opacity: 0, scale: 0.95 },
      {
        y: 0, opacity: 1, scale: 1,
        duration: 0.7, stagger: 0.12, ease: 'power3.out',
        scrollTrigger: {
          trigger: serviceCards[0].parentElement,
          start: 'top 78%',
          toggleActions: 'play none none none',
        },
      },
    )
  }

  // Team cards
  const teamCards = document.querySelectorAll('.team-card')
  if (teamCards.length) {
    gsap.fromTo(
      teamCards,
      { y: 50, opacity: 0, scale: 0.92 },
      {
        y: 0, opacity: 1, scale: 1,
        duration: 0.65, stagger: 0.14, ease: 'back.out(1.2)',
        scrollTrigger: {
          trigger: teamCards[0].parentElement,
          start: 'top 78%',
          toggleActions: 'play none none none',
        },
      },
    )
  }

  // FAQ items
  const faqItemEls = document.querySelectorAll('.faq-item')
  if (faqItemEls.length) {
    gsap.fromTo(
      faqItemEls,
      { x: -30, opacity: 0 },
      {
        x: 0, opacity: 1,
        duration: 0.6, stagger: 0.1, ease: 'power2.out',
        scrollTrigger: {
          trigger: faqItemEls[0].parentElement,
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
      },
    )
  }

  // Contact section
  const contactShell = document.querySelector('.contact-shell')
  if (contactShell) {
    gsap.fromTo(
      contactShell,
      { y: 60, opacity: 0 },
      {
        y: 0, opacity: 1, duration: 1, ease: 'power3.out',
        scrollTrigger: {
          trigger: contactShell,
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
      },
    )
  }

  // Hero panel floating levitation
  const heroPanel = document.querySelector('.hero-panel')
  if (heroPanel) {
    gsap.to(heroPanel, { y: -12, duration: 3.5, yoyo: true, repeat: -1, ease: 'sine.inOut' })
  }
}

// 7.5s safety net: if preloader-done never fired, force hero visible
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const heroCopy = document.querySelector('.hero-copy')
    if (heroCopy) gsap.set(heroCopy, { opacity: 1, visibility: 'visible' })
  }, 7500)
})

// ── Init ─────────────────────────────────────────────
try { initScrollProgress() } catch (e) { console.warn('initScrollProgress:', e) }
try { initNavbarScroll() } catch (e) { console.warn('initNavbarScroll:', e) }
try { initMarquee() } catch (e) { console.warn('initMarquee:', e) }
try { initBackToTop() } catch (e) { console.warn('initBackToTop:', e) }
try { initEnhancedReveals() } catch (e) { console.warn('initEnhancedReveals:', e) }

// ── Number Counter Animation ───────────────────────────
function initCounters() {
  document.querySelectorAll('[data-count]').forEach((el) => {
    const target = parseInt(el.dataset.count, 10)
    const suffix = el.dataset.suffix || ''
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        const obj = { n: 0 }
        gsap.to(obj, {
          n: target,
          duration: 2.2,
          ease: 'power2.out',
          onUpdate() { el.textContent = Math.round(obj.n) + suffix },
        })
      },
    })
  })
}
try { initCounters() } catch (e) { console.warn('initCounters:', e) }

// ── Text Reveal — Word Curtain Slide-Up ──────────────
// Automatically applies to ALL section headings — no attribute needed
function initTextReveal() {
  if (prefersReducedMotion) return

  // Target every h2 in the page, plus blog-hero h1
  const headings = [
    ...document.querySelectorAll('h2'),
    ...document.querySelectorAll('.blog-hero h1'),
  ]

  headings.forEach((el) => {
    // Skip if already processed by another function
    if (el.dataset.revealDone) return
    el.dataset.revealDone = '1'

    const raw = el.textContent.trim()
    if (!raw) return

    // Split each word into overflow:hidden wrapper
    const words = raw.split(/\s+/).filter(Boolean)
    el.innerHTML = words
      .map((w) => `<span class="reveal-word-wrap"><span class="reveal-word-inner">${w}</span></span>`)
      .join(' ')

    const inners = el.querySelectorAll('.reveal-word-inner')
    gsap.set(inners, { yPercent: 108 })

    // Immediately make parent [data-reveal] container visible so the
    // h2 is not hidden behind an opacity:0 parent block
    const revealParent = el.closest('[data-reveal]')
    if (revealParent) {
      gsap.set(revealParent, { opacity: 1, y: 0 })
      revealParent.classList.add('is-visible')
    }

    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: () => {
        gsap.to(inners, {
          yPercent: 0,
          duration: 0.82,
          stagger: 0.052,
          ease: 'power3.out',
        })
      },
    })
  })

  // Eyebrow labels — blur-clear fade (skip hero eyebrow which is handled by initHeroEntranceSequence)
  document.querySelectorAll('.eyebrow:not([data-hero-eyebrow])').forEach((el) => {
    if (el.dataset.eyebrowDone) return
    el.dataset.eyebrowDone = '1'
    gsap.set(el, { opacity: 0, filter: 'blur(5px)', y: 5 })
    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () => {
        gsap.to(el, {
          opacity: 1,
          filter: 'blur(0px)',
          y: 0,
          duration: 0.65,
          ease: 'power2.out',
        })
      },
    })
  })
}
try { initTextReveal() } catch (e) { console.warn('initTextReveal:', e) }

// ── Gradient Border Mouse Tracking (service cards) ────
function initGradientBorder() {
  document.querySelectorAll('.service-card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect()
      card.style.setProperty('--gx', `${e.clientX - r.left}px`)
      card.style.setProperty('--gy', `${e.clientY - r.top}px`)
    })
  })
}
try { initGradientBorder() } catch (e) { console.warn('initGradientBorder:', e) }

// ── Cursor Spotlight (hero) ────────────────────────────
function initCursorSpotlight() {
  const hero = document.querySelector('.hero')
  if (!hero) return
  hero.addEventListener('mouseenter', () => hero.classList.add('has-spotlight'))
  hero.addEventListener('mouseleave', () => hero.classList.remove('has-spotlight'))
  hero.addEventListener('mousemove', (e) => {
    const r = hero.getBoundingClientRect()
    hero.style.setProperty('--spotlight-x', `${e.clientX - r.left}px`)
    hero.style.setProperty('--spotlight-y', `${e.clientY - r.top}px`)
  })
}
try { initCursorSpotlight() } catch (e) { console.warn('initCursorSpotlight:', e) }

// ── Particle Star Field (hero canvas) ─────────────────
function initParticles() {
  const canvas = document.getElementById('hero-particles')
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  let W, H, stars = []

  const resize = () => {
    const hero = canvas.parentElement
    W = canvas.width = hero.offsetWidth
    H = canvas.height = hero.offsetHeight
  }

  const mkStar = () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.2 + 0.2,
    a: Math.random(),
    sp: Math.random() * 0.004 + 0.001,
    dir: Math.random() > 0.5 ? 1 : -1,
  })

  resize()
  stars = Array.from({ length: 120 }, mkStar)
  window.addEventListener('resize', () => { resize(); stars = Array.from({ length: 120 }, mkStar) })

  let raf
  const draw = () => {
    ctx.clearRect(0, 0, W, H)
    stars.forEach((s) => {
      s.a += s.sp * s.dir
      if (s.a > 1 || s.a < 0) s.dir *= -1
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(200, 190, 255, ${s.a * 0.7})`
      ctx.fill()
    })
    raf = requestAnimationFrame(draw)
  }

  draw()

  // Stop when hero not visible
  ScrollTrigger.create({
    trigger: canvas.parentElement,
    start: 'top top',
    end: 'bottom top',
    onLeave: () => cancelAnimationFrame(raf),
    onEnterBack: () => draw(),
  })
}
try { initParticles() } catch (e) { console.warn('initParticles:', e) }

// ── Enigma-style Nav Link Slide-Up Hover ─────────────
function initNavHoverEffect() {
  const navLinks = document.querySelectorAll('.site-nav a')
  navLinks.forEach((link) => {
    // Avoid double-wrapping
    if (link.dataset.navWrapped) return
    link.dataset.navWrapped = '1'

    const originalText = link.textContent.trim()
    link.textContent = ''

    const inner = document.createElement('span')
    inner.className = 'nav-text-inner'
    inner.textContent = originalText
    link.appendChild(inner)

    const clone = document.createElement('span')
    clone.className = 'nav-text-clone'
    clone.setAttribute('aria-hidden', 'true')
    clone.textContent = originalText
    link.appendChild(clone)
  })
}
try { initNavHoverEffect() } catch (e) { console.warn('initNavHoverEffect:', e) }

// ── Hero Entrance Sequence (single source of truth for ALL hero animations) ─
function initHeroEntranceSequence() {
  if (prefersReducedMotion) return
  if (!preloaderWillRun()) return

  const h1         = document.querySelector('.hero-copy h1')
  const eyebrow    = document.querySelector('.hero-copy [data-hero-eyebrow]')
  const heroText   = document.querySelector('.hero-copy .hero-text')
  const heroActions = document.querySelector('.hero-copy .hero-actions')
  const heroMetrics = document.querySelectorAll('.hero-metrics div')

  // Hide ALL hero children initially — h1 included
  const elementsToHide = [eyebrow, h1, heroText, heroActions, ...Array.from(heroMetrics)].filter(Boolean)
  gsap.set(elementsToHide, { opacity: 0 })

  function runEntrance() {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

    // Eyebrow
    if (eyebrow) {
      tl.fromTo(eyebrow,
        { opacity: 0, y: 14, filter: 'blur(4px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.55 },
        0.05
      )
      setTimeout(() => eyebrow.classList.add('is-active'), 700)
    }

    // H1 — word curtain slide-up
    if (h1) {
      const raw = h1.textContent.trim()
      if (raw) {
        h1.innerHTML = raw.split(/\s+/).filter(Boolean)
          .map((w) => `<span class="reveal-word-wrap"><span class="reveal-word-inner">${w}</span></span>`)
          .join(' ')
      }
      const wordInners = h1.querySelectorAll('.reveal-word-inner')
      if (wordInners.length) {
        gsap.set(wordInners, { yPercent: 110 })
        tl.to(wordInners, { yPercent: 0, duration: 0.78, stagger: 0.055, ease: 'power3.out' }, 0.22)
      } else {
        tl.fromTo(h1, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.75 }, 0.22)
      }
    }

    // Paragraph text — word curtain
    if (heroText) {
      const words = heroText.textContent.split(/\s+/).filter(Boolean)
      heroText.innerHTML = words
        .map((w) => `<span class="reveal-word-wrap"><span class="reveal-word-inner">${w}</span></span>`)
        .join(' ')
      const wordInners = heroText.querySelectorAll('.reveal-word-inner')
      gsap.set(wordInners, { yPercent: 110 })
      tl.to(wordInners, { yPercent: 0, duration: 0.68, stagger: 0.03, ease: 'power3.out' }, 0.52)
    }

    // CTA buttons
    if (heroActions) {
      tl.fromTo(heroActions, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 }, 0.82)
    }

    // Metrics
    if (heroMetrics.length) {
      tl.fromTo(heroMetrics,
        { opacity: 0, y: 24, scale: 0.94 },
        { opacity: 1, y: 0, scale: 1, duration: 0.55, stagger: 0.1 },
        1.02
      )
    }
  }

  window.addEventListener('preloader-done', runEntrance, { once: true })

  // 12s fallback in case preloader-done never fires
  setTimeout(() => gsap.to(elementsToHide, { opacity: 1, duration: 0.5 }), 12000)
}
try { initHeroEntranceSequence() } catch (e) { console.warn('initHeroEntranceSequence:', e) }


// ── Enigma-style: Animated section intro accent lines ─
function initSectionAccents() {
  if (prefersReducedMotion) return

  document.querySelectorAll('.section-intro').forEach((intro) => {
    // Add animated accent line before each section intro
    if (!intro.querySelector('.section-accent-dash')) {
      const dash = document.createElement('div')
      dash.className = 'section-accent-dash'
      dash.style.cssText = `
        width: 0px; height: 2px;
        background: linear-gradient(90deg, var(--violet), var(--cyan));
        border-radius: 2px; margin-bottom: 18px;
        transform-origin: left center;
      `
      intro.prepend(dash)

      ScrollTrigger.create({
        trigger: intro,
        start: 'top 84%',
        once: true,
        onEnter: () => {
          gsap.to(dash, { width: '40px', duration: 0.8, ease: 'power3.out' })
        },
      })
    }
  })

  // Eyebrow gradient activation on scroll
  document.querySelectorAll('.eyebrow').forEach((el) => {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: () => {
        setTimeout(() => el.classList.add('is-active'), 400)
      },
    })
  })
}
try { initSectionAccents() } catch (e) { console.warn('initSectionAccents:', e) }

// ── Enigma-style: Hero panel parallax depth ───────────
function initHeroPanelDepth() {
  const panel = document.querySelector('.hero-panel')
  if (!panel) return

  document.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 10
    const y = (e.clientY / window.innerHeight - 0.5) * 6
    gsap.to(panel, {
      rotateY: x,
      rotateX: -y,
      transformPerspective: 1200,
      duration: 1.2,
      ease: 'power2.out',
      overwrite: true,
    })
  })

  panel.addEventListener('mouseleave', () => {
    gsap.to(panel, {
      rotateY: 0, rotateX: 0,
      duration: 1.5, ease: 'elastic.out(1, 0.4)',
    })
  })
}
try { initHeroPanelDepth() } catch (e) { console.warn('initHeroPanelDepth:', e) }
