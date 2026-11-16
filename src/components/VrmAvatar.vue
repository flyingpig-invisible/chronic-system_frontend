<template>
  <div class="vrm-wrap" ref="wrapEl">
    <canvas ref="canvasEl" class="vrm-canvas"></canvas>
    <div class="vrm-nameplate" v-if="showName">
      <span class="dot" :class="{ busy: speaking }"></span>
      {{ name }}
      <span class="state">{{ statusText }}</span>
    </div>
    <div class="vrm-fallback" v-if="fallback">
      <div class="fb-avatar">{{ name.slice(0, 1) }}</div>
      <div class="fb-tip">3D 模型未就绪，当前为占位形象</div>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm'

const props = defineProps({
  // 模型地址（.vrm 或 .glb / .gltf），放在 public 下用绝对路径如 /models/assistant.vrm
  modelUrl: { type: String, default: '/models/assistant.vrm' },
  name: { type: String, default: 'AI 健康助手' },
  showName: { type: Boolean, default: true },
  // 由父组件驱动的"正在说话"状态
  speaking: { type: Boolean, default: false },
  // 表情提示：neutral / happy / thinking / concern
  emotion: { type: String, default: 'neutral' },
  // 是否允许鼠标拖拽旋转
  draggable: { type: Boolean, default: true }
})

const wrapEl = ref()
const canvasEl = ref()
const fallback = ref(false)
const statusText = ref('待机中')

let renderer, scene, camera, clock, vrm, placeholder
let raf = 0
let resizeObserver
let speakingAmt = 0
let blinkTimer = 0
let nextBlink = 2 + Math.random() * 3
let emotionTarget = 0
let emotionCurrent = 0
let pointerState = { down: false, lastX: 0, lastY: 0 }
let targetRotY = 0
let targetRotX = 0

const prefersReduced = typeof window !== 'undefined'
  && window.matchMedia
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ---------- 初始化 ----------
const initThree = () => {
  const canvas = canvasEl.value
  const wrap = wrapEl.value
  const width = wrap.clientWidth || 320
  const height = wrap.clientHeight || 360

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(width, height, false)
  renderer.outputColorSpace = THREE.SRGBColorSpace

  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(28, width / height, 0.1, 20)
  camera.position.set(0, 1.2, 1.5)
  camera.lookAt(0, 1.1, 0)

  clock = new THREE.Clock()

  // 灯光：主光 + 补光 + 轮廓光，营造医学科技感
  const hemi = new THREE.HemisphereLight(0xffffff, 0xdfe6ef, 1.05)
  scene.add(hemi)
  const key = new THREE.DirectionalLight(0xffffff, 1.5)
  key.position.set(1.2, 2.2, 1.6)
  scene.add(key)
  const rim = new THREE.DirectionalLight(0x00d4ff, 1.1)
  rim.position.set(-1.6, 1.2, -1.4)
  scene.add(rim)

  // 地面光晕
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(1.1, 48),
    new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.12 })
  )
  glow.rotation.x = -Math.PI / 2
  glow.position.y = 0.001
  scene.add(glow)

  bindPointer()
  resizeObserver = new ResizeObserver(onResize)
  resizeObserver.observe(wrap)
  window.addEventListener('resize', onResize)

  loadModel()
  loop()
}

// ---------- 加载 VRM ----------
const frameBase = { focusY: 1.1, dist: 1.4, height: 1.6 }

// ---------- 自动取景：把相机对准模型头部与上半身 ----------
const frameModel = (object3d) => {
  const box = new THREE.Box3().setFromObject(object3d)
  const size = new THREE.Vector3()
  const center = new THREE.Vector3()
  box.getSize(size)
  box.getCenter(center)
  const height = size.y || 1.6
  // 放大：对准上半身（约肩到头顶），拉近距离
  const focusY = box.max.y - height * 0.19
  const dist = height * 1.55
  camera.position.set(0, focusY + height * 0.04, dist)
  camera.lookAt(0, focusY, 0)
  camera.updateProjectionMatrix()
  frameBase.focusY = focusY
  frameBase.dist = dist
  frameBase.height = height
}
const loadModel = () => {
  const loader = new GLTFLoader()
  loader.register((parser) => new VRMLoaderPlugin(parser))

  loader.load(
    props.modelUrl,
    (gltf) => {
      const loaded = gltf.userData.vrm
      if (!loaded) {
        // 不是 VRM，退化为普通 glTF 展示
        const model = gltf.scene
        model.traverse((o) => { if (o.isMesh) o.castShadow = true })
        scene.add(model)
        placeholder = model
        frameModel(model)
        statusText.value = '已加载模型'
        return
      }
      vrm = loaded
      VRMUtils.removeUnnecessaryVertices(gltf.scene)
      VRMUtils.removeUnnecessaryJoints(gltf.scene)
      // 模型默认背对相机，旋转 180 度面向镜头
      vrm.scene.rotation.y = Math.PI
      vrm.scene.traverse((o) => { if (o.isMesh) o.frustumCulled = false })
      scene.add(vrm.scene)
      // 自动取景：对准头部
      frameModel(vrm.scene)
      // 摆出自然站姿（解决 T-pose/僵尸手）
      poseVRM(vrm)
      // [DEBUG] 暴露骨骼信息
      try {
        window.__vrm = vrm
        const h = vrm.humanoid
        const lu = h && h.getNormalizedBoneNode('leftUpperArm')
        const ru = h && h.getNormalizedBoneNode('rightUpperArm')
        console.log('[VrmAvatar] normalizedBone leftUpperArm:', lu ? JSON.stringify(lu.rotation) : 'NULL')
        console.log('[VrmAvatar] normalizedBone rightUpperArm:', ru ? JSON.stringify(ru.rotation) : 'NULL')
        const raw = h && h.getRawBoneNode && h.getRawBoneNode('leftUpperArm')
        console.log('[VrmAvatar] rawBone leftUpperArm:', raw ? JSON.stringify(raw.rotation) : 'NULL')
        console.log('[VrmAvatar] vrmMeta:', JSON.stringify(vrm.meta))
      } catch (e) { console.log('[VrmAvatar] debug err', e.message) }
      statusText.value = '待机中'
    },
    undefined,
    () => {
      // 加载失败，构建程序化"占位助手"
      buildPlaceholder()
    }
  )
}

// ---------- 姿势：把 T-pose 双臂放下，摆出自然放松站姿 ----------
const poseVRM = (loaded) => {
  const humanoid = loaded.humanoid
  if (!humanoid) return
  const bone = (name) => humanoid.getNormalizedBoneNode(name)

  // 目标姿势（相对骨骼局部坐标）
  const target = {
    leftUpperArm:  { x: 0.10, y: 0.0,  z: 1.05 },
    rightUpperArm: { x: 0.10, y: 0.0,  z: -1.05 },
    leftLowerArm:  { x: -0.22, y: 0.0, z: 0.30 },
    rightLowerArm: { x: -0.22, y: 0.0, z: -0.30 },
    leftHand:      { x: 0.0, y: 0.0, z: 0.12 },
    rightHand:     { x: 0.0, y: 0.0, z: -0.12 },
    spine:         { x: 0.02, y: 0, z: 0 },
    chest:         { x: 0.02, y: 0, z: 0 }
  }

  posed = {}
  Object.keys(target).forEach((n) => {
    const b = bone(n)
    if (!b) return
    const t = target[n]
    b.rotation.set(t.x, t.y, t.z)
    // 关键：在设置完毕后再记录基准，idle 微动基于此叠加
    posed[n] = { base: b.rotation.clone(), node: b }
  })
}

let posed = null
// ---------- 程序化占位助手（无模型时兜底） ----------
const buildPlaceholder = () => {
  fallback.value = true
  statusText.value = '占位形象'
  const group = new THREE.Group()
  group.name = 'procedural-assistant'

  // ----- 材质 -----
  const skin = new THREE.MeshStandardMaterial({ color: 0xf7d9c4, roughness: 0.62, metalness: 0.02 })
  const skinSoft = new THREE.MeshStandardMaterial({ color: 0xf2c9b4, roughness: 0.7, metalness: 0.02 })
  const coat = new THREE.MeshStandardMaterial({ color: 0xf6f9ff, roughness: 0.55, metalness: 0.04 })
  const coatShade = new THREE.MeshStandardMaterial({ color: 0xdfe8f5, roughness: 0.6, metalness: 0.04 })
  const accent = new THREE.MeshStandardMaterial({ color: 0x18b6d8, roughness: 0.35, metalness: 0.35, emissive: 0x0a4652, emissiveIntensity: 0.6 })
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x2c3646, roughness: 0.45, metalness: 0.12 })
  const hairMat2 = new THREE.MeshStandardMaterial({ color: 0x3a465a, roughness: 0.5, metalness: 0.1 })
  const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xfbfdff, roughness: 0.25 })
  const irisMat = new THREE.MeshStandardMaterial({ color: 0x1ba7c9, roughness: 0.2, metalness: 0.15, emissive: 0x0b3a44, emissiveIntensity: 0.5 })
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x0a1420, roughness: 0.3 })
  const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
  const browMat = new THREE.MeshStandardMaterial({ color: 0x333e50, roughness: 0.5 })
  const blushMat = new THREE.MeshBasicMaterial({ color: 0xf0a0a0, transparent: true, opacity: 0.32 })
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0xb25362, roughness: 0.4 })

  // ================= 头 =================
  const headGrp = new THREE.Group()
  headGrp.position.y = 1.36
  group.add(headGrp)

  // 脸型：略扁的球体 + 下巴收窄
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.235, 48, 40), skin)
  skull.scale.set(1, 1.12, 0.96)
  headGrp.add(skull)
  // 下巴
  const chin = new THREE.Mesh(new THREE.SphereGeometry(0.135, 32, 24), skin)
  chin.position.set(0, -0.16, 0.02)
  chin.scale.set(1, 0.85, 0.95)
  headGrp.add(chin)
  // 耳朵
  const earGeo = new THREE.SphereGeometry(0.05, 20, 16)
  const earL = new THREE.Mesh(earGeo, skinSoft)
  earL.position.set(-0.228, -0.02, 0)
  earL.scale.set(0.55, 1, 0.75)
  const earR = earL.clone()
  earR.position.x = 0.228
  headGrp.add(earL, earR)

  // ----- 眼睛 -----
  const eyeGrp = new THREE.Group()
  headGrp.add(eyeGrp)
  const makeEye = (sx) => {
    const g = new THREE.Group()
    g.position.set(sx * 0.082, 0.005, 0.198)
    // 眼白
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.052, 32, 24), eyeWhite)
    white.scale.set(1, 1.18, 0.5)
    g.add(white)
    // 虹膜
    const iris = new THREE.Mesh(new THREE.CircleGeometry(0.034, 32), irisMat)
    iris.position.z = 0.026
    iris.scale.set(1, 1.2, 1)
    g.add(iris)
    // 瞳孔
    const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.016, 24), pupilMat)
    pupil.position.z = 0.03
    pupil.scale.set(1, 1.15, 1)
    g.add(pupil)
    // 高光
    const hl1 = new THREE.Mesh(new THREE.CircleGeometry(0.011, 16), hlMat)
    hl1.position.set(-0.011, 0.014, 0.034)
    const hl2 = new THREE.Mesh(new THREE.CircleGeometry(0.006, 12), hlMat)
    hl2.position.set(0.012, -0.012, 0.034)
    g.add(hl1, hl2)
    // 上睫毛线
    const lash = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.007, 8, 24, Math.PI), browMat)
    lash.position.set(0, 0.012, 0.026)
    lash.rotation.z = Math.PI
    g.add(lash)
    g.userData.parts = { white, iris, pupil, hl1, hl2, lash }
    return g
  }
  const eyeL = makeEye(-1)
  const eyeR = makeEye(1)
  eyeGrp.add(eyeL, eyeR)

  // ----- 眉毛 -----
  const makeBrow = (sx) => {
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.006, 0.05, 6, 12), browMat)
    b.position.set(sx * 0.085, 0.088, 0.205)
    b.rotation.z = sx * 0.22
    return b
  }
  headGrp.add(makeBrow(-1), makeBrow(1))

  // ----- 鼻子 -----
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.016, 16, 12), skinSoft)
  nose.position.set(0, -0.03, 0.225)
  nose.scale.set(0.8, 1, 0.9)
  headGrp.add(nose)

  // ----- 嘴（说话时开合） -----
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.03, 24, 18), mouthMat)
  mouth.position.set(0, -0.085, 0.212)
  mouth.scale.set(1.15, 0.35, 0.5)
  headGrp.add(mouth)

  // ----- 腮红 -----
  const makeBlush = (sx) => {
    const bl = new THREE.Mesh(new THREE.CircleGeometry(0.03, 20), blushMat)
    bl.position.set(sx * 0.135, -0.05, 0.185)
    bl.rotation.y = sx * -0.5
    return bl
  }
  headGrp.add(makeBlush(-1), makeBlush(1))

  // ================= 头发 =================
  // 后脑勺
  const hairBack = new THREE.Mesh(new THREE.SphereGeometry(0.248, 48, 40), hairMat)
  hairBack.position.set(0, 0.055, -0.03)
  hairBack.scale.set(1.0, 1.06, 1.0)
  headGrp.add(hairBack)
  // 顶部/侧边覆盖（露出脸）
  const hairTop = new THREE.Mesh(
    new THREE.SphereGeometry(0.243, 48, 40, 0, Math.PI * 2, 0, Math.PI * 0.50),
    hairMat2
  )
  hairTop.position.set(0, 0.075, 0.005)
  hairTop.scale.set(1.02, 1.04, 1.02)
  headGrp.add(hairTop)
  // 刘海（几束）
  const makeBang = (x, ry, rz, len) => {
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, len, 8, 16), hairMat2)
    b.position.set(x, 0.205, 0.175)
    b.rotation.set(0.28, ry, rz)
    return b
  }
  headGrp.add(makeBang(-0.135, -0.5, 0.30, 0.09))
  headGrp.add(makeBang(-0.05, -0.15, 0.12, 0.11))
  headGrp.add(makeBang(0.05, 0.1, -0.10, 0.10))
  headGrp.add(makeBang(0.135, 0.5, -0.28, 0.09))
  // 两侧长发束（垂到肩）
  const makeSideHair = (sx) => {
    const s = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.32, 10, 20), hairMat)
    s.position.set(sx * 0.215, -0.12, -0.01)
    s.rotation.z = sx * 0.08
    return s
  }
  headGrp.add(makeSideHair(-1), makeSideHair(1))

  group.userData.eyeL = eyeL
  group.userData.eyeR = eyeR
  group.userData.mouth = mouth

  // ================= 脖子 =================
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.12, 24), skinSoft)
  neck.position.y = 1.18
  group.add(neck)

  // ================= 身体（白大褂） =================
  const torso = new THREE.Group()
  torso.position.y = 0.98
  group.add(torso)
  // 主干：上宽下窄
  const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.235, 0.34, 12, 32), coat)
  chest.position.y = 0.02
  chest.scale.set(1, 1, 0.78)
  torso.add(chest)
  // 下摆
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.30, 0.30, 32), coat)
  skirt.position.y = -0.28
  skirt.scale.set(1, 1, 0.8)
  torso.add(skirt)
  // V 领开口（内衬）
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.26, 24, 1, true), accent)
  inner.position.set(0, 0.12, 0.085)
  inner.scale.set(1, 1, 0.6)
  torso.add(inner)
  // 翻领（两片）
  const makeLapel = (sx) => {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.24, 0.02), coatShade)
    l.position.set(sx * 0.10, 0.09, 0.155)
    l.rotation.set(0.12, sx * 0.35, sx * 0.28)
    return l
  }
  torso.add(makeLapel(-1), makeLapel(1))
  // 纽扣
  for (let i = 0; i < 3; i++) {
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.01, 16), accent)
    btn.rotation.x = Math.PI / 2
    btn.position.set(0, 0.0 - i * 0.11, 0.198)
    torso.add(btn)
  }
  // 口袋 + 铭牌
  const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.09, 0.012), coatShade)
  pocket.position.set(0.14, -0.14, 0.185)
  torso.add(pocket)
  const badge = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.008), accent)
  badge.position.set(-0.13, 0.06, 0.198)
  torso.add(badge)

  // ================= 手臂 =================
  const makeArm = (sx) => {
    const g = new THREE.Group()
    g.position.set(sx * 0.235, 1.02, 0)
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.062, 0.26, 8, 20), coat)
    upper.position.y = -0.16
    upper.rotation.z = sx * 0.12
    g.add(upper)
    const lower = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.24, 8, 20), coat)
    lower.position.set(sx * 0.04, -0.46, 0.03)
    lower.rotation.z = sx * 0.08
    g.add(lower)
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.058, 20, 16), skin)
    hand.position.set(sx * 0.06, -0.62, 0.05)
    hand.scale.set(0.9, 1.1, 0.8)
    g.add(hand)
    return g
  }
  const armL = makeArm(-1)
  const armR = makeArm(1)
  group.add(armL, armR)

  // ================= 听诊器 =================
  const stethGrp = new THREE.Group()
  stethGrp.position.set(0, 0.98, 0)
  group.add(stethGrp)
  const tube = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.014, 10, 40, Math.PI * 1.25), accent)
  tube.position.set(0.02, 0.12, 0.15)
  tube.rotation.set(0.2, 0.3, -0.6)
  stethGrp.add(tube)
  // 听诊头
  const chestPiece = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 24), accent)
  chestPiece.position.set(0.17, -0.02, 0.17)
  chestPiece.rotation.set(Math.PI / 2, 0, 0.4)
  stethGrp.add(chestPiece)
  const cpRing = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 10, 28), coatShade)
  cpRing.position.copy(chestPiece.position)
  cpRing.rotation.copy(chestPiece.rotation)
  stethGrp.add(cpRing)

  placeholder = group
  scene.add(group)
}
// ---------- 交互：拖拽旋转 ----------
const bindPointer = () => {
  if (!props.draggable || !wrapEl.value) return
  const el = wrapEl.value
  el.style.cursor = 'grab'
  const onDown = (e) => {
    pointerState.down = true
    pointerState.lastX = e.clientX
    pointerState.lastY = e.clientY
    el.style.cursor = 'grabbing'
  }
  const onMove = (e) => {
    if (!pointerState.down) return
    const dx = e.clientX - pointerState.lastX
    const dy = e.clientY - pointerState.lastY
    pointerState.lastX = e.clientX
    pointerState.lastY = e.clientY
    targetRotY = THREE.MathUtils.clamp(targetRotY + dx * 0.01, -0.9, 0.9)
    targetRotX = THREE.MathUtils.clamp(targetRotX + dy * 0.006, -0.35, 0.35)
  }
  const onUp = () => {
    pointerState.down = false
    el.style.cursor = 'grab'
    targetRotY = 0
    targetRotX = 0
  }
  el.addEventListener('pointerdown', onDown)
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  el._cleanup = () => {
    el.removeEventListener('pointerdown', onDown)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
  }
}

const onResize = () => {
  const wrap = wrapEl.value
  if (!wrap || !renderer || !camera) return
  const width = wrap.clientWidth || 320
  const height = wrap.clientHeight || 360
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}

// ---------- 表情映射 ----------
const emotionToValue = (e) => ({ neutral: 0, happy: 1, thinking: 0.5, concern: -1 }[e] ?? 0)

// ---------- 主循环 ----------
const loop = () => {
  raf = requestAnimationFrame(loop)
  const delta = clock.getDelta()
  const t = clock.elapsedTime

  // 说话口型权重平滑
  const speakTarget = props.speaking ? 1 : 0
  speakingAmt += (speakTarget - speakingAmt) * Math.min(1, delta * 8)
  const lip = props.speaking
    ? Math.max(0, Math.sin(t * 12) * 0.5 + Math.sin(t * 7.3) * 0.3 + 0.4)
    : 0

  if (vrm) {
    const em = vrm.expressionManager
    if (em) {
      // 口型：用 aa 主驱动，io 辅助，形成自然的开合
      em.setValue('aa', lip * 0.9)
      em.setValue('ih', lip * 0.25)
      em.setValue('ou', lip * 0.2)
      // 眨眼
      nextBlink -= delta
      if (nextBlink <= 0) { blinkTimer = 0.14; nextBlink = 2 + Math.random() * 3.5 }
      let blink = 0
      if (blinkTimer > 0) { blinkTimer -= delta; blink = Math.sin(Math.max(0, blinkTimer) / 0.14 * Math.PI) }
      em.setValue('blink', blink)
      // 情绪
      emotionTarget = emotionToValue(props.emotion)
      emotionCurrent += (emotionTarget - emotionCurrent) * Math.min(1, delta * 4)
      em.setValue('happy', Math.max(0, emotionCurrent) * 0.7)
      em.setValue('sad', Math.max(0, -emotionCurrent) * 0.6)
    }
    // 待机呼吸 + 轻微摆头
    const breath = prefersReduced ? 0 : Math.sin(t * 1.6) * 0.006
    vrm.scene.position.y = breath
    const lookY = props.speaking ? Math.sin(t * 1.1) * 0.05 : Math.sin(t * 0.6) * 0.03
    vrm.scene.rotation.y = Math.PI + targetRotY + lookY
    vrm.scene.rotation.x = targetRotX

    // 姿态微动：呼吸带动躯干与手臂轻微起伏，避免僵硬
    if (posed && !prefersReduced) {
      const sway = Math.sin(t * 1.6) * 0.02
      const armSway = Math.sin(t * 1.6 + 0.6) * 0.03
      const setDelta = (name, dx, dz) => {
        const item = posed[name]
        if (!item) return
        item.node.rotation.x = item.base.x + dx
        item.node.rotation.z = item.base.z + dz
      }
      setDelta('spine', sway * 0.5, 0)
      setDelta('chest', sway * 0.4, 0)
      setDelta('leftUpperArm', 0, -armSway)
      setDelta('rightUpperArm', 0, armSway)
      setDelta('leftLowerArm', Math.sin(t * 1.6 + 1.1) * 0.03, 0)
      setDelta('rightLowerArm', Math.sin(t * 1.6 + 1.1) * 0.03, 0)
    }

    vrm.update(delta)
  } else if (placeholder) {
    // 占位形象动画：呼吸 + 摆头 + 眨眼 + 口型
    const breath = prefersReduced ? 0 : Math.sin(t * 1.6) * 0.015
    placeholder.position.y = breath
    placeholder.rotation.y = targetRotY + (props.speaking ? Math.sin(t * 1.1) * 0.05 : Math.sin(t * 0.6) * 0.03)
    placeholder.rotation.x = targetRotX

    // 口型
    const mouth = placeholder.userData.mouth
    if (mouth) mouth.scale.y = 0.35 + lip * 1.1

    // 眨眼：整体压扁眼球组
    nextBlink -= delta
    if (nextBlink <= 0) { blinkTimer = 0.14; nextBlink = 2 + Math.random() * 3.5 }
    let open = 1
    if (blinkTimer > 0) { blinkTimer -= delta; open = 1 - Math.sin(Math.max(0, blinkTimer) / 0.14 * Math.PI) }
    const { eyeL, eyeR } = placeholder.userData
    if (eyeL) eyeL.scale.y = open
    if (eyeR) eyeR.scale.y = open

    // 情绪：轻微抬头/低头
    const emo = emotionToValue(props.emotion)
    const headPitch = emo > 0 ? -0.05 : (emo < 0 ? 0.06 : 0)
    placeholder.rotation.x = targetRotX + headPitch
  }

  statusText.value = props.speaking ? '回答中…' : (fallback.value ? '占位形象' : '待机中')
  renderer.render(scene, camera)
}

onMounted(initThree)

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('resize', onResize)
  resizeObserver && resizeObserver.disconnect()
  if (wrapEl.value && wrapEl.value._cleanup) wrapEl.value._cleanup()
  if (vrm) VRMUtils.deepDispose(vrm.scene)
  if (renderer) renderer.dispose()
  vrm = null
  placeholder = null
})

watch(() => props.modelUrl, () => {
  if (!renderer) return
  if (vrm) { scene.remove(vrm.scene); VRMUtils.deepDispose(vrm.scene); vrm = null }
  if (placeholder) { scene.remove(placeholder); placeholder = null }
  fallback.value = false
  loadModel()
})
</script>

<style scoped>
.vrm-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 220px;
  border-radius: 14px;
  overflow: hidden;
  background:
    radial-gradient(120% 90% at 50% 0%, #eef4fc, #f5f7fa 60%),
    linear-gradient(180deg, rgba(245, 247, 250, 0.35), rgba(245, 247, 250, 0.75));
  border: 1px solid var(--line, rgba(120, 200, 255, 0.14));
  touch-action: none;
}
.vrm-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
.vrm-nameplate {
  position: absolute;
  left: 12px;
  bottom: 12px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 12px;
  color: var(--t-main, #303133);
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(64, 158, 255, 0.28);
  border-radius: 999px;
  letter-spacing: 0.4px;
}
.vrm-nameplate .state {
  color: var(--t-dim, #909399);
  font-size: 11px;
}
.vrm-nameplate .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #35e0a1;
  box-shadow: 0 0 8px rgba(53, 224, 161, 0.9);
  transition: background 0.3s;
}
.vrm-nameplate .dot.busy {
  background: #409eff;
  box-shadow: 0 0 10px rgba(64, 158, 255, 1);
  animation: pulse 1s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
.vrm-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  pointer-events: none;
  opacity: 0;
}
.fb-avatar {
  width: 84px;
  height: 84px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34px;
  color: #ffffff;
  background: linear-gradient(135deg, #409eff, #409eff);
  box-shadow: 0 0 30px rgba(64, 158, 255, 0.5);
}
.fb-tip {
  font-size: 12px;
  color: var(--t-dim, #909399);
}
</style>
