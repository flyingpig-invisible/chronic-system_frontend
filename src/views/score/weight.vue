<template>
  <div class="page-container">
    <div class="search-bar">
      <el-form inline>
        <el-form-item label="患者">
          <PatientSelect v-model="patientId" width="260px" placeholder="选择患者配置权重" @select="onPatientSelect" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" :disabled="!patientId" @click="loadWeight">查询</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="table-card">
      <div class="table-toolbar">
        <div class="toolbar-title">
          <span class="title-text">健康评分权重</span>
          <el-tag v-if="patientId" size="small" type="info">{{ patientLabel }}</el-tag>
          <el-tag v-if="configured" size="small" type="success">已自定义</el-tag>
          <el-tag v-else-if="patientId" size="small" type="warning">使用默认权重</el-tag>
        </div>
        <div style="display:flex;gap:8px">
          <el-button :icon="RefreshLeft" :disabled="!patientId" @click="resetDefault">恢复默认</el-button>
          <el-button :icon="Histogram" :disabled="!patientId" @click="fillAverage">四项均分</el-button>
          <el-button type="primary" :loading="submitting" :disabled="!patientId" @click="handleSubmit">保存并重算</el-button>
        </div>
      </div>

      <el-empty v-if="!patientId" description="请先选择患者" :image-size="80" />

      <template v-else>
        <div class="formula-tip">
          健康评分 = (w1 × 指标达标率 + w2 × 用药依从率 + w3 × (1 − 预警密度) + w4 × 检测完成率) × 100，统计范围为当前时刻往前 7 天。
        </div>

        <el-table :data="rows" border size="default" class="weight-table">
          <el-table-column label="分项" width="130">
            <template #default="{ row }">
              <span class="factor-name">{{ row.name }}</span>
              <span class="factor-code">{{ row.code }}</span>
            </template>
          </el-table-column>
          <el-table-column label="含义" min-width="260">
            <template #default="{ row }">
              <span class="factor-desc">{{ row.desc }}</span>
            </template>
          </el-table-column>
          <el-table-column label="权重(0-1)" width="200">
            <template #default="{ row }">
              <el-input-number v-model="row.weight" :min="0" :max="1" :step="0.05" :precision="2" style="width:140px" />
            </template>
          </el-table-column>
          <el-table-column label="占比" min-width="200">
            <template #default="{ row }">
              <el-progress :percentage="Math.round((row.weight || 0) * 100)" :stroke-width="12" />
            </template>
          </el-table-column>
        </el-table>

        <div class="weight-summary">
          <span :class="['weight-total', sumValid ? 'is-ok' : 'is-error']">
            四项合计 {{ sumText }}
          </span>
          <span class="weight-hint">四项权重之和必须等于 1.00</span>
          <span v-if="updateTime" class="weight-time">上次保存：{{ updateTime }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, RefreshLeft, Histogram } from '@element-plus/icons-vue'
import PatientSelect from '@/components/PatientSelect.vue'
import { getPatientWeight, savePatientWeight } from '@/api/score'

/** 默认权重与后端保持一致 */
const DEFAULT_WEIGHTS = { wRisk: 0.4, wMed: 0.25, wAlert: 0.15, wMonitor: 0.2 }

const FACTORS = [
  { key: 'wRisk', code: 'w1', name: '指标达标率', desc: '近 7 天各指标最新一次测量中达标的比例，本周未测指标记 0' },
  { key: 'wMed', code: 'w2', name: '用药依从率', desc: '按时打卡 / (按时 + 迟服 + 漏服)，晚 1~2 小时为迟服，超过 2 小时为漏服' },
  { key: 'wAlert', code: 'w3', name: '预警密度', desc: '出现中危及以上预警的天数 / 有测量数据的天数，按 (1 − 密度) 计分' },
  { key: 'wMonitor', code: 'w4', name: '检测完成率', desc: '已过整天按每天 3 次统计完成次数，单日超过 3 次按 3 次计' }
]

const patientId = ref(null)
const patientLabel = ref('')
const configured = ref(false)
const updateTime = ref('')
const submitting = ref(false)
const weights = ref({ ...DEFAULT_WEIGHTS })

const rows = computed(() => FACTORS.map((f) => ({
  key: f.key,
  code: f.code,
  name: f.name,
  desc: f.desc,
  weight: Number(weights.value[f.key]) || 0
})))

const total = computed(() => Math.round(rows.value.reduce((s, r) => s + (Number(r.weight) || 0), 0) * 100) / 100)
const sumValid = computed(() => Math.abs(total.value - 1) < 1e-6)
const sumText = computed(() => `${total.value.toFixed(2)}${sumValid.value ? '（符合要求）' : '（需为 1.00）'}`)

const onPatientSelect = (patient) => {
  patientLabel.value = patient ? `${patient.name || ''}${patient.patientNo ? ' · ' + patient.patientNo : ''}` : ''
  if (patientId.value) loadWeight()
}

const loadWeight = async () => {
  if (!patientId.value) return
  try {
    const res = await getPatientWeight(patientId.value)
    const d = res.data || {}
    weights.value = {
      wRisk: Number(d.wRisk ?? DEFAULT_WEIGHTS.wRisk),
      wMed: Number(d.wMed ?? DEFAULT_WEIGHTS.wMed),
      wAlert: Number(d.wAlert ?? DEFAULT_WEIGHTS.wAlert),
      wMonitor: Number(d.wMonitor ?? DEFAULT_WEIGHTS.wMonitor)
    }
    configured.value = !!d.configured
    updateTime.value = d.updateTime || ''
  } catch (e) {
    weights.value = { ...DEFAULT_WEIGHTS }
    configured.value = false
    updateTime.value = ''
  }
}

const resetDefault = () => {
  weights.value = { ...DEFAULT_WEIGHTS }
  ElMessage.info('已恢复默认权重，保存后生效')
}

/** 四项均分为 0.25 */
const fillAverage = () => {
  weights.value = { wRisk: 0.25, wMed: 0.25, wAlert: 0.25, wMonitor: 0.25 }
}

const handleSubmit = async () => {
  if (!patientId.value) {
    ElMessage.warning('请先选择患者')
    return
  }
  for (const r of rows.value) {
    const w = Number(r.weight)
    if (Number.isNaN(w) || w < 0 || w > 1) {
      ElMessage.warning(`「${r.name}」的权重必须在 0~1 之间`)
      return
    }
  }
  if (!sumValid.value) {
    ElMessage.warning(`四项权重之和必须为 1，当前为 ${total.value.toFixed(2)}`)
    return
  }
  submitting.value = true
  try {
    await savePatientWeight({
      patientId: patientId.value,
      wRisk: Number(weights.value.wRisk),
      wMed: Number(weights.value.wMed),
      wAlert: Number(weights.value.wAlert),
      wMonitor: Number(weights.value.wMonitor)
    })
    ElMessage.success('权重保存成功，已按新权重重新计算健康评分')
    await loadWeight()
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.toolbar-title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.title-text {
  font-size: 15px;
  font-weight: 600;
}
.formula-tip {
  margin: 4px 0 14px;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
  border-radius: 4px;
}
.factor-name {
  font-weight: 600;
}
.factor-code {
  margin-left: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.factor-desc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.weight-summary {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 12px;
}
.weight-total {
  font-weight: 600;
}
.weight-total.is-ok {
  color: var(--el-color-success);
}
.weight-total.is-error {
  color: var(--el-color-danger);
}
.weight-hint,
.weight-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>