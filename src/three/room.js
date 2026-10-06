import * as THREE from 'three'
import { W } from './phone.js'

/* ---------- a sala escura ---------- */

export function buildRoom() {
  // Luz difusa de um foco largo e suave, calculada à mão pra as luzes de estúdio do celular não baterem na sala.
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uLight: { value: new THREE.Vector3() },
      uAim: { value: new THREE.Vector3(0, 0, 1) },
      uReach: { value: 400 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      varying vec3 vNormal;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        vNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uLight;
      uniform vec3 uAim;
      uniform float uReach;
      varying vec3 vWorld;
      varying vec3 vNormal;

      void main() {
        vec3 toLight = uLight - vWorld;
        float distance = length(toLight);
        toLight /= distance;

        float diffuse = max(dot(vNormal, toLight), 0.0);
        float cone = smoothstep(-0.05, 0.9, dot(-toLight, uAim));
        float falloff = 1.0 / (1.0 + (distance * distance) / (uReach * uReach));
        float light = 0.003 + diffuse * cone * falloff * 0.85;

        // Ruído fino pra o degradê escuro não formar faixas.
        float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
        gl_FragColor = vec4(vec3(light) + grain / 255.0, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })

  const wall = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material)
  const ground = new THREE.PlaneGeometry(1, 1)
  ground.rotateX(-Math.PI / 2)
  const floor = new THREE.Mesh(ground, material)

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture(),
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      opacity: 0,
      toneMapped: false,
    }),
  )
  glow.renderOrder = 10

  const room = { material, wall, floor, glow, glowSize: 1, floorY: 0 }

  // Tudo proporcional à altura da janela: a parede atrás do celular e o chão logo abaixo dele.
  room.resize = (height, unit) => {
    const back = -0.9 * height
    wall.scale.set(height * 24, height * 12, 1)
    wall.position.set(0, 0, back)
    floor.scale.set(height * 24, 1, height * 4)
    room.floorY = -0.4 * height
    floor.position.set(0, room.floorY, back + height * 2)
    material.uniforms.uReach.value = height * 0.42
    room.glowSize = unit * W * 6
  }

  return room
}

function glowTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.45)')
  gradient.addColorStop(0.6, 'rgba(255,255,255,0.1)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 256, 256)
  return new THREE.CanvasTexture(canvas)
}
