import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

/* ---------- títulos, linha por linha ---------- */

export function headings() {
  document.querySelectorAll('[data-split]').forEach((el) => {
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'ln',
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.lines, {
          yPercent: 115,
          duration: 1.1,
          ease: 'power4.out',
          stagger: 0.09,
          scrollTrigger: { trigger: el, start: 'top 86%', once: true },
        }),
    })
  })
}

/* ---------- faixa de hábitos: anda sozinha e acelera com o scroll ---------- */

export function marquee() {
  document.querySelectorAll('[data-marquee]').forEach((row) => {
    const track = row.firstElementChild
    const width = track.offsetWidth
    // Cópias suficientes pra faixa nunca mostrar o fim.
    const copies = Math.ceil((window.innerWidth * 2) / width) + 1
    for (let i = 0; i < copies; i++) row.append(track.cloneNode(true))

    const left = Number(row.dataset.marquee) < 0
    const loop = gsap.fromTo(
      row,
      { x: left ? 0 : -width },
      { x: left ? -width : 0, duration: width / 45, ease: 'none', repeat: -1 },
    )

    ScrollTrigger.create({
      trigger: row,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate(self) {
        const boost = 1 + Math.min(Math.abs(self.getVelocity()) / 300, 6)
        gsap.to(loop, { timeScale: boost, duration: 0.2, overwrite: true })
        gsap.to(loop, { timeScale: 1, duration: 1, delay: 0.2 })
      },
    })
  })
}

/* ---------- peças que andam em outra velocidade dentro dos cartões ---------- */


export function parallax() {
  gsap.matchMedia().add('(min-width: 901px)', () => {
    document.querySelectorAll('[data-parallax]').forEach((el) => {
      const depth = Number(el.dataset.parallax)
      gsap.fromTo(
        el,
        { y: depth * 130 },
        {
          y: depth * -130,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
        },
      )
    })
  })
}

/* ---------- o resto entra aos poucos ---------- */

export function reveals() {
  const groups = ['.card', '.head .lead', '.notes > div', '.plans__note', '.faq details', '.closing__actions']

  for (const selector of groups) {
    // Os cartões também crescem um pouco ao entrar.
    const scale = selector === '.card' ? 0.96 : 1
    gsap.set(selector, { opacity: 0, y: 36, scale })
    ScrollTrigger.batch(selector, {
      start: 'top 92%',
      once: true,
      onEnter: (els) =>
        gsap.to(els, { opacity: 1, y: 0, scale: 1, duration: 1.1, ease: 'power3.out', stagger: 0.09, overwrite: 'auto' }),
    })
  }
}

/* ---------- passo 2: a notificação desce na tela bloqueada ---------- */

export function notify() {
  const phone = document.querySelector('.lock')
  const alert = phone.querySelector('.alert')

  gsap.from(alert, {
    // Parte de cima da tela, escondida atrás da borda.
    y: () => -(alert.offsetTop + alert.offsetHeight),
    opacity: 0,
    scale: 0.94,
    duration: 1.1,
    ease: 'back.out(1.25)',
    scrollTrigger: { trigger: phone, start: 'top 55%', once: true },
  })
}

/* ---------- passo 3: a bolinha enche sozinha quando o cartão aparece ---------- */

export function tap() {
  const mock = document.querySelector('.mock--tap')
  const dot = mock.querySelector('.dots i:not(.on)')
  const count = mock.querySelector('small')

  gsap
    .timeline({ scrollTrigger: { trigger: mock, start: 'top 60%', once: true } })
    .to(dot, { scale: 1.7, duration: 0.25, ease: 'power2.out' })
    .call(() => {
      dot.classList.add('on')
      count.textContent = '3 de 4'
    })
    .to(dot, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' })
    .from(mock.querySelector('.chip'), { opacity: 0, y: 12, duration: 0.5, ease: 'power3.out' }, '-=0.3')
}

/* ---------- dúvidas: a caixa abre e fecha deslizando ---------- */

export function faq() {
  document.querySelectorAll('.faq details').forEach((item) => {
    const body = item.querySelector('.faq__body')

    item.querySelector('summary').addEventListener('click', (e) => {
      e.preventDefault()
      const opening = !item.classList.contains('is-open')
      item.classList.toggle('is-open', opening)

      if (opening) {
        // Se ainda estava fechando, continua de onde parou; senão parte do zero.
        const from = item.open ? { height: body.offsetHeight, opacity: gsap.getProperty(body, 'opacity') } : { height: 0, opacity: 0 }
        item.open = true
        gsap.fromTo(
          body,
          from,
          { height: 'auto', opacity: 1, duration: 0.6, ease: 'power3.out', overwrite: true },
        )
      } else {
        gsap.to(body, {
          height: 0,
          opacity: 0,
          duration: 0.45,
          ease: 'power3.inOut',
          overwrite: true,
          onComplete: () => (item.open = false),
        })
      }
    })
  })
}
