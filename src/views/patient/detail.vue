<template>
  <div class="page-container">
    <el-page-header @back="$router.back()" :content="patient.name ? patient.name + ' - 健康档案' : '患者详情'" style="margin-bottom:16px" />
    <div style="margin:-8px 0 16px;display:flex;justify-content:flex-end">
      <el-button v-permission="['chronic:profile:list']" type="primary" plain size="small" :icon="Notebook" @click="$router.push({ path: '/patient/profile', query: { patientId } })">专属档案</el-button>
    </div>

    <el-row :gutter="16">
      <el-col :span="8">
        <el-card>
          <template #header><b>基本信息</b></template>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="患者编号">{{ patient.patientNo }}</el-descriptions-item>
            <el-descriptions-item label="姓名">{{ patient.name }}</el-descriptions-item>
            <el-descriptions-item label="性别">{{ patient.gender === '1' ? '男' : patient.gender === '0' ? '女' : '-' }}</el-descriptions-item>
            <el-descriptions-item label="年龄">{{ patient.age ?? '-' }}</el-descriptions-item>
            <el-descriptions-item label="手机号">{{ patient.phone }}</el-descriptions-item>
            <el-descriptions-item label="责任医生">{{ patient.doctorName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="风险等级">
              <el-tag :type="levelTag(patient.riskLevel)" size="small">{{ levelName(patient.riskLevel) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="风险评分">{{ patient.riskScore ?? '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card style="margin-top:16px">
          <template #header>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <b>健康评分</b>
              <el-button type="primary" link size="small" @click="handleCalc">重新计算</el-button>
            </div>
          </template>
          <div v-if="score" style="text-align:center">
            <div :style="{ fontSize: '36px', fontWeight: 'bold', color: levelColor(score.riskLevel) }">
              {{ score.totalScore }}
            </div>
            <el-tag :type="levelTag(score.riskLevel)">{{ score.riskLevelName || levelName(score.riskLevel) }}</el-tag>
            <div v-if="diseaseScores.length" style="margin-top:10px;text-align:left">
              <div v-for="d in diseaseScores" :key="d.diseaseCode" class="disease-score-row">
                <span>{{ d.diseaseName }}</span>
                <b :style="{ color: levelColor(d.riskLevel) }">{{ d.diseaseScore }}</b>
                <span class="disease-score-weight">占比 {{ Math.round((d.weight || 0) * 100) }}%</span>
              </div>
              <div v-if="diseaseScores.length > 1" class="disease-score-tip">多病共存，综合评分按病种占比加权</div>
            </div>
            <div style="color:#909399;font-size:12px;margin-top:8px">{{ score.calcTime }}</div>
          </div>
          <el-empty v-else description="暂无评分" :image-size="60" />
        </el-card>
      </el-col>

      <el-col :span="16">
        <el-card>
          <template #header>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <b>最近监测指标</b>
              <el-button type="primary" link size="small" @click="$router.push('/monitor/measure')">查看全部</el-button>
            </div>
          </template>
          <el-table :data="indicators" size="small">
            <el-table-column prop="indicatorName" label="指标" width="110" />
            <el-table-column prop="value" label="数值" width="90" />
            <el-table-column prop="unit" label="单位" width="80" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.abnormalFlag === '1' ? 'danger' : 'success'" size="small">
                  {{ row.abnormalFlag === '1' ? '异常' : '正常' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="measureTime" label="测量时间" />
          </el-table>
          <el-empty v-if="!indicators.length" description="暂无监测数据" :image-size="60" />
        </el-card>

        <el-card style="margin-top:16px">
          <template #header><b>预警记录</b></template>
          <el-table :data="warnings" size="small">
            <el-table-column prop="indicatorName" label="指标" width="100" />
            <el-table-column prop="indicatorValue" label="数值" width="80" />
            <el-table-column prop="thresholdDesc" label="阈值" min-width="140" />
            <el-table-column label="级别" width="80">
              <template #default="{ row }">
                <el-tag :type="levelTag(row.warningLevel)" size="small">{{ levelName(row.warningLevel) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="{ row }">{{ handleStatusName(row.handleStatus) }}</template>
            </el-table-column>
            <el-table-column prop="triggerTime" label="触发时间" />
          </el-table>
          <el-empty v-if="!warnings.length" description="暂无预警" :image-size="60" />
        </el-card>

        <el-card style="margin-top:16px">
          <template #header><b>健康计划</b></template>
          <el-table :data="plans" size="small">
            <el-table-column prop="planName" label="计划名称" min-width="150" />
            <el-table-column prop="beginDate" label="开始" width="110" />
            <el-table-column prop="endDate" label="结束" width="110" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag size="small">{{ planStatusName(row.planStatus) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="executeRate" label="执行率" width="90">
              <template #default="{ row }">{{ row.executeRate }}%</template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!plans.length" description="暂无计划" :image-size="60" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getPatientProfile } from '@/api/patient'
import { calcScore, listScore } from '@/api/score'
import { listWarning } from '@/api/warning'
import { listPlan } from '@/api/plan'
import { listMeasure } from '@/api/measure'

const route = useRoute()
const patientId = route.params.patientId
const patient = ref({})
const indicators = ref([])
const warnings = ref([])
const plans = ref([])
const score = ref(null)
const diseaseScores = ref([])

const levelTag = (l) => ({ 1: 'success', 2: 'warning', 3: 'danger' }[l] || 'info')
const levelName = (l) => ({ 1: '低危', 2: '中危', 3: '高危' }[l] || '-')
const levelColor = (l) => ({ 1: '#67c23a', 2: '#e6a23c', 3: '#f56c6c' }[l] || '#909399')
const handleStatusName = (s) => ({ 0: '待处理', 1: '处理中', 2: '已处理' }[s] || '-')
const planStatusName = (s) => ({ 0: '未开始', 1: '执行中', 2: '已完成' }[s] || '-')

const loadAll = async () => {
  try {
    const res = await getPatientProfile(patientId)
    const d = res.data || {}
    patient.value = d.patient || d
    indicators.value = d.indicators || []
    if (d.healthScore) score.value = d.healthScore
  } catch (e) {
    // 回退：分别查询
    const res = await listMeasure({ patientId, pageNum: 1, pageSize: 20 })
    const seen = new Set()
    indicators.value = (res.data.rows || []).filter((m) => {
      if (seen.has(m.indicatorCode)) return false
      seen.add(m.indicatorCode)
      return true
    })
  }
  try {
    const w = await listWarning({ patientId, pageNum: 1, pageSize: 10 })
    warnings.value = w.data.rows || []
  } catch (e) {}
  try {
    const p = await listPlan({ patientId, pageNum: 1, pageSize: 10 })
    plans.value = p.data.rows || []
  } catch (e) {}
  try {
    const s = await listScore({ patientId, pageNum: 1, pageSize: 1 })
    if (s.data.rows && s.data.rows.length) {
      score.value = s.data.rows[0]
      diseaseScores.value = loadDiseaseScores(s.data.rows[0].detailJson)
    }
  } catch (e) {}
}

/** 从评分明细 JSON 还原各病种得分（单病种记录返回空数组） */
const loadDiseaseScores = (detailJson) => {
  if (!detailJson) return []
  let json
  try {
    json = typeof detailJson === 'string' ? JSON.parse(detailJson) : detailJson
  } catch (e) {
    return []
  }
  const groups = {}
  Object.values(json).forEach((v) => {
    if (!v || typeof v !== 'object' || !v.diseaseCode) return
    const g = groups[v.diseaseCode] || (groups[v.diseaseCode] = { diseaseCode: v.diseaseCode, diseaseName: v.diseaseName, score: 0, weight: 0 })
    g.score += (Number(v.riskScore) || 0) * (Number(v.weight) || 0)
    g.weight += Number(v.weight) || 0
  })
  return Object.values(groups).map((g) => {
    const diseaseScore = Math.round(g.score * 100)
    return {
      diseaseCode: g.diseaseCode,
      diseaseName: g.diseaseName,
      diseaseScore,
      weight: g.weight,
      riskLevel: diseaseScore >= 80 ? '3' : (diseaseScore >= 50 ? '2' : '1')
    }
  })
}

const handleCalc = async () => {
  const res = await calcScore(patientId)
  score.value = { ...res.data, riskLevelName: res.data.riskLevelName }
  diseaseScores.value = Object.values(res.data.diseases || {})
  ElMessage.success('评分计算完成')
}

onMounted(loadAll)
</script>

<style scoped>
.disease-score-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  margin-bottom: 4px;
  font-size: 13px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
}
.disease-score-weight {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.disease-score-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>