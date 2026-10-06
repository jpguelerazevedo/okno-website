import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import gsap from 'gsap'
import { BEZEL, H, T, W, buildPhone, rad } from './phone.js'
import { buildRoom } from './room.js'

// Mesma distância do "perspective" do CSS, pra a projeção casar com a do celular em HTML.
const DISTANCE = 1500


// O celular 3D copia, quadro a quadro, as transformações que o GSAP aplica no celular em CSS.
export function createIntroPhone({ canvas, stage, floatEl, phoneEl, islandEl, getZoom }) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  // Acima de 1,5 o custo por quadro sobe muito em placa de vídeo integrada e quase não se vê diferença.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  pmrem.dispose()
  scene.environmentIntensity = 1.15

  const camera = new THREE.PerspectiveCamera(30, 1, 100, 4000)
  camera.position.z = DISTANCE

  const key = new THREE.DirectionalLight(0xffffff, 2.2)
  key.position.set(-500, 700, 1200)
  const rim = new THREE.DirectionalLight(0xffffff, 4)
  rim.position.set(900, 300, -300)
  const fill = new THREE.DirectionalLight(0xffffff, 2.4)
  fill.position.set(-900, -200, -300)
  scene.add(key, rim, fill)

  // A tela é desenhada na resolução do fim do zoom, até o limite que a placa de vídeo aguenta.
  const screen = screenTexture(Math.min(renderer.capabilities.maxTextureSize, 4096), renderer.getPixelRatio())
  const { model, sheen, reflection, island } = buildPhone(screen.texture)

  // float = o balanço e o zoom; pivot = o giro, em torno do meio da espessura.
  const float = new THREE.Group()
  const pivot = new THREE.Group()
  float.rotation.order = 'ZYX'
  pivot.rotation.order = 'ZYX'
  pivot.add(model)
  float.add(pivot)
  scene.add(float)

  // A sala: parede do fundo e chão, iluminados só pela tela do celular.
  const room = buildRoom()
  scene.add(room.wall, room.floor, room.glow)
  const lightPosition = room.material.uniforms.uLight.value
  const lightDirection = room.material.uniforms.uAim.value
  const facing = new THREE.Quaternion()

  const get = gsap.getProperty

  const resize = () => {
    const w = stage.clientWidth
    const h = stage.clientHeight
    const unit = phoneEl.offsetWidth / W
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(h / 2 / DISTANCE))
    camera.updateProjectionMatrix()
    model.scale.setScalar(unit)
    pivot.position.z = (-T / 2) * unit
    room.resize(h, unit)
    screen.draw(stage, unit, getZoom())
  }

  const render = () => {
    // O eixo Y do CSS aponta pra baixo: os giros em X e Z trocam de sinal.
    float.position.y = -get(floatEl, 'y')
    float.rotation.set(-rad(get(floatEl, 'rotationX')), rad(get(floatEl, 'rotationY')), -rad(get(floatEl, 'rotation')))
    float.scale.setScalar(get(floatEl, 'scaleX'))

    const turn = get(phoneEl, 'rotationY')
    pivot.rotation.set(-rad(get(phoneEl, 'rotationX')), rad(turn), -rad(get(phoneEl, 'rotation')))

    // O reflexo no vidro da frente some quando o celular fica de frente, pra a troca pela página não aparecer.
    sheen.opacity = Math.min(1, Math.abs(turn) / 40) * 0.22
    reflection.visible = sheen.opacity > 0.002
    island.opacity = get(islandEl, 'opacity')

    // De onde a luz sai (o centro da tela) e pra onde ela aponta, no espaço da sala.
    float.updateMatrixWorld()
    lightPosition.set(0, 0, T / 2)
    model.localToWorld(lightPosition)
    lightDirection.set(0, 0, 1).applyQuaternion(model.getWorldQuaternion(facing))
    // Virado pra câmera, a luz deixa de bater na parede e vira um clarão em volta do celular.
    const toward = Math.max(0, lightDirection.z)
    room.glow.position.copy(lightPosition)
    // O chão desce junto com o zoom, senão ele cortaria o celular ampliado.
    room.floor.position.y = room.floorY * float.scale.x
    room.glow.scale.setScalar(room.glowSize * float.scale.x)
    // O clarão some conforme o zoom avança, pra não lavar o texto da tela.
    const near = THREE.MathUtils.smoothstep(float.scale.x, 1, 2.2)
    room.glow.material.opacity = toward * toward * toward * 0.22 * (1 - near)

    renderer.render(scene, camera)
  }

  resize()
  document.fonts.ready.then(resize)

  return { resize, render }
}


/* ---------- a tela: o hero do site desenhado em miniatura ---------- */

function screenTexture(maxSize, pixelRatio) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4

  const draw = (stage, unit, zoom) => {
    const w = (W - BEZEL * 2) * unit
    const h = (H - BEZEL * 2) * unit
    // No fim do zoom cada pixel da tela vale "zoom" pixels da janela.
    const density = Math.min(zoom * pixelRatio, maxSize / h)

    // Mudou de tamanho: a textura antiga na placa de vídeo não serve mais.
    texture.dispose()
    canvas.width = Math.round(w * density)
    canvas.height = Math.round(h * density)
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // O hero real, reduzido por "zoom" e centrado na tela: no fim do zoom ele casa com a página.
    const scale = density / zoom
    const origin = stage.getBoundingClientRect()
    const place = (r) => ({
      x: canvas.width / 2 + (r.left - origin.left - origin.width / 2) * scale,
      y: canvas.height / 2 + (r.top - origin.top - origin.height / 2) * scale,
      w: r.width * scale,
      h: r.height * scale,
    })

    // Cada palavra vai exatamente onde o navegador a colocou, então as quebras de linha são as mesmas.
    const write = (el, color) => {
      const cs = getComputedStyle(el)
      ctx.font = `${cs.fontWeight} ${parseFloat(cs.fontSize) * scale}px ${cs.fontFamily}`
      ctx.letterSpacing = `${(parseFloat(cs.letterSpacing) || 0) * scale}px`
      ctx.fillStyle = color || cs.color
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      const ascent = ctx.measureText('x').fontBoundingBoxAscent

      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      const range = document.createRange()
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        for (const word of node.textContent.matchAll(/\S+/g)) {
          range.setStart(node, word.index)
          range.setEnd(node, word.index + word[0].length)
          const box = place(range.getBoundingClientRect())
          ctx.fillText(word[0], box.x, box.y + ascent)
        }
      }
    }

    const hero = stage.querySelector(':scope > .hero')
    write(hero.querySelector('h1'))
    write(hero.querySelector('.hero__lead'))
    write(hero.querySelector('.hero__stores'))

    const button = hero.querySelector('.btn')
    const box = place(button.getBoundingClientRect())
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.roundRect(box.x, box.y, box.w, box.h, box.h / 2)
    ctx.fill()
    write(button, '#fff')

    texture.needsUpdate = true
  }

  return { texture, draw }
}
