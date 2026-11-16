<template>
  <div class="page-container">
    <div class="ai-layout">
      <!-- 左侧：患者上下文 -->
      <div class="ai-side">
        <div class="side-title">患者上下文</div>
        <PatientSelect v-model="patientId" @select="onPatientSelect" />
        <div class="side-tip" v-if="patientName">
          当前患者：<b>{{ patientName }}</b><br />
          AI 将结合该患者的监测、预警、用药、医生指导等数据回答
        </div>
        <div class="side-tip warn" v-else>未选择患者，AI 将作为通用医学问答</div>

        <div class="side-title" style="margin-top:24px">快捷提问</div>
        <div class="quick-list">
          <div v-for="(q, i) in quickQuestions" :key="i" class="quick-item" @click="useQuick(q)">
            {{ q }}
          </div>
        </div>
      </div>

      <!-- 右侧：对话 -->
      <div class="ai-main">
        <!-- 3D 拟人助手 -->
        <div class="avatar-panel">
          <div class="avatar-stage">
            <VrmAvatar
              :key="avatarKey"
              :speaking="loading"
              :emotion="emotion"
              name="AI 健康助手"
            />
          </div>
          <div class="avatar-actions">
            <el-button size="small" :icon="Refresh" @click="reloadAvatar">换个形象</el-button>
          </div>
        </div>

        <div class="chat-box" ref="chatBox">
          <div v-if="messages.length === 0" class="welcome">
            <el-icon :size="48" color="#409eff"><MagicStick /></el-icon>
            <h3>AI 健康助手</h3>
            <p>基于患者真实健康数据，为您提供辅助分析与临床建议</p>
            <p class="tip">提示：AI 建议仅供参考，最终医疗决策请结合临床判断</p>
          </div>

          <div v-for="(m, i) in messages" :key="i" :class="['msg', m.role]">
            <div class="avatar">
              <el-icon v-if="m.role === 'user'"><User /></el-icon>
              <el-icon v-else><MagicStick /></el-icon>
            </div>
            <div class="bubble">
              <div v-if="m.role === 'assistant'" class="md" v-html="renderMarkdown(m.content)"></div>
              <div v-else class="plain">{{ m.content }}</div>
              <div v-if="m.meta" class="meta">{{ m.meta }}</div>
            </div>
          </div>

          <div v-if="loading" class="msg assistant">
            <div class="avatar"><el-icon><MagicStick /></el-icon></div>
            <div class="bubble"><span class="dotting">AI 正在思考</span></div>
          </div>
        </div>

        <div class="input-bar">
          <el-input
            v-model="input"
            type="textarea"
            :rows="2"
            resize="none"
            placeholder="输入您的问题，如：这个患者目前风险如何？需要调整用药吗？（Ctrl+Enter 发送）"
            @keydown.ctrl.enter="send"
          />
          <div class="input-actions">
            <el-button :icon="Delete" :disabled="loading || !messages.length" @click="clearChat">清空</el-button>
            <el-button type="primary" :icon="Promotion" :loading="loading" @click="send">发送</el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { nextTick, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { MagicStick, User, Promotion, Delete, Refresh } from '@element-plus/icons-vue'
import { marked } from 'marked'
import { aiChat } from '@/api/ai'
import VrmAvatar from '@/components/VrmAvatar.vue'

const patientId = ref(null)
const patientName = ref('')
const input = ref('')
const loading = ref(false)
const messages = ref([])
const chatBox = ref()
const emotion = ref('neutral')
const avatarKey = ref(0)

// 重新挂载 3D 助手（换形象 / 加载失败重试）
const reloadAvatar = () => { avatarKey.value++ }

const quickQuestions = [
  '这个患者目前情况怎么样？',
  '有哪些需要优先处理的预警？',
  '用药方案有什么建议？',
  '帮我生成一份患者教育要点',
  '指标趋势如何？是否在改善？'
]

const onPatientSelect = (p) => {
  patientName.value = p ? p.name : ''
  if (p) ElMessage.success('已切换上下文：' + p.name)
}

const useQuick = (q) => {
  input.value = q
  send()
}

const clearChat = () => {
  messages.value = []
}

const scrollBottom = async () => {
  await nextTick()
  if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight
}

/** 轻量 Markdown 渲染（无第三方依赖） */
/** Markdown 渲染（marked，支持标题/列表/表格/代码块） */
marked.setOptions({ breaks: true, gfm: true })

const renderMarkdown = (text) => {
  if (!text) return ''
  try {
    return marked.parse(String(text))
  } catch (e) {
    return String(text).replace(/\n/g, '<br/>')
  }
}

const send = async () => {
  const q = input.value.trim()
  if (!q) {
    ElMessage.warning('请输入问题')
    return
  }
  if (loading.value) return

  messages.value.push({ role: 'user', content: q })
  input.value = ''
  loading.value = true
  emotion.value = 'thinking'
  scrollBottom()

  try {
    const res = await aiChat({ question: q, patientId: patientId.value })
    const d = res.data || {}
    messages.value.push({
      role: 'assistant',
      content: d.answer || '（无回复）',
      meta: d.costTime ? '耗时 ' + (d.costTime / 1000).toFixed(1) + 's｜模型 ' + d.model : ''
    })
  } catch (e) {
    messages.value.push({ role: 'assistant', content: '请求失败，请稍后重试。' + (e.message || '') })
  } finally {
    loading.value = false
    emotion.value = 'happy'
    scrollBottom()
    // 回答结束后短暂保持微笑，再回到平静
    setTimeout(() => { emotion.value = 'neutral' }, 2200)
  }
}
</script>

<style scoped>
.ai-layout {
  display: flex;
  gap: 16px;
  height: calc(100vh - 120px);
}
.ai-side {
  width: 264px;
  flex-shrink: 0;
  background: var(--bg-panel);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 16px;
  overflow-y: auto;
}
.side-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--t-main);
  letter-spacing: 0.6px;
  margin-bottom: 14px;
}
.side-title::before {
  content: '';
  width: 3px;
  height: 14px;
  border-radius: 2px;
  background: linear-gradient(180deg, #409eff, #409eff);
  box-shadow: 0 0 10px rgba(64, 158, 255, 0.8);
}
.side-tip {
  margin-top: 14px;
  font-size: 12px;
  color: var(--t-sub);
  line-height: 1.75;
  background: rgba(64, 158, 255, 0.05);
  border: 1px solid var(--line);
  padding: 10px 12px;
  border-radius: 10px;
}
.side-tip.warn {
  color: #e6a23c;
  background: rgba(230, 162, 60, 0.1);
  border-color: rgba(230, 162, 60, 0.32);
}
.quick-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.quick-item {
  font-size: 13px;
  color: var(--t-sub);
  padding: 9px 12px;
  background: #f5f7fa;
  border: 1px solid var(--line);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.22s;
}
.quick-item:hover {
  background: rgba(64, 158, 255, 0.12);
  border-color: var(--line-strong);
  color: #303133;
  transform: translateX(3px);
}
.ai-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-panel);
  border: 1px solid var(--line);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 16px 44px rgba(0, 0, 0, 0.4);
}.avatar-panel {
  position: relative;
  height: 260px;
  flex-shrink: 0;
  padding: 14px 16px 0;
  background:
    radial-gradient(120% 120% at 50% -20%, #eef4fc, #f5f7fa 62%),
    linear-gradient(180deg, rgba(64, 158, 255, 0.04), transparent);
  border-bottom: 1px solid var(--line);
}
.avatar-stage {
  width: 100%;
  height: 100%;
}
.avatar-actions {
  position: absolute;
  top: 12px;
  right: 16px;
  z-index: 2;
}
.chat-box {
  flex: 1;
  overflow-y: auto;
  padding: 22px;
}
.welcome {
  text-align: center;
  padding-top: 74px;
  color: var(--t-dim);
}
.welcome h3 {
  color: var(--t-main);
  letter-spacing: 1px;
  margin: 14px 0 8px;
}
.welcome p {
  font-size: 13px;
  margin: 4px 0;
  color: var(--t-sub);
}
.welcome .tip {
  color: var(--t-dim);
  font-size: 12px;
  margin-top: 14px;
}
.msg {
  display: flex;
  gap: 12px;
  margin-bottom: 22px;
  animation: fade-slide-up 0.4s ease both;
}
.msg.user {
  flex-direction: row-reverse;
}
.avatar {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(64, 158, 255, 0.12);
  border: 1px solid rgba(64, 158, 255, 0.3);
  color: #409eff;
  box-shadow: inset 0 0 14px rgba(64, 158, 255, 0.16);
}
.msg.user .avatar {
  background: linear-gradient(135deg, #409eff, #337ecc);
  border-color: transparent;
  color: #ffffff;
  box-shadow: 0 0 16px rgba(64, 158, 255, 0.5);
}
.bubble {
  max-width: 78%;
  padding: 13px 17px;
  border-radius: 14px;
  background: #f5f7fa;
  border: 1px solid var(--line);
  font-size: 14px;
  line-height: 1.85;
  color: var(--t-main);
  word-break: break-word;
}
.msg.user .bubble {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.9), rgba(64, 158, 255, 0.85));
  border-color: rgba(64, 158, 255, 0.4);
  color: #ffffff;
  box-shadow: 0 8px 22px rgba(64, 158, 255, 0.12);
}
.meta {
  margin-top: 9px;
  font-size: 11px;
  color: var(--t-dim);
}
.md :deep(h2),
.md :deep(h3),
.md :deep(h4) {
  margin: 14px 0 8px;
  color: #303133;
  letter-spacing: 0.5px;
}
.md :deep(h2) { font-size: 17px; }
.md :deep(h3) { font-size: 15px; }
.md :deep(h4) { font-size: 14px; }
.md :deep(ul) {
  padding-left: 20px;
  margin: 8px 0;
}
.md :deep(li) {
  margin: 4px 0;
}
.md :deep(strong) {
  color: #67c23a;
}
.md :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 10px 0;
  font-size: 13px;
}
.md :deep(th),
.md :deep(td) {
  border: 1px solid rgba(64, 158, 255, 0.18);
  padding: 7px 11px;
  text-align: left;
}
.md :deep(th) {
  background: rgba(64, 158, 255, 0.1);
  font-weight: 600;
  color: #303133;
}
.md :deep(p) {
  margin: 6px 0;
}
.md :deep(hr) {
  border: none;
  border-top: 1px solid var(--line);
  margin: 14px 0;
}
.md :deep(code) {
  background: rgba(64, 158, 255, 0.1);
  color: #303133;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 12px;
}
.md :deep(.code) {
  background: #f5f7fa;
  border: 1px solid var(--line);
  color: #303133;
  padding: 10px;
  border-radius: 8px;
  font-size: 12px;
  overflow-x: auto;
}
.input-bar {
  border-top: 1px solid var(--line);
  background: #ffffff;
  padding: 13px 16px;
  display: flex;
  gap: 12px;
  align-items: flex-end;
}
.input-bar :deep(.el-textarea) {
  flex: 1;
}
.input-actions {
  display: flex;
  gap: 8px;
}
.dotting::after {
  content: '...';
  animation: dots 1.2s infinite;
}
@keyframes dots {
  0%, 20% { content: '.'; }
  40% { content: '..'; }
  60%, 100% { content: '...'; }
}
</style>
