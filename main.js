gsap.registerPlugin(ScrollTrigger)

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

function initPreloader() {
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

  const greetingEl = document.getElementById('greeting')
  const preloader = document.getElementById('preloader')
  const hero = document.querySelector('.hero')

  if (!greetingEl || !preloader) {
    document.body.classList.remove('loading')
    return
  }

  document.body.classList.add('loading')

  // ✅ Single definition (removed duplicate)
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

      // IN
      gsap.fromTo(
        letters,
        {
          opacity: 0,
          y: 28,
          filter: 'blur(1.5px)',
        },
        {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.35,
          stagger: letters.length > 1 ? 0.025 : 0,
          ease: 'power2.out',
        },
      )

      // OUT
      gsap.to(letters, {
        opacity: 0,
        y: -18,
        filter: 'blur(3px)',
        duration: 0.28,
        delay: 0.5,
        stagger: letters.length > 1 ? 0.02 : 0,
        ease: 'power2.in',
      })
    })

    master.to({}, { duration: 0.7 })
  })

  // 1️⃣ fade out greeting
  master.to('#greeting', {
    opacity: 0,
    duration: 0.3,
    ease: 'power2.out',
  })

  // 2️⃣ slight scale (depth)
  master.to('#preloader', {
    scale: 1.02,
    duration: 0.4,
    ease: 'power2.out',
  })

  // 3️⃣ 🔥 START HERO TEXT BEFORE EXIT (this is the key)
  master.to(
    '.hero h1',
    {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: 'power3.out',
    },
    '-=0.6', // ← overlaps with next animation
  )

  // 4️⃣ vertical slide exit
  master.to('#preloader', {
    yPercent: -100,
    duration: 1.1,
    ease: 'expo.inOut',
    onComplete: () => {
      preloader.style.display = 'none'
      document.body.classList.remove('loading')
    },
  })
}

window.addEventListener('load', initPreloader)
initLenis()
initCursor()
initHeroParallax()
initLottieAccents()
initReveals()
initJourney()
initServiceCards()
initMagneticButtons()
initCarousel()
initFaq()
initForm()

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
  const mobileViewport = window.matchMedia('(max-width: 768px)').matches

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

  accentAnimations.heroLine = loadLottieAnimation({
    container: 'hero-line-lottie',
    path: 'assets/animate/green line (1).json',
    speed: 0.76,
  })

  if (!compactViewport) {
    accentAnimations.heroScanner = loadLottieAnimation({
      container: 'hero-scanner-lottie',
      path: 'assets/animate/scanner (1).json',
      speed: 0.8,
    })
  }

  accentAnimations.journeyLine = loadLottieAnimation({
    container: 'journey-line-lottie',
    path: 'assets/animate/green line (1).json',
    loop: false,
    autoplay: false,
    speed: 0.72,
  })

  bindLottieToScroll(accentAnimations.journeyLine, {
    trigger: '#journey .section-intro',
    start: 'top 88%',
    end: 'bottom 30%',
    fromFrame: 0,
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

  if (!mobileViewport) {
    accentAnimations.contactScanner = loadLottieAnimation({
      container: 'contact-scanner-lottie',
      path: 'assets/animate/scanner (1).json',
      speed: 0.62,
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
