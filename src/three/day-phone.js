import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import gsap from 'gsap'
import { BEZEL, H, W, buildPhone, rad } from './phone.js'

/* ---------- o celular de "um dia": levemente virado, com a tela de bloqueio ---------- */

// A tela é redesenhada a partir do que o GSAP faz nos avisos e no relógio da versão em HTML (que fica oculta).
export function createDayPhone({ canvas, clockEl, dateEl, alertEls, getSlot }) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  const ratio = Math.min(window.devicePixelRatio || 1, 1.5)
  renderer.setPixelRatio(ratio)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  pmrem.dispose()

  const key = new THREE.DirectionalLight(0xffffff, 2.4)
  key.position.set(-300, 400, 600)
  const rim = new THREE.DirectionalLight(0xffffff, 3)
  rim.position.set(500, 200, -200)
  scene.add(key, rim)

  // O canvas tem 1,2x a altura do celular; a câmera fica na distância em que isso enquadra certo.
  const FOV = 30
  const camera = new THREE.PerspectiveCamera(FOV, 1, 10, 2000)
  camera.position.z = (H * 1.2) / 2 / Math.tan(rad(FOV / 2))

  const lock = lockTexture({ clockEl, dateEl, alertEls, getSlot })
  const { model, sheen } = buildPhone(lock.texture)
  sheen.opacity = 0.1
  const tilt = new THREE.Group()
  tilt.add(model)
  scene.add(tilt)

  const resize = () => {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    lock.resize((h / 1.2 / H) * W * ratio)
  }

  const render = (time, progress) => {
    // Tela virada pra esquerda; endireita um pouco ao longo do dia e balança de leve.
    tilt.rotation.y = rad(-26 + progress * 9) + Math.sin(time * 0.6) * 0.03
    tilt.rotation.x = rad(5) + Math.cos(time * 0.5) * 0.015
    tilt.rotation.z = rad(2)
    tilt.position.y = Math.sin(time * 0.9) * 1.2
    lock.draw()
    renderer.render(scene, camera)
  }

  resize()
  document.fonts.ready.then(() => lock.draw(true))

  return { resize, render }
}

function lockTexture({ clockEl, dateEl, alertEls, getSlot }) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4

  // Desenho em medidas de um celular de 300 px de largura; "k" leva pro tamanho real.
  const REF = 300
  const sw = REF * ((W - BEZEL * 2) / W)
  const sh = REF * ((H - BEZEL * 2) / W)
  const display = getComputedStyle(clockEl).fontFamily
  const body = getComputedStyle(dateEl).fontFamily
  const get = gsap.getProperty
  let k = 1
  let last = ''

  const logo = new Image()
  logo.onload = () => draw(true)
  logo.src = `${import.meta.env.BASE_URL}okno-check-x-branco.svg`

  const alerts = alertEls.map((el) => ({
    el,
    title: el.querySelector('b').firstChild.textContent.trim(),
    time: el.querySelector('small').textContent.trim(),
    text: el.querySelector('span').textContent.trim(),
  }))

  const resize = (phoneWidth) => {
    k = (phoneWidth * 1.25) / REF
    texture.dispose()
    canvas.width = Math.round(sw * k)
    canvas.height = Math.round(sh * k)
    draw(true)
  }

  function draw(force) {
    const slot = getSlot() || 1
    const state = clockEl.textContent + alerts.map(({ el }) => `${get(el, 'y')},${get(el, 'opacity')},${get(el, 'scaleX')}`).join('|')
    if (!force && state === last) return
    last = state

    ctx.setTransform(k, 0, 0, k, 0, 0)
    const background = ctx.createLinearGradient(0, 0, 0, sh)
    background.addColorStop(0, '#303030')
    background.addColorStop(0.62, '#0b0b0b')
    ctx.fillStyle = background
    ctx.fillRect(0, 0, sw, sh)

    ctx.textBaseline = 'middle'
    ctx.textAlign = 'center'
    ctx.letterSpacing = '0px'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)'
    ctx.font = `400 16.5px ${body}`
    ctx.fillText(dateEl.textContent, sw / 2, 73)

    // Relógio com cada dígito na sua casa, pra não tremer enquanto os números correm.
    ctx.fillStyle = '#fff'
    ctx.font = `500 93px ${display}`
    const digit = ctx.measureText('0').width - 3
    const colon = ctx.measureText(':').width
    const chars = [...clockEl.textContent]
    let x = sw / 2 - (digit * 4 + colon) / 2
    for (const char of chars) {
      const cell = char === ':' ? colon : digit
      ctx.fillText(char, x + cell / 2, 134)
      x += cell
    }

    const top = 198
    for (const { el, title, time, text } of alerts) {
      const alpha = Number(get(el, 'opacity'))
      if (alpha <= 0.001) continue
      const scale = Number(get(el, 'scaleX'))

      ctx.save()
      ctx.globalAlpha = alpha
      ctx.translate(sw / 2, top + (Number(get(el, 'y')) / slot) * 66 + 29)
      ctx.scale(scale, scale)

      const half = sw / 2 - 12
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.roundRect(-half, -29, half * 2, 58, 22.5)
      ctx.fill()

      ctx.fillStyle = '#000'
      ctx.beginPath()
      ctx.roundRect(-half + 10, -19, 38, 38, 11)
      ctx.fill()
      if (logo.complete && logo.naturalWidth) ctx.drawImage(logo, -half + 18, -11, 22, 22)

      ctx.textBaseline = 'alphabetic'
      ctx.textAlign = 'left'
      ctx.font = `500 14px ${display}`
      ctx.fillText(title, -half + 58, -4)
      ctx.fillStyle = '#4f4f4f'
      ctx.font = `400 13px ${body}`
      ctx.fillText(text, -half + 58, 13)
      ctx.textAlign = 'right'
      ctx.font = `400 12px ${body}`
      ctx.fillText(time, half - 14, -4)
      ctx.restore()
    }

    texture.needsUpdate = true
  }

  return { texture, resize, draw }
}
