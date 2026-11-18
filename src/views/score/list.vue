<template>
  <div class="page-container">
    <div class="search-bar">
      <el-form :model="query" inline>
        <el-form-item label="患者">
          <PatientSelect v-model="query.patientId" width="220px" style="display:inline-block" />
        </el-form-item>
        <el-form-item label="风险等级">
          <el-select v-model="query.riskLevel" placeholder="全部" clearable style="width:120px">
            <el-option label="低危" value="1" />
            <el-option label="中危" value="2" />
            <el-option label="高危" value="3" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleQuery">搜索</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="table-card">
      <div class="table-toolbar">
        <div style="display:flex;gap:8px">
          <PatientSelect v-model="calcPatientId" width="240px" placeholder="选择患者后计算评分" />
          <el-button type="primary" @click="handleCalc">计算评分</el-button>
          <el-button :icon="Operation" @click="openBatchDialog">操作</el-button>
        </div>
      </div>
      <el-table v-loading="loading" :data="list" row-key="scoreId" border stripe>
        <el-table-column prop="scoreId" label="ID" width="70" />
        <el-table-column label="患者" width="120">
          <template #default="{ row }">
            <span v-if="row.patientName">{{ row.patientName }}</span>
            <span v-else style="color:#909399">ID:{{ row.patientId }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="totalScore" label="风险评分" width="100">
          <template #default="{ row }">
            <b :style="{ color: levelColor(row.riskLevel) }">{{ row.totalScore }}</b>
          </template>
        </el-table-column>
        <el-table-column label="风险等级" width="100">
          <template #default="{ row }">
            <el-tag :type="levelTag(row.riskLevel)" size="small">{{ levelName(row.riskLevel) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="触发来源" width="100">
          <template #default="{ row }">{{ triggerName(row.triggerType) }}</template>
        </el-table-column>
        <el-table-column label="评分明细" min-width="200">
          <template #default="{ row }">
            <div v-if="detailMap[row.scoreId]" class="detail-card" @click="openDetail(row)">
              <span class="detail-card-icon">
                <el-icon><Document /></el-icon>
              </span>
              <span class="detail-card-text">
                <span class="detail-card-title">评分明细</span>
                <span class="detail-card-sub">
                  {{ detailMap[row.scoreId].kind === 'weights' ? `${detailMap[row.scoreId].items.length} 项指标` : '异常统计' }}
                </span>
              </span>
            </div>
            <span v-else class="detail-empty">暂无明细</span>
          </template>
        </el-table-column>
        <el-table-column prop="calcTime" label="计算时间" width="170" />
      </el-table>

      <el-dialog
        v-model="batchVisible"
        title="评分记录操作"
        width="720px"
        top="8vh"
        append-to-body
        @closed="onBatchDialogClosed"
      >
        <el-alert
          type="info"
          :closable="false"
          show-icon
          title="请选择要操作的类型，并勾选需要处理的评分记录"
          style="margin-bottom:12px"
        />
        <el-form label-width="90px" style="margin-bottom:12px">
          <el-form-item label="操作类型" required>
            <el-select v-model="batchAction" style="width:220px" @change="onBatchActionChange">
              <el-option label="删除评分记录" value="delete" />
            </el-select>
          </el-form-item>
        </el-form>

        <el-table
          v-if="batchAction"
          ref="batchTableRef"
          v-loading="batchLoading"
          :data="batchList"
          row-key="scoreId"
          border
          size="small"
          height="420"
          class="batch-table"
          @selection-change="handleBatchSelection"
        >
          <el-table-column type="selection" width="48" reserve-selection />
          <el-table-column prop="scoreId" label="ID" width="70" />
          <el-table-column label="患者" width="110">
            <template #default="{ row }">{{ row.patientName || `ID:${row.patientId}` }}</template>
          </el-table-column>
          <el-table-column prop="totalScore" label="风险评分" width="90" align="right" />
          <el-table-column label="风险等级" width="90">
            <template #default="{ row }">
              <el-tag :type="levelTag(row.riskLevel)" size="small">{{ levelName(row.riskLevel) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="calcTime" label="计算时间" min-width="150" />
        </el-table>
        <div v-if="batchAction" class="batch-scroll-tip">
          <span>共 {{ batchTotal }} 条记录</span>
          <span v-if="batchLoadingMore">加载中…</span>
          <span v-else-if="batchList.length >= batchTotal">已全部加载，可上下滚动查看</span>
          <span v-else>向下滚动继续加载</span>
        </div>

        <template #footer>
          <div class="batch-footer">
            <span class="batch-count">已选 <b>{{ batchSelection.length }}</b> 条</span>
            <div>
              <el-button @click="batchVisible = false">取消</el-button>
              <el-button
                type="danger"
                :disabled="!batchSelection.length"
                :loading="batchDeleting"
                @click="handleBatchDelete"
              >
                删除
              </el-button>
            </div>
          </div>
        </template>
      </el-dialog>

      <el-dialog
        v-model="detailVisible"
        :title="'评分明细 · 记录 #' + (currentRow ? currentRow.scoreId : '')"
        width="820px"
        top="8vh"
        append-to-body
      >
        <div v-if="currentDetail" class="detail-body">
          <div class="detail-head">
            <div class="detail-subject">
              <span class="detail-patient">{{ currentRow.patientName || `患者ID:${currentRow.patientId}` }}</span>
              <el-tag :type="levelTag(currentRow.riskLevel)" size="small">{{ levelName(currentRow.riskLevel) }}</el-tag>
            </div>
            <div class="detail-meta">
              <div class="meta-item">
                <span class="meta-label">风险评分</span>
                <span class="meta-value num" :style="{ color: levelColor(currentRow.riskLevel) }">{{ currentRow.totalScore }} 分</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">触发来源</span>
                <span class="meta-value">{{ triggerName(currentRow.triggerType) }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">计算时间</span>
                <span class="meta-value">{{ currentRow.calcTime || '-' }}</span>
              </div>
            </div>
          </div>

          <template v-if="currentDetail.kind === 'weights'">
            <el-table :data="currentDetail.items" border size="small" class="detail-table">
              <el-table-column label="指标" min-width="150">
                <template #default="{ row: item }">
                  <span class="indicator-name">{{ item.indicatorName || item.indicatorCode }}</span>
                  <span class="indicator-code">{{ item.indicatorCode }}</span>
                </template>
              </el-table-column>
              <el-table-column label="实测值" width="130" align="right">
                <template #default="{ row: item }">
                  <span class="num">{{ formatNumber(item.value) }}</span>
                  <span v-if="item.unit" class="unit">{{ item.unit }}</span>
                </template>
              </el-table-column>
              <el-table-column label="风险度" width="110" align="right">
                <template #default="{ row: item }">
                  <span class="num">{{ formatPercent(item.riskScore) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="权重" width="110" align="right">
                <template #default="{ row: item }">
                  <span class="num">{{ formatPercent(item.weight) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="加权风险贡献" width="150" align="right">
                <template #default="{ row: item }">
                  <span class="num">{{ formatPercent(item.riskScore * item.weight) }}</span>
                </template>
              </el-table-column>
            </el-table>
            <div class="detail-foot">
              风险度 = 该指标偏离正常区间的程度；加权风险贡献 = 风险度 × 权重。各项贡献之和（乘以 100）即为本次评分
              <b class="num">{{ currentRow.totalScore }}</b> 分。
            </div>
          </template>

          <template v-else>
            <el-row :gutter="12" class="summary-row">
              <el-col v-for="card in currentDetail.cards" :key="card.label" :span="8">
                <div class="summary-card">
                  <div class="summary-label">{{ card.label }}</div>
                  <div class="summary-value num">{{ card.value }}</div>
                </div>
              </el-col>
            </el-row>
            <el-table :data="currentDetail.items" border size="small" class="detail-table">
              <el-table-column label="异常分类" min-width="180">
                <template #default="{ row: item }">
                  <span>{{ item.name }}</span>
                  <el-tag v-if="item.level" size="small" :type="levelTag(item.level)" style="margin-left:6px">{{ levelName(item.level) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="数量" width="100" align="right">
                <template #default="{ row: item }"><span class="num">{{ item.count }}</span></template>
              </el-table-column>
              <el-table-column label="占异常总数比例" min-width="240">
                <template #default="{ row: item }">
                  <el-progress :percentage="item.ratio" :stroke-width="10" />
                </template>
              </el-table-column>
            </el-table>
          </template>
        </div>
        <template #footer>
          <el-button @click="detailVisible = false">关闭</el-button>
        </template>
      </el-dialog>

      <div class="pagination-wrap">
        <el-pagination v-model:current-page="query.pageNum" v-model:page-size="query.pageSize"
          :page-sizes="[10, 20, 50]" :total="total" layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadList" @current-change="loadList" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Document, Operation } from '@element-plus/icons-vue'
import PatientSelect from '@/components/PatientSelect.vue'
import { listScore, calcScore, deleteScores } from '@/api/score'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const calcPatientId = ref(null)
const detailVisible = ref(false)
const currentRow = ref(null)
const currentDetail = ref(null)
const detailMap = ref({})

const query = reactive({ pageNum: 1, pageSize: 10, patientId: null, riskLevel: '' })

const levelTag = (l) => ({ 1: 'success', 2: 'warning', 3: 'danger' }[l] || 'info')
const levelName = (l) => ({ 1: '低危', 2: '中危', 3: '高危' }[l] || '-')
const levelColor = (l) => ({ 1: '#67c23a', 2: '#e6a23c', 3: '#f56c6c' }[l] || '#909399')
const triggerName = (t) => ({ 1: '监测触发', 2: '干预触发', 3: '手动计算' }[t] || '-')

const formatNumber = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? '-' : String(v))
const formatPercent = (v) => (v === null || v === undefined || Number.isNaN(Number(v)) ? '-' : `${(Number(v) * 100).toFixed(1)}%`)

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const pickNumber = (obj, key) => {
  const v = obj[key]
  return v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v)
}

const buildSummaryDetail = (json) => {
  const total = pickNumber(json, 'total')
  const abnormal = pickNumber(json, 'abnormal')
  const abnormalRate = pickNumber(json, 'abnormalRate')
  const levels = [
    { key: 'level3', level: '3', name: '高危异常' },
    { key: 'level2', level: '2', name: '中危异常' },
    { key: 'level1', level: '1', name: '低危异常' }
  ].map(({ key, level, name }) => ({ name, level, count: pickNumber(json, key) }))
    .filter((item) => item.count !== null)

  const cards = [
    { label: '监测总数', value: total === null ? '-' : `${total} 次` },
    { label: '异常次数', value: abnormal === null ? '-' : `${abnormal} 次` },
    { label: '异常发生率', value: abnormalRate === null ? '-' : `${(abnormalRate * 100).toFixed(1)}%` }
  ]

  const items = levels.map((item) => ({
    ...item,
    ratio: abnormal ? Math.round((item.count / abnormal) * 1000) / 10 : 0
  }))

  return { kind: 'summary', cards, items }
}

const parseDetail = (detailJson) => {
  if (!detailJson) return null
  let json
  try {
    json = typeof detailJson === 'string' ? JSON.parse(detailJson) : detailJson
  } catch (e) {
    return null
  }
  if (!isObject(json)) return null

  const entries = Object.entries(json)
  const weightItems = entries.filter(([, v]) => isObject(v) && 'indicatorCode' in v)
  if (weightItems.length) {
    return {
      kind: 'weights',
      items: weightItems.map(([code, v]) => ({
        indicatorCode: v.indicatorCode || code,
        indicatorName: v.indicatorName || '',
        value: v.value,
        unit: v.unit || '',
        riskScore: Number(v.riskScore) || 0,
        weight: Number(v.weight) || 0
      }))
    }
  }

  if ('total' in json || 'abnormal' in json || 'abnormalRate' in json || 'level1' in json || 'level2' in json || 'level3' in json) {
    return buildSummaryDetail(json)
  }

  return null
}

const openDetail = (row) => {
  currentRow.value = row
  currentDetail.value = detailMap.value[row.scoreId] || null
  detailVisible.value = true
}

const loadList = async () => {
  loading.value = true
  try {
    const res = await listScore(query)
    list.value = res.data.rows
    total.value = res.data.total
    const nextMap = {}
    list.value.forEach((row) => {
      const parsed = parseDetail(row.detailJson)
      if (parsed) nextMap[row.scoreId] = parsed
    })
    detailMap.value = nextMap
    detailVisible.value = false
  } finally {
    loading.value = false
  }
}

const handleQuery = () => { query.pageNum = 1; loadList() }
const resetQuery = () => {
  Object.assign(query, { pageNum: 1, pageSize: 10, patientId: null, riskLevel: '' })
  loadList()
}

const batchVisible = ref(false)
const batchAction = ref('')
const batchTableRef = ref()
const batchSelection = ref([])
const batchDeleting = ref(false)
const batchList = ref([])
const batchTotal = ref(0)
const batchLoading = ref(false)
const batchLoadingMore = ref(false)
const batchPageNum = ref(1)
const batchPageSize = 50

const batchQueryParams = () => ({ patientId: query.patientId, riskLevel: query.riskLevel })

const loadBatchPage = async (page, append) => {
  batchPageNum.value = page
  if (append) batchLoadingMore.value = true
  else batchLoading.value = true
  try {
    const res = await listScore({ ...batchQueryParams(), pageNum: page, pageSize: batchPageSize })
    const rows = res.data.rows || []
    batchTotal.value = res.data.total || 0
    batchList.value = append ? [...batchList.value, ...rows] : rows
    if (!append) {
      await nextTick()
      bindBatchScroll()
    }
  } finally {
    batchLoading.value = false
    batchLoadingMore.value = false
  }
}

const loadMoreBatch = () => {
  if (batchLoading.value || batchLoadingMore.value) return
  if (batchList.value.length >= batchTotal.value) return
  loadBatchPage(batchPageNum.value + 1, true)
}

/** 监听表格内部滚动容器，滚动到底部附近时自动加载下一页 */
let batchScrollEl = null
const onBatchScroll = () => {
  if (!batchScrollEl) return
  const remain = batchScrollEl.scrollHeight - batchScrollEl.scrollTop - batchScrollEl.clientHeight
  if (remain < 60) loadMoreBatch()
}

const bindBatchScroll = () => {
  const el = batchTableRef.value?.$el
  const body = el?.querySelector('.el-scrollbar__wrap')
    || el?.querySelector('.el-table__body-wrapper .el-scrollbar__wrap')
    || el?.querySelector('.el-table__body-wrapper')
  if (!body || body === batchScrollEl) return
  unbindBatchScroll()
  batchScrollEl = body
  batchScrollEl.addEventListener('scroll', onBatchScroll)
}

const unbindBatchScroll = () => {
  if (batchScrollEl) {
    batchScrollEl.removeEventListener('scroll', onBatchScroll)
    batchScrollEl = null
  }
}

const onBatchDialogClosed = () => {
  unbindBatchScroll()
  batchSelection.value = []
  batchTableRef.value?.clearSelection()
}

const onBatchActionChange = (val) => {
  if (!val) return
  batchList.value = []
  batchTotal.value = 0
  loadBatchPage(1, false)
}

const openBatchDialog = async () => {
  batchAction.value = 'delete'
  batchSelection.value = []
  batchList.value = []
  batchTotal.value = 0
  batchPageNum.value = 1
  batchVisible.value = true
  await loadBatchPage(1, false)
  batchTableRef.value?.clearSelection()
}

const handleBatchSelection = (rows) => {
  batchSelection.value = rows
}

const handleBatchDelete = async () => {
  if (!batchSelection.value.length) {
    ElMessage.warning('请先勾选要删除的评分记录')
    return
  }
  const ids = batchSelection.value.map((row) => row.scoreId)
  try {
    await ElMessageBox.confirm(
      `确定删除选中的 ${ids.length} 条评分记录吗？删除后不可恢复。`,
      '批量删除',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消', confirmButtonClass: 'el-button--danger' }
    )
  } catch (e) {
    return
  }
  batchDeleting.value = true
  try {
    await deleteScores(ids)
    ElMessage.success(`已删除 ${ids.length} 条评分记录`)
    batchSelection.value = []
    await loadBatchPage(1, false)
    if (currentRow.value && ids.includes(currentRow.value.scoreId)) {
      detailVisible.value = false
    }
    if (list.value.length === ids.length && query.pageNum > 1) {
      query.pageNum -= 1
    }
    loadList()
  } finally {
    batchDeleting.value = false
  }
}

const handleCalc = async () => {
  if (!calcPatientId.value) {
    ElMessage.warning('请选择患者')
    return
  }
  const res = await calcScore(calcPatientId.value)
  ElMessage.success(`计算完成：${res.data.totalScore} 分（${res.data.riskLevelName}）`)
  loadList()
}

onMounted(loadList)
</script>

<style scoped>
.batch-table {
  width: 100%;
}
:deep(.batch-table .el-table__body-wrapper) {
  overflow-y: auto;
}
.batch-scroll-tip {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 12px;
  color: var(--t-dim);
}
.batch-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.batch-count {
  font-size: 13px;
  color: var(--t-sub);
}
.batch-count b {
  color: var(--el-color-primary);
}
.detail-card {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 180px;
  padding: 6px 10px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  background: var(--el-color-primary-light-9);
  cursor: pointer;
  user-select: none;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}
.detail-card:hover {
  border-color: var(--el-color-primary-light-5);
  background: var(--el-color-primary-light-8);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.12);
}
.detail-card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex: none;
  border-radius: 6px;
  background: var(--el-color-primary);
  color: #fff;
  font-size: 13px;
}
.detail-card-text {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  line-height: 1.3;
}
.detail-card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--t-main);
}
.detail-card-sub {
  font-size: 11px;
  color: var(--t-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.detail-empty {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}
.detail-body {
  padding: 0 2px;
}
.detail-subject {
  display: flex;
  align-items: center;
  gap: 8px;
}
.detail-patient {
  font-size: 15px;
  font-weight: 600;
  color: var(--t-main);
}
.detail-meta {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}
.meta-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.meta-label {
  font-size: 12px;
  color: var(--t-dim);
}
.meta-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--t-main);
}
.detail-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.detail-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--t-main);
}
.detail-record {
  margin-left: 8px;
  font-size: 12px;
  font-weight: normal;
  color: var(--t-dim);
}
.detail-sub {
  font-size: 12px;
  color: var(--t-sub);
}
.detail-table {
  background: #fff;
}
.indicator-name {
  font-weight: 600;
}
.indicator-code {
  margin-left: 8px;
  font-size: 12px;
  color: var(--t-dim);
}
.num {
  font-variant-numeric: tabular-nums;
}
.unit {
  margin-left: 4px;
  font-size: 12px;
  color: var(--t-dim);
}
.detail-foot {
  margin-top: 10px;
  font-size: 12px;
  color: var(--t-sub);
}
.summary-row {
  margin-bottom: 12px;
}
.summary-card {
  padding: 12px 16px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background: #fff;
}
.summary-label {
  font-size: 12px;
  color: var(--t-dim);
}
.summary-value {
  margin-top: 6px;
  font-size: 20px;
  font-weight: 600;
  color: var(--t-main);
}
</style>
