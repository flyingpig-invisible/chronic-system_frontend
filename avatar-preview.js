import { createApp, h, ref } from 'vue'
import VrmAvatar from '@/components/VrmAvatar.vue'

const params = new URLSearchParams(location.search)
const modelUrl = params.get('model') || '/models/assistant.vrm'
const speaking = ref(params.get('speak') === '1')
const emotion = ref(params.get('emo') || 'neutral')

const App = {
  setup() {
    return () => h('div', { style: 'height:100%;display:flex;flex-direction:column;background:#05080f;' }, [
      h('div', { style: 'padding:8px 14px;color:#9fe4ff;font-family:system-ui;font-size:12px;border-bottom:1px solid rgba(0,212,255,.15)' },
        `model=${modelUrl} speaking=${speaking.value} emotion=${emotion.value}`),
      h('div', { style: 'flex:1;min-height:0;' }, [
        h(VrmAvatar, { modelUrl, speaking: speaking.value, emotion: emotion.value, name: 'AI 健康助手' })
      ])
    ])
  }
}
createApp(App).mount('#app')
