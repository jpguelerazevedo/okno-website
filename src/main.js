import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { intro } from './scripts/intro.js'
import { day } from './scripts/day.js'
import { faq, headings, marquee, notify, parallax, reveals, tap } from './scripts/sections.js'

const root = document.documentElement

// Sem a classe "motion" (movimento reduzido) o site é só o HTML e o CSS.
if (root.classList.contains('motion')) init()

function init() {
  gsap.registerPlugin(ScrollTrigger, SplitText)

  const lenis = new Lenis({ anchors: true })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)

  // Os dois trechos fixados primeiro, na ordem da página, pra o resto medir certo.
  const introEnd = intro(lenis)
  day()

  headings()
  marquee()
  parallax()
  reveals()
  notify()
  tap()
  faq()

  // Quem chega pelas páginas de texto ("Voltar ao site") cai direto no site, depois da abertura.
  if (location.hash === '#site') {
    history.replaceState(null, '', location.pathname)
    ScrollTrigger.refresh()
    lenis.scrollTo(introEnd(), { immediate: true, force: true })
  }
}
