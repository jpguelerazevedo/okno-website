import * as THREE from 'three'

// Medidas em "u" (largura do celular = 100), as mesmas do celular em CSS.
export const W = 100
export const H = 209.5
export const T = 11
export const R = 15.5
export const EDGE = 1.4
export const BEZEL = 2.8

export const rad = THREE.MathUtils.degToRad

/* ---------- o modelo ---------- */

export function buildPhone(screenMap) {
  const model = new THREE.Group()

  // Preto: pouco metal na mistura, pra o brilho vir das luzes e não da cor do material.
  const metal = new THREE.MeshStandardMaterial({ color: 0x0b0b0c, metalness: 0.3, roughness: 0.34 })
  const polished = new THREE.MeshStandardMaterial({ color: 0x48484c, metalness: 1, roughness: 0.22 })
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x1e1e20, metalness: 1, roughness: 0.3 })
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x030303, roughness: 0.45, clearcoat: 0.3, clearcoatRoughness: 0.3 })
  const lensGlass = new THREE.MeshStandardMaterial({ color: 0x020203, roughness: 0.12, envMapIntensity: 0.45 })
  const black = new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false })

  // Corpo: retângulo de cantos redondos com a espessura e as quinas chanfradas.
  const body = new THREE.ExtrudeGeometry(roundedRect(W - EDGE * 2, H - EDGE * 2, R - EDGE), {
    depth: T - EDGE * 2,
    bevelEnabled: true,
    bevelThickness: EDGE,
    bevelSize: EDGE,
    bevelSegments: 8,
    curveSegments: 32,
  })
  body.translate(0, 0, -(T - EDGE * 2) / 2)
  model.add(new THREE.Mesh(body, metal))

  /* frente */

  const front = new THREE.Mesh(flat(W - EDGE * 2, H - EDGE * 2, R - EDGE), black)
  front.position.z = T / 2 + 0.03
  model.add(front)

  const display = new THREE.Mesh(
    flat(W - BEZEL * 2, H - BEZEL * 2, R - BEZEL, true),
    new THREE.MeshBasicMaterial({ map: screenMap, toneMapped: false }),
  )
  display.position.z = T / 2 + 0.06
  model.add(display)

  const sheen = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 1,
    roughness: 0.05,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const reflection = new THREE.Mesh(flat(W - EDGE * 2, H - EDGE * 2, R - EDGE), sheen)
  reflection.position.z = T / 2 + 0.09
  model.add(reflection)

  // Ilha dinâmica, à parte da tela pra poder sumir durante o zoom.
  const island = new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false, transparent: true })
  const notch = new THREE.Mesh(flat(29, 8.4, 4.2), island)
  notch.position.set(0, H / 2 - BEZEL - 3 - 4.2, T / 2 + 0.07)
  model.add(notch)

  /* traseira: um grupo virado, com x pra direita de quem olha por trás e z pra fora */

  const back = new THREE.Group()
  back.rotation.y = Math.PI
  back.position.z = -T / 2
  model.add(back)

  // Posição a partir do canto de cima à esquerda, como no CSS.
  const at = (mesh, x, y, z) => {
    mesh.position.set(x - W / 2, H / 2 - y, z)
    back.add(mesh)
    return mesh
  }

  at(new THREE.Mesh(flat(87, 145, 9.5), glass), 50, 130.5, 0.04)

  const logo = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 22),
    new THREE.MeshBasicMaterial({ map: logoTexture(), transparent: true, opacity: 0.9, toneMapped: false }),
  )
  at(logo, 50, 130.5, 0.08)

  // Platô das câmeras, de borda a borda.
  const plateauHeight = 1.3
  const plateau = new THREE.ExtrudeGeometry(roundedRect(94, 46, 12.5), {
    depth: plateauHeight - 0.5,
    bevelEnabled: true,
    bevelThickness: 0.5,
    bevelSize: 0.5,
    bevelSegments: 4,
    curveSegments: 24,
  })
  plateau.translate(0, 0, 0.5)
  at(new THREE.Mesh(plateau, metal), 50, 26, 0)
  const top = plateauHeight + 0.5

  // Cada lente: aro polido, vidro preto e os anéis internos.
  const ringHeight = 1.7
  const ring = new THREE.CylinderGeometry(10.25, 10.25, ringHeight, 64)
  ring.rotateX(Math.PI / 2)
  const lensTop = top + ringHeight
  for (const [x, y] of [[16.25, 15], [16.25, 37], [38.25, 26]]) {
    at(new THREE.Mesh(ring, polished), x, y, top + ringHeight / 2)
    at(new THREE.Mesh(new THREE.CircleGeometry(8.8, 64), lensGlass), x, y, lensTop + 0.02)
    at(new THREE.Mesh(new THREE.RingGeometry(5.3, 5.9, 64), darkMetal), x, y, lensTop + 0.04)
    at(new THREE.Mesh(new THREE.RingGeometry(3.1, 3.4, 48), darkMetal), x, y, lensTop + 0.05)
    at(new THREE.Mesh(new THREE.CircleGeometry(1.5, 32), new THREE.MeshBasicMaterial({ color: 0x15181d })), x, y, lensTop + 0.06)
  }

  // Coluna da direita: flash, microfone e LiDAR.
  at(new THREE.Mesh(new THREE.RingGeometry(3.7, 4.3, 48), darkMetal), 84, 12.84, top + 0.02)
  at(new THREE.Mesh(new THREE.CircleGeometry(3.7, 48), new THREE.MeshBasicMaterial({ color: 0xdedede })), 84, 12.84, top + 0.03)
  at(new THREE.Mesh(new THREE.CircleGeometry(0.75, 24), black), 84, 26, top + 0.02)
  at(new THREE.Mesh(new THREE.RingGeometry(3.4, 3.9, 48), darkMetal), 84, 39.16, top + 0.02)
  at(new THREE.Mesh(new THREE.CircleGeometry(3.4, 48), lensGlass), 84, 39.16, top + 0.03)

  /* botões laterais (x, altura a partir do topo, comprimento) */

  const button = (side, y, length, material = metal, depth = 0.9) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(depth, length, 3.6), material)
    mesh.position.set(side * (W / 2 + depth / 2 - 0.25), H / 2 - y, 0)
    model.add(mesh)
  }
  button(-1, 40, 7)
  button(-1, 56, 12)
  button(-1, 71, 12)
  button(1, 62, 19)
  button(1, 128, 15, darkMetal, 0.5)

  return { model, sheen, reflection, island }
}

function roundedRect(w, h, r) {
  const x = -w / 2
  const y = -h / 2
  const shape = new THREE.Shape()
  shape.moveTo(x + r, y)
  shape.lineTo(x + w - r, y)
  shape.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false)
  shape.lineTo(x + w, y + h - r)
  shape.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false)
  shape.lineTo(x + r, y + h)
  shape.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false)
  shape.lineTo(x, y + r)
  shape.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false)
  return shape
}

// Chapa plana de cantos redondos; com "mapped" os UVs cobrem a chapa de 0 a 1 pra receber textura.
function flat(w, h, r, mapped = false) {
  const geometry = new THREE.ShapeGeometry(roundedRect(w, h, r), 24)
  if (mapped) {
    const uv = geometry.attributes.uv
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / w + 0.5, uv.getY(i) / h + 0.5)
  }
  return geometry
}

function logoTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace

  const image = new Image()
  image.onload = () => {
    canvas.getContext('2d').drawImage(image, 0, 0, 256, 256)
    texture.needsUpdate = true
  }
  image.src = '/okno-check-x-branco.svg'
  return texture
}
