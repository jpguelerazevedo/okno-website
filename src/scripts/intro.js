import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const root = document.documentElement

/* ---------- abertura ---------- */

export function intro(lenis) {
  const stage = document.querySelector('.intro__stage')
  const floatEl = stage.querySelector('.float')
  const phone = stage.querySelector('.phone')
  const screen = stage.querySelector('.phone__screen')

  buildBody(stage.querySelector('.phone__body'))

  // A tela do celular carrega uma cópia do hero, que no fim do zoom casa com o de verdade.
  const mini = stage.querySelector('.hero').cloneNode(true)
  mini.inert = true
  stage.querySelector('.phone__site').append(mini)

  let zoom = 1
  let unit = 1

  // Com WebGL o celular é 3D até o fim e ainda termina de girar durante o zoom.
  // Sem WebGL fica o celular em CSS, que precisa estar de frente antes de ampliar.
  const webgl = root.classList.contains('gl')
  const turn = webgl ? 7.4 : 5

  const measure = () => {
    const vw = stage.clientWidth
    const vh = stage.clientHeight
    unit = phone.offsetWidth / 100
    zoom = coverScale(vw, vh, screen.offsetWidth, screen.offsetHeight, parseFloat(getComputedStyle(screen).borderTopLeftRadius))
    stage.style.setProperty('--vw', `${vw}px`)
    stage.style.setProperty('--vh', `${vh}px`)
    stage.style.setProperty('--zoom', zoom)
    // Gira em torno do meio da espessura, não da face da frente.
    gsap.set(phone, { transformOrigin: `50% 50% ${-5.5 * unit}px` })
  }

  measure()
  ScrollTrigger.addEventListener('refreshInit', measure)

  const sky = stars(stage.querySelector('.intro__stars'))
  ScrollTrigger.addEventListener('refreshInit', sky.resize)
  const themeColor = document.querySelector('meta[name="theme-color"]')
  themeColor.content = '#000000'

  // O celular 3D carrega à parte; sem WebGL fica o celular em CSS.
  let phone3d = null
  const load = webgl ? import('../three/intro-phone.js') : Promise.reject()
  load
    .then(({ createIntroPhone }) => {
      phone3d = createIntroPhone({
        canvas: stage.querySelector('.intro__gl'),
        stage,
        floatEl,
        phoneEl: phone,
        islandEl: stage.querySelector('.phone__island'),
        getZoom: () => zoom,
      })
      gsap.from('.intro__gl', { opacity: 0, y: 70, duration: 1.6, ease: 'power3.out' })
      ScrollTrigger.addEventListener('refreshInit', phone3d.resize)
    })
    .catch(() => root.classList.remove('gl'))

  // Flutuar e seguir o ponteiro: tudo multiplicado por "amount", que o scroll leva a zero.
  const float = { amount: 1 }
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 }

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return
    pointer.tx = e.clientX / window.innerWidth - 0.5
    pointer.ty = e.clientY / window.innerHeight - 0.5
  })

  gsap.ticker.add((time) => {
    sync()
    if (stage.classList.contains('is-in')) return
    pointer.x += (pointer.tx - pointer.x) * 0.06
    pointer.y += (pointer.ty - pointer.y) * 0.06
    if (!webgl) sky.draw(time, tl.progress(), pointer)
    const a = float.amount
    gsap.set(floatEl, {
      force3D: false,
      y: Math.sin(time * 1.15) * unit * 4.5 * a,
      rotationZ: Math.sin(time * 0.7) * 1.4 * a,
      rotationY: (Math.sin(time * 0.5) * 5 + pointer.x * 22) * a,
      rotationX: (Math.cos(time * 0.62) * 2.5 - pointer.y * 14) * a,
    })
    if (phone3d) phone3d.render()
  })

  if (!webgl) gsap.from('.scene', { opacity: 0, y: 70, duration: 1.6, ease: 'power3.out' })

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: stage,
      start: 'top top',
      end: '+=300%',
      pin: true,
      scrub: true,
      invalidateOnRefresh: true,
    },
  })

  // Conferido a cada quadro, e não só quando a linha do tempo avança: ao recarregar no meio da página
  // ou chegar por um link, ela já nasce no fim e não avisa.
  let entered = null
  const sync = () => {
    stage.classList.toggle('is-flat', !webgl && tl.time() >= turn)
    const done = tl.progress() > 0.97
    if (done === entered) return
    entered = done
    stage.classList.toggle('is-in', done)
    root.classList.toggle('intro-done', done)
    themeColor.content = done ? '#ffffff' : '#000000'
  }

  tl.fromTo(
    phone,
    { rotationY: 205, rotationX: 9, rotationZ: -7 },
    { rotationY: 0, rotationX: 0, rotationZ: 0, duration: turn, ease: 'power3.inOut', force3D: false },
    0,
  )
    .to('.intro__hint', { autoAlpha: 0, duration: 0.6 }, 0)
    .to(float, { amount: 0, duration: turn - 2.8 }, 2.6)
    .to('.phone__island', { opacity: 0, duration: 1.4 }, 5.4)
    .to(floatEl, { scale: () => zoom, duration: 4.2, ease: 'power2.in', force3D: false }, 4.4)
    .to({}, { duration: 0.5 })

  // O logo leva pro começo do site (o fim da abertura), não de volta pro celular de costas.
  document.querySelectorAll('a[href="#topo"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      lenis.scrollTo(tl.scrollTrigger.end)
    })
  })

  return () => tl.scrollTrigger.end
}

// Céu da abertura: estrelas que piscam e se deslocam por profundidade com o scroll e o ponteiro.
function stars(canvas) {
  const ctx = canvas.getContext('2d')
  let w = 0
  let h = 0
  let list = []

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    w = canvas.clientWidth
    h = canvas.clientHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    list = Array.from({ length: Math.round((w * h) / 6500) }, () => {
      const depth = Math.random()
      return {
        x: Math.random(),
        y: Math.random(),
        depth,
        radius: 0.4 + depth * depth * 1.3,
        speed: 0.5 + Math.random() * 1.8,
        phase: Math.random() * Math.PI * 2,
      }
    })
  }

  const draw = (time, progress, pointer) => {
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#fff'
    for (const s of list) {
      const twinkle = 0.5 + 0.5 * Math.sin(time * s.speed + s.phase)
      const x = s.x * w - pointer.x * s.depth * 40
      // O módulo faz a estrela que sai por cima voltar por baixo.
      const y = (((s.y * h - progress * s.depth * h * 0.9 - pointer.y * s.depth * 40) % h) + h) % h
      ctx.globalAlpha = (0.15 + 0.85 * twinkle * twinkle) * (0.35 + 0.65 * s.depth)
      ctx.beginPath()
      ctx.arc(x, y, s.radius, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  resize()
  return { resize, draw }
}

// A lateral do celular: contornos empilhados pros cantos, paredes pros lados retos.
function buildBody(body) {
  const layers = 26
  for (let i = 0; i < layers; i++) {
    const layer = document.createElement('i')
    layer.className = 'phone__layer'
    layer.style.transform = `translateZ(calc(var(--t) * ${-(i + 0.5) / layers}))`
    body.append(layer)
  }
  for (const side of ['l', 'r', 't', 'b']) {
    const wall = document.createElement('i')
    wall.className = `phone__wall phone__wall--${side}`
    body.append(wall)
  }
}

// Menor escala em que a tela (retângulo de cantos redondos) cobre a janela inteira.
function coverScale(vw, vh, w, h, radius) {
  let z = Math.max(vw / w, vh / h)
  for (let i = 0; i < 200; i++) {
    const r = radius * z
    const dx = vw / 2 - (w * z) / 2 + r
    const dy = vh / 2 - (h * z) / 2 + r
    if (dx <= 0 || dy <= 0 || dx * dx + dy * dy <= r * r) break
    z *= 1.01
  }
  return z * 1.01
}
