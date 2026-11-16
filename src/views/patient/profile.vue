<template>
  <div class="page-container">
    <div class="profile-head">
      <PatientSelect v-model="patientId" @select="onPatientSelect" />
      <div class="head-actions">
        <el-button :icon="Refresh" @click="loadProfile" :disabled="!patientId">刷新</el-button>
        <el-button v-permission="['chronic:profile:edit']" type="primary" :icon="EditPen"
          :disabled="!patientId || editing" @click="startEdit">编辑档案</el-button>
        <el-button type="success" :icon="MagicStick" :loading="aiLoading" :disabled="!patientId"
          @click="handleAnalyze">AI 分析档案</el-button>
      </div>
    </div>

    <el-alert type="info" :closable="false" show-icon style="margin-bottom:16px">
      <template #title>
        本档案仅医生端与家属端可见，患者本人不可见。医疗类字段仅医生可编辑，生活类字段医生与家属均可补充，所有改动留痕。
      </template>
    </el-alert>

    <template v-if="patientId">
      <el-row :gutter="16">
        <el-col :span="14">
          <el-card v-loading="loading">
            <template #header>
              <div class="card-head">
                <b>医疗类信息</b>
                <span class="muted">仅医生可编辑</span>
              </div>
            </template>
            <el-form ref="formRef" :model="form" label-width="110px" :disabled="!editing || !canEdit('bloodType')">
              <el-form-item label="血型">
                <el-input v-model="form.bloodType" placeholder="如 A 型 / RH 阳性" maxlength="10" />
              </el-form-item>
              <el-form-item label="过敏史">
                <el-input v-model="form.allergyHistory" type="textarea" :rows="2" maxlength="500"
                  placeholder="药物、食物等过敏情况" />
              </el-form-item>
              <el-form-item label="家族史">
                <el-input v-model="form.familyHistory" type="textarea" :rows="2" maxlength="500"
                  placeholder="直系亲属慢病与遗传病情况" />
              </el-form-item>
              <el-form-item label="既往病史">
                <el-input v-model="form.pastHistory" type="textarea" :rows="2" maxlength="500" />
              </el-form-item>
              <el-form-item label="既往手术史">
                <el-input v-model="form.surgeryHistory" type="textarea" :rows="2" maxlength="500" />
              </el-form-item>
              <el-form-item label="长期用药">
                <el-input v-model="form.longMedication" type="textarea" :rows="2" maxlength="500"
                  placeholder="药品名 + 剂量 + 频次" />
              </el-form-item>
              <el-form-item label="残疾/行动不便">
                <el-input v-model="form.disabilityNote" type="textarea" :rows="2" maxlength="300" />
              </el-form-item>
            </el-form>
          </el-card>
        </el-col>

        <el-col :span="10">
          <el-card v-loading="loading">
            <template #header><b>生活类信息</b></template>
            <el-form ref="formRef2" :model="form" label-width="100px" :disabled="!editing">
              <el-form-item label="饮食习惯">
                <el-input v-model="form.dietHabit" type="textarea" :rows="2" maxlength="500" />
              </el-form-item>
              <el-form-item label="作息与睡眠">
                <el-input v-model="form.sleepHabit" type="textarea" :rows="2" maxlength="300" />
              </el-form-item>
              <el-form-item label="情绪与心理">
                <el-input v-model="form.moodStatus" type="textarea" :rows="2" maxlength="300" />
              </el-form-item>
              <el-form-item label="运动习惯">
                <el-input v-model="form.exerciseHabit" type="textarea" :rows="2" maxlength="300" />
              </el-form-item>
              <el-form-item label="在家观察">
                <el-input v-model="form.homeObservation" type="textarea" :rows="2" maxlength="500"
                  placeholder="家属可在小程序补充，医生可查看并完善" />
              </el-form-item>
              <el-form-item label="补充说明">
                <el-input v-model="form.extraNote" type="textarea" :rows="3" />
              </el-form-item>
            </el-form>
            <div v-if="editing" class="edit-actions">
              <el-button :disabled="saving" @click="cancelEdit">取消</el-button>
              <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
            </div>
          </el-card>

          <el-card style="margin-top:16px">
            <template #header>
              <div class="card-head">
                <b>填写留痕</b>
                <span class="muted">最近 {{ logs.length }} 条</span>
              </div>
            </template>
            <el-timeline v-if="logs.length">
              <el-timeline-item v-for="l in logs" :key="l.logId" :timestamp="l.editTime" placement="top">
                <div class="log-line">
                  <el-tag size="small" :type="l.editorRole === '1' ? 'primary' : 'success'" effect="plain">
                    {{ l.editorRole === '1' ? '医生' : '家属' }}
                  </el-tag>
                  <b>{{ l.editor }}</b>
                  <span class="muted">修改了「{{ l.fieldName }}」</span>
                </div>
                <div class="log-diff">
                  <span class="old">{{ l.oldValue || '（空）' }}</span>
                  <span class="arrow">→</span>
                  <span class="new">{{ l.newValue || '（空）' }}</span>
                </div>
              </el-timeline-item>
            </el-timeline>
            <el-empty v-else description="暂无填写记录" :image-size="60" />
          </el-card>
        </el-col>
      </el-row>

      <el-card style="margin-top:16px">
        <template #header>
          <div class="card-head">
            <b>AI 档案分析</b>
            <span class="muted">结合档案 + 监测 + 预警 + 用药综合分析，仅供参考</span>
          </div>
        </template>
        <div v-if="aiAnswer" class="ai-answer md" v-html="renderMarkdown(aiAnswer)"></div>
        <el-empty v-else description="点击右上角「AI 分析档案」生成分析结论" :image-size="60" />
      </el-card>
    </template>

    <el-empty v-else description="请先选择患者" />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Refresh, EditPen, MagicStick } from '@element-plus/icons-vue'
import { marked } from 'marked'
import { getPatientProfileDetail, savePatientProfile, aiAnalyzeProfile } from '@/api/profile'

marked.setOptions({ breaks: true, gfm: true })

const route = useRoute()
const patientId = ref(route.query.patientId ? Number(route.query.patientId) : null)
const loading = ref(false)
const saving = ref(false)
const editing = ref(false)
const aiLoading = ref(false)
const aiAnswer = ref('')
const logs = ref([])
const editableFields = ref([])

const emptyForm = () => ({
  patientId: null, bloodType: '', allergyHistory: '', familyHistory: '', pastHistory: '',
  surgeryHistory: '', longMedication: '', disabilityNote: '', dietHabit: '', sleepHabit: '',
  moodStatus: '', exerciseHabit: '', homeObservation: '', extraNote: ''
})
const form = reactive(emptyForm())

const renderMarkdown = (text) => {
  if (!text) return ''
  try {
    return marked.parse(String(text))
  } catch (e) {
    return String(text).replace(/\n/g, '<br/>')
  }
}

const canEdit = (key) => editableFields.value.includes(key)

const fillForm = (p) => {
  Object.assign(form, emptyForm())
  Object.keys(form).forEach((k) => {
    if (p && p[k] !== undefined && p[k] !== null) form[k] = p[k]
  })
  form.patientId = patientId.value
}

const loadProfile = async () => {
  if (!patientId.value) return
  loading.value = true
  try {
    const res = await getPatientProfileDetail(patientId.value)
    const d = res.data || {}
    editableFields.value = d.editableFields || []
    logs.value = d.logs || []
    fillForm(d.profile)
    editing.value = false
  } finally {
    loading.value = false
  }
}

const onPatientSelect = (p) => {
  aiAnswer.value = ''
  if (p) loadProfile()
}

const startEdit = () => {
  editing.value = true
}

const cancelEdit = () => {
  editing.value = false
  loadProfile()
}

const handleSave = async () => {
  saving.value = true
  try {
    await savePatientProfile({ ...form, patientId: patientId.value })
    ElMessage.success('档案已保存')
    editing.value = false
    await loadProfile()
  } finally {
    saving.value = false
  }
}

const handleAnalyze = async () => {
  aiLoading.value = true
  aiAnswer.value = ''
  try {
    const res = await aiAnalyzeProfile(patientId.value)
    aiAnswer.value = (res.data && res.data.answer) || '（无分析结果）'
  } catch (e) {
    aiAnswer.value = ''
  } finally {
    aiLoading.value = false
  }
}

onMounted(() => {
  if (patientId.value) loadProfile()
})
</script>

<style scoped>
.profile-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.head-actions { display: flex; gap: 8px; }
.card-head { display: flex; justify-content: space-between; align-items: center; }
.card-head .muted { font-size: 12px; color: #909399; }
.edit-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
.log-line { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.log-diff { margin-top: 6px; font-size: 12px; color: #606266; }
.log-diff .old { color: #909399; text-decoration: line-through; }
.log-diff .arrow { margin: 0 8px; color: #c0c4cc; }
.log-diff .new { color: #2b7de9; }
.ai-answer { font-size: 14px; line-height: 1.8; color: #303133; }
.muted { color: #909399; }
</style>
