import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const root = document.documentElement

/* ---------- um dia: o relógio do celular anda com o scroll ---------- */

export function day() {
  const pin = document.querySelector('.day__pin')
  const clock = pin.querySelector('.lock__time')
  const steps = gsap.utils.toArray('.day__steps li')
  const alerts = gsap.utils.toArray('.day__alerts .alert')

  const minutes = steps.map((li) => {
    const [h, m] = li.querySelector('time').textContent.split(':').map(Number)
    return h * 60 + m
  })
  const now = { m: minutes[0] }
  const pad = (n) => String(n).padStart(2, '0')

  // Cada aviso novo entra no topo e empurra os antigos pra baixo, cada vez mais apagados.
  const fade = [1, 0.7, 0.48, 0.32, 0.18]
  const slot = () => alerts[0].offsetHeight + 8

  const tl = gsap.timeline({
    defaults: { ease: 'power2.inOut' },
    scrollTrigger: {
      trigger: pin,
      start: 'top top',
      end: '+=320%',
      pin: true,
      scrub: true,
      invalidateOnRefresh: true,
    },
    onUpdate() {
      const m = Math.round(now.m)
      clock.textContent = `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
    },
  })

  tl.to('.day__progress i', { scaleX: 1, duration: steps.length - 1, ease: 'none' }, 0)

  steps.forEach((li, k) => {
    if (!k) return
    const at = k - 0.8

    tl.to(now, { m: minutes[k], duration: 0.6 }, at)
      .to(steps[k - 1], { autoAlpha: 0, y: -24, duration: 0.25, ease: 'power2.in' }, at)
      .fromTo(li, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power2.out' }, at + 0.3)

    for (let j = 0; j < k; j++) {
      const age = k - j
      tl.to(alerts[j], { y: () => age * slot(), autoAlpha: fade[age], scale: 1 - age * 0.02, duration: 0.4 }, at + 0.25)
    }
    tl.fromTo(
      alerts[k],
      { y: () => -slot(), autoAlpha: 0, scale: 0.94 },
      { y: 0, autoAlpha: 1, scale: 1, duration: 0.4, ease: 'power3.out' },
      at + 0.3,
    )
  })

  tl.to({}, { duration: 0.3 })

  if (!root.classList.contains('gl')) return

  // O modelo 3D lê os avisos e o relógio da versão em HTML e só desenha enquanto a seção está na tela.
  import('../three/day-phone.js')
    .then(({ createDayPhone }) => {
      const phone = createDayPhone({
        canvas: pin.querySelector('.day__gl'),
        clockEl: clock,
        dateEl: pin.querySelector('.lock__date'),
        alertEls: alerts,
        getSlot: slot,
      })
      ScrollTrigger.addEventListener('refreshInit', phone.resize)

      let visible = false
      new IntersectionObserver(([entry]) => (visible = entry.isIntersecting)).observe(pin)
      gsap.ticker.add((time) => visible && phone.render(time, tl.progress()))
    })
    .catch(() => {})
}
