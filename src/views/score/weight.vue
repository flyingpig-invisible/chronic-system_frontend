<template>
  <div class="page-container">
    <div class="search-bar">
      <el-form :model="query" inline>
        <el-form-item label="病种">
          <el-radio-group v-model="query.diseaseCode" @change="loadList">
            <el-radio-button label="">全部</el-radio-button>
            <el-radio-button v-for="d in diseases" :key="d.code" :label="d.code">{{ d.name }}</el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-form>
    </div>

    <div class="table-card">
      <div class="table-toolbar">
        <div style="display:flex;gap:8px">
          <el-button type="primary" :icon="EditPen" @click="openEdit">修改权重</el-button>
          <el-button :icon="Share" @click="openCombined">病种间权重</el-button>
        </div>
      </div>
      <el-table v-loading="loading" :data="list" border stripe>
        <el-table-column prop="weightId" label="ID" width="70" />
        <el-table-column label="病种" width="120">
          <template #default="{ row }">{{ diseaseName(row.diseaseCode) }}</template>
        </el-table-column>
        <el-table-column prop="indicatorName" label="指标" width="140" />
        <el-table-column prop="indicatorCode" label="指标编码" width="120" />
        <el-table-column prop="weight" label="权重(0-1)" width="130" />
        <el-table-column label="权重占比" min-width="200">
          <template #default="{ row }">
            <el-progress :percentage="Math.round(row.weight * 100)" />
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" title="修改评分权重" width="760px" :close-on-click-modal="false">
      <el-steps :active="step" finish-status="success" align-center style="margin-bottom:20px">
        <el-step title="选择病种与指标" />
        <el-step title="设置权重" />
      </el-steps>

      <div v-if="step === 0" class="step-card">
        <el-form label-width="100px">
          <el-form-item label="病种" required>
            <el-select v-model="form.diseaseCode" style="width:100%" @change="onDiseaseChange">
              <el-option v-for="d in diseases" :key="d.code" :label="d.name" :value="d.code" />
            </el-select>
          </el-form-item>
        </el-form>

        <div class="section-title">
          <span>指标清单</span>
          <el-button size="small" type="primary" plain :icon="Plus" @click="addIndicator">新增指标</el-button>
        </div>
        <el-table :data="form.items" border size="small" empty-text="请至少添加一个指标">
          <el-table-column label="指标编码" width="190">
            <template #default="{ row }">
              <el-input v-model="row.indicatorCode" maxlength="32" placeholder="如 sbp" />
            </template>
          </el-table-column>
          <el-table-column label="指标名称" min-width="180">
            <template #default="{ row }">
              <el-input v-model="row.indicatorName" maxlength="50" placeholder="如 收缩压" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80" align="center">
            <template #default="{ $index }">
              <el-button link type="danger" @click="removeIndicator($index)">移除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="hint">原有指标已自动带入，可修改名称或编码；新增指标请填写自定义编码与名称。</div>
      </div>

      <div v-else class="step-card">
        <div class="section-title">
          <span>{{ diseaseName(form.diseaseCode) }} · 指标权重</span>
          <span :class="['weight-total', sumValid ? 'is-ok' : 'is-error']">
            合计 {{ sumText }}
          </span>
        </div>
        <el-table :data="form.items" border size="small">
          <el-table-column prop="indicatorName" label="指标" width="140" />
          <el-table-column prop="indicatorCode" label="指标编码" width="120" />
          <el-table-column label="权重(0-1)" width="180">
            <template #default="{ row }">
              <el-input-number v-model="row.weight" :min="0" :max="1" :step="0.05" :precision="2" style="width:130px" />
            </template>
          </el-table-column>
          <el-table-column label="权重占比" min-width="180">
            <template #default="{ row }">
              <el-progress :percentage="Math.round((row.weight || 0) * 100)" />
            </template>
          </el-table-column>
        </el-table>
        <div class="hint">
          同一病种所有指标的权重之和必须等于 1。
          <el-button link type="primary" @click="fillRemainder">自动补齐剩余权重</el-button>
        </div>
      </div>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button v-if="step === 1" @click="step = 0">上一步</el-button>
        <el-button v-if="step === 0" type="primary" @click="goNext">下一步</el-button>
        <el-button v-else type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="combinedVisible" title="病种间权重（多病共存综合评分）" width="640px" :close-on-click-modal="false">
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="患者同时患多种慢病时，分别计算各病种评分，再按此处权重合成综合评分。四个病种权重相等即为默认平分（患者患 2 种病则各占 50%）。"
        style="margin-bottom:12px"
      />
      <div class="section-title">
        <span>各病种占总分比例</span>
        <span :class="['weight-total', combinedValid ? 'is-ok' : 'is-error']">
          合计 {{ combinedSumText }}
        </span>
      </div>
      <el-table :data="combinedItems" border size="small">
        <el-table-column prop="diseaseName" label="病种" width="140" />
        <el-table-column label="权重(0-1)" width="180">
          <template #default="{ row }">
            <el-input-number v-model="row.weight" :min="0" :max="1" :step="0.05" :precision="2" style="width:130px" />
          </template>
        </el-table-column>
        <el-table-column label="占比" min-width="180">
          <template #default="{ row }">
            <el-progress :percentage="Math.round((row.weight || 0) * 100)" />
          </template>
        </el-table-column>
      </el-table>
      <div class="hint">
        四个病种权重相等时按平分处理（如 0.25×4，或 0.50/0.50 各占一半）；设为不等权重时，各病种权重之和必须等于 1。
        <el-button link type="primary" @click="fillCombinedRemainder">自动补齐剩余权重</el-button>
        <el-button link type="primary" @click="resetCombinedAverage">恢复平分</el-button>
      </div>
      <template #footer>
        <el-button @click="combinedVisible = false">取消</el-button>
        <el-button type="primary" :loading="combinedSubmitting" @click="handleCombinedSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { EditPen, Plus, Share } from '@element-plus/icons-vue'
import { listWeight, saveWeights, listCombinedWeights, saveCombinedWeights } from '@/api/score'

const diseases = [
  { code: '1', name: '高血压' }, { code: '2', name: '糖尿病' },
  { code: '3', name: '冠心病' }, { code: '4', name: '慢阻肺' }
]

const loading = ref(false)
const submitting = ref(false)
const list = ref([])
const dialogVisible = ref(false)
const step = ref(0)

const query = reactive({ diseaseCode: '' })
const form = reactive({ diseaseCode: '1', items: [] })

const diseaseName = (c) => diseases.find((d) => d.code === c)?.name || '-'
const toNumber = (w) => Math.round((Number(w) || 0) * 100) / 100
const total = computed(() => Math.round(form.items.reduce((s, i) => s + (Number(i.weight) || 0), 0) * 100) / 100)
const sumValid = computed(() => Math.abs(total.value - 1) < 1e-6)
const sumText = computed(() => `${total.value.toFixed(2)}${sumValid.value ? '（符合要求）' : '（需为 1.00）'}`)

const loadList = async () => {
  loading.value = true
  try {
    const res = await listWeight({ diseaseCode: query.diseaseCode || undefined })
    list.value = res.data || []
  } finally {
    loading.value = false
  }
}

const loadDiseaseItems = async (code) => {
  const res = await listWeight({ diseaseCode: code })
  form.items = (res.data || []).map((w) => ({
    indicatorCode: w.indicatorCode,
    indicatorName: w.indicatorName,
    weight: toNumber(w.weight)
  }))
}

const onDiseaseChange = async (code) => {
  await loadDiseaseItems(code)
}

const addIndicator = () => {
  form.items.push({ indicatorCode: '', indicatorName: '', weight: 0 })
}

const removeIndicator = (index) => {
  form.items.splice(index, 1)
}

const goNext = () => {
  if (!form.diseaseCode) {
    return ElMessage.warning('请选择病种')
  }
  if (!form.items.length) {
    return ElMessage.warning('请至少指定一个指标')
  }
  const seen = new Set()
  const empty = []
  for (const item of form.items) {
    const code = (item.indicatorCode || '').trim()
    const name = (item.indicatorName || '').trim()
    if (!code || !name) {
      empty.push(name || code || '未命名指标')
      continue
    }
    if (!/^[A-Za-z0-9_]+$/.test(code)) {
      return ElMessage.warning(`指标编码「${code}」只能包含字母、数字和下划线`)
    }
    if (seen.has(code)) {
      return ElMessage.warning(`指标编码「${code}」重复`)
    }
    seen.add(code)
  }
  if (empty.length) {
    return ElMessage.warning(`请补全指标名称与编码：${empty.join('、')}`)
  }
  step.value = 1
}

const fillRemainder = () => {
  if (!form.items.length) return
  const sum = form.items.reduce((s, i) => s + (Number(i.weight) || 0), 0)
  const last = form.items[form.items.length - 1]
  const rest = Math.round((1 - sum + (Number(last.weight) || 0)) * 100) / 100
  if (rest < 0 || rest > 1) {
    return ElMessage.warning('剩余权重超出范围，请先调整其他指标')
  }
  last.weight = rest
}

const handleSubmit = async () => {
  for (const item of form.items) {
    const weight = Number(item.weight)
    if (item.weight === null || item.weight === undefined || Number.isNaN(weight)) {
      return ElMessage.warning(`请填写指标「${item.indicatorName}」的权重`)
    }
    if (weight < 0 || weight > 1) {
      return ElMessage.warning(`指标「${item.indicatorName}」的权重必须在 0~1 之间`)
    }
  }
  if (!sumValid.value) {
    return ElMessage.warning(`该病种指标权重之和必须为 1，当前为 ${total.value.toFixed(2)}`)
  }
  submitting.value = true
  try {
    await saveWeights({
      diseaseCode: form.diseaseCode,
      items: form.items.map((i) => ({
        indicatorCode: i.indicatorCode.trim(),
        indicatorName: i.indicatorName.trim(),
        weight: Number(i.weight)
      }))
    })
    ElMessage.success('权重修改成功')
    dialogVisible.value = false
    step.value = 0
    if (!query.diseaseCode || query.diseaseCode === form.diseaseCode) {
      query.diseaseCode = form.diseaseCode
    }
    loadList()
  } finally {
    submitting.value = false
  }
}

const openEdit = async () => {
  step.value = 0
  form.diseaseCode = query.diseaseCode || '1'
  await loadDiseaseItems(form.diseaseCode)
  dialogVisible.value = true
}

/* ---------------- 病种间权重 ---------------- */
const combinedVisible = ref(false)
const combinedSubmitting = ref(false)
const combinedItems = ref([])

const combinedSum = computed(() => Math.round(combinedItems.value.reduce((s, i) => s + (Number(i.weight) || 0), 0) * 100) / 100)
const combinedValid = computed(() => Math.abs(combinedSum.value - 1) < 1e-6)
const combinedSumText = computed(() => `${combinedSum.value.toFixed(2)}${combinedValid.value ? '（符合要求）' : '（需为 1.00）'}`)

const openCombined = async () => {
  const res = await listCombinedWeights(diseases.map((d) => d.code).join(','))
  combinedItems.value = (res.data || []).map((d) => ({
    diseaseCode: d.diseaseCode,
    diseaseName: d.diseaseName || diseaseName(d.diseaseCode),
    weight: toNumber(d.weight)
  }))
  combinedVisible.value = true
}

const fillCombinedRemainder = () => {
  if (!combinedItems.value.length) return
  const sum = combinedItems.value.reduce((s, i) => s + (Number(i.weight) || 0), 0)
  const last = combinedItems.value[combinedItems.value.length - 1]
  const rest = Math.round((1 - sum + (Number(last.weight) || 0)) * 100) / 100
  if (rest < 0 || rest > 1) {
    return ElMessage.warning('剩余权重超出范围，请先调整其他病种')
  }
  last.weight = rest
}

const resetCombinedAverage = () => {
  const avg = Math.round((1 / combinedItems.value.length) * 100) / 100
  combinedItems.value.forEach((item, index) => {
    item.weight = index === combinedItems.value.length - 1
      ? Math.round((1 - avg * (combinedItems.value.length - 1)) * 100) / 100
      : avg
  })
}

const handleCombinedSubmit = async () => {
  for (const item of combinedItems.value) {
    const weight = Number(item.weight)
    if (Number.isNaN(weight) || weight < 0 || weight > 1) {
      return ElMessage.warning(`病种「${item.diseaseName}」的权重必须在 0~1 之间`)
    }
  }
  if (!combinedValid.value) {
    return ElMessage.warning(`病种权重之和必须为 1，当前为 ${combinedSum.value.toFixed(2)}`)
  }
  combinedSubmitting.value = true
  try {
    await saveCombinedWeights(combinedItems.value.map((i) => ({
      diseaseCode: i.diseaseCode,
      diseaseName: i.diseaseName,
      weight: Number(i.weight)
    })))
    ElMessage.success('病种间权重修改成功')
    combinedVisible.value = false
  } finally {
    combinedSubmitting.value = false
  }
}

onMounted(loadList)
</script>

<style scoped>
.step-card {
  min-height: 240px;
}
.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 8px 0 12px;
  font-weight: 600;
}
.hint {
  margin-top: 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
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
</style>