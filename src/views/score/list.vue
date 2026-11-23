<template>
  <div class="page-container">
    <div class="search-bar">
      <el-form :model="query" inline>
        <el-form-item label="患者">
          <PatientSelect v-model="query.patientId" width="220px" style="display:inline-block" />
        </el-form-item>

        <el-form-item label="健康等级">
          <el-select v-model="query.riskLevel" placeholder="全部" clearable style="width:120px">
            <el-option label="较差" value="1" />
            <el-option label="一般" value="2" />
            <el-option label="良好" value="3" />
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
        <el-table-column label="健康评分" width="100">
          <template #default="{ row }">
            <b :style="{ color: levelColor(healthLevel(row)) }">{{ row.healthScore ?? '-' }}</b>
          </template>
        </el-table-column>

        <el-table-column label="健康等级" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.healthScore !== null && row.healthScore !== undefined" :type="levelTag(healthLevel(row))" size="small">
              {{ levelName(healthLevel(row)) }}
            </el-tag>
            <span v-else>-</span>
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
                  {{ detailSummary(row) }}
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
          :type="batchAction === 'calc' ? 'success' : 'info'"
          :closable="false"
          show-icon
          :title="batchAction === 'calc' ? '选择患者后为其计算最新健康评分（按近 7 天数据与患者权重）' : '请选择要操作的类型，并勾选需要处理的评分记录'"
          style="margin-bottom:12px"
        />
        <el-form label-width="90px" style="margin-bottom:12px">
          <el-form-item label="操作类型" required>
            <el-select v-model="batchAction" style="width:220px" @change="onBatchActionChange">
              <el-option label="计算评分" value="calc" />
              <el-option label="删除评分记录" value="delete" />
            </el-select>
          </el-form-item>
        </el-form>

        <div v-if="batchAction === 'calc'" class="batch-table-wrap">
          <el-table
            ref="calcTableRef"
            v-loading="calcLoading"
            :data="calcList"
            row-key="patientId"
            border
            size="small"
            height="420"
            class="batch-table"
            @selection-change="handleCalcSelection"
          >
            <el-table-column type="selection" width="48" reserve-selection />
            <el-table-column prop="patientNo" label="患者编号" width="120" />
            <el-table-column label="患者" width="110">
              <template #default="{ row }">{{ row.name || `ID:${row.patientId}` }}</template>
            </el-table-column>
            <el-table-column prop="phone" label="手机号" width="130" />
            <el-table-column label="当前健康分" width="120">
              <template #default="{ row }">
                <span v-if="row.healthScore !== null && row.healthScore !== undefined" class="calc-score num">{{ row.healthScore }}</span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="计算状态" min-width="200">
              <template #default="{ row }">
                <template v-if="calcResult[row.patientId]">
                  <el-tag v-if="calcResult[row.patientId].status === 'ok'" :type="levelTag(calcResult[row.patientId].healthLevel)" size="small">
                    {{ levelName(calcResult[row.patientId].healthLevel) }}
                  </el-tag>
                  <span v-if="calcResult[row.patientId].status === 'ok'" class="calc-score num" :style="{ color: levelColor(calcResult[row.patientId].healthLevel) }">
                    {{ calcResult[row.patientId].healthScore }} 分
                  </span>
                  <span v-else-if="calcResult[row.patientId].status === 'fail'" class="calc-error">{{ calcResult[row.patientId].message }}</span>
                  <span v-else class="calc-waiting">计算中…</span>
                </template>
                <span v-else class="calc-waiting">未计算</span>
              </template>
            </el-table-column>
          </el-table>
          <div class="batch-scroll-tip">
            <span>共 {{ calcList.length }} 位患者</span>
            <span>勾选患者后点击右下角「开始计算」，将按近 7 天数据与患者权重重新计算</span>
          </div>
        </div>

        <el-table
          v-if="batchAction === 'delete'"
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
          <el-table-column prop="healthScore" label="健康评分" width="100" align="right" />
          <el-table-column label="健康等级" width="90">
            <template #default="{ row }">
              <el-tag v-if="row.healthScore !== null && row.healthScore !== undefined" :type="levelTag(healthLevel(row))" size="small">
                {{ levelName(healthLevel(row)) }}
              </el-tag>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="calcTime" label="计算时间" min-width="150" />
        </el-table>
        <div v-if="batchAction === 'delete'" class="batch-scroll-tip">
          <span>共 {{ batchTotal }} 条记录</span>
          <span v-if="batchLoadingMore">加载中…</span>
          <span v-else-if="batchList.length >= batchTotal">已全部加载，可上下滚动查看</span>
          <span v-else>向下滚动继续加载</span>
        </div>

        <template #footer>
          <div class="batch-footer">
            <span v-if="batchAction === 'delete'" class="batch-count">已选 <b>{{ batchSelection.length }}</b> 条</span>
            <span v-else class="batch-count">已选 <b>{{ calcSelection.length }}</b> 位患者</span>
            <div>
              <el-button @click="batchVisible = false">取消</el-button>
              <el-button
                v-if="batchAction === 'delete'"
                type="danger"
                :disabled="!batchSelection.length"
                :loading="batchDeleting"
                @click="handleBatchDelete"
              >
                删除
              </el-button>
              <el-button
                v-else
                type="primary"
                :disabled="!calcSelection.length"
                :loading="calcRunning"
                @click="handleBatchCalc"
              >
                开始计算
              </el-button>
            </div>
          </div>
        </template>
      </el-dialog>

      <el-dialog
        v-model="detailVisible"
        :title="'健康评分明细 · 记录 #' + (currentRow ? currentRow.scoreId : '')"
        width="820px"
        top="8vh"
        append-to-body
      >
        <div v-if="currentDetail" class="detail-body">
          <div class="detail-head">
            <div class="detail-subject">
              <span class="detail-patient">{{ currentRow.patientName || `患者ID:${currentRow.patientId}` }}</span>
              <el-tag v-if="currentRow.healthScore !== null && currentRow.healthScore !== undefined" :type="levelTag(healthLevel(currentRow))" size="small">
                {{ levelName(healthLevel(currentRow)) }}
              </el-tag>
            </div>
            <div class="detail-meta">
              <div class="meta-item">
                <span class="meta-label">健康评分</span>
                <span class="meta-value num" :style="{ color: levelColor(healthLevel(currentRow)) }">{{ currentRow.healthScore ?? '-' }} 分</span>
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
          </div>          <template v-if="currentDetail.kind === 'health'">
            <el-table :data="currentDetail.items" border size="small" class="detail-table">
              <el-table-column label="分项" min-width="180">
                <template #default="{ row: item }">
                  <span class="indicator-name">{{ item.name }}</span>
                  <span class="indicator-code">{{ item.formula }}</span>
                </template>
              </el-table-column>
              <el-table-column label="得分率" width="100" align="right">
                <template #default="{ row: item }">
                  <span class="num">{{ formatPercent(item.value) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="权重" width="100" align="right">
                <template #default="{ row: item }">
                  <span class="num">{{ formatPercent(item.weight) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="加权贡献" width="100" align="right">
                <template #default="{ row: item }">
                  <el-progress :percentage="Math.round((item.contribution || 0) * 1000) / 10" :stroke-width="8" />
                </template>
              </el-table-column>
              <el-table-column label="说明" min-width="220">
                <template #default="{ row: item }">
                  <span class="detail-sub">{{ item.desc || '-' }}</span>
                </template>
              </el-table-column>
            </el-table>

            <div class="score-formula">
              <span>计算口径：</span>
              <span>指标达标率 <b class="num">{{ formatPercent(currentDetail.indicatorRate) }}</b></span>
              <span>用药依从率 <b class="num">{{ formatPercent(currentDetail.medicationRate) }}</b></span>
              <span>预警密度 <b class="num">{{ formatPercent(currentDetail.alertDensity) }}</b></span>
              <span>检测完成率 <b class="num">{{ formatPercent(currentDetail.monitorRate) }}</b></span>
            </div>
            <div class="detail-foot">
              健康分 = (w1·达标率 + w2·依从率 + w3·(1−预警密度) + w4·检测完成率) × 100，取近 7 天数据；指标本周未测记 0，预警密度按有数据的天数计算。
              本次为 <b class="num">{{ currentRow.healthScore ?? '-' }}</b> 分。
            </div>
            <template v-if="currentDetail.missingIndicators && currentDetail.missingIndicators.length">
              <div class="warning-hit-title">本周未测指标（记 0）</div>
              <div class="warning-hit-item">
                <el-tag v-for="name in currentDetail.missingIndicators" :key="name" size="small" type="info" style="margin-right:6px">{{ name }}</el-tag>
              </div>
            </template>
            <template v-if="currentDetail.alertDays || currentDetail.medicationLate || currentDetail.medicationMissed">
              <div class="warning-hit-title">用药与预警概况</div>
              <div class="warning-hit-item">
                <span>按时 {{ currentDetail.medicationOnTime || 0 }} 次</span>
                <span>迟服 {{ currentDetail.medicationLate || 0 }} 次</span>
                <span>漏服 {{ currentDetail.medicationMissed || 0 }} 次</span>
                <span>有数据 {{ currentDetail.measuredDays || 0 }} 天，其中 {{ currentDetail.alertDays || 0 }} 天出现中危及以上预警</span>
              </div>
            </template>
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
import { listPatient } from '@/api/patient'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const calcPatientId = ref(null)
const detailVisible = ref(false)
const currentRow = ref(null)
const currentDetail = ref(null)
const detailMap = ref({})

const query = reactive({ pageNum: 1, pageSize: 10, patientId: null, riskLevel: '' })

/** 等级：3 良好 / 2 一般 / 1 较差 */
const levelTag = (l) => ({ 3: 'success', 2: 'warning', 1: 'danger' }[l] || 'info')
const levelName = (l) => ({ 3: '良好', 2: '一般', 1: '较差' }[l] || '-')
const levelColor = (l) => ({ 3: '#67c23a', 2: '#e6a23c', 1: '#f56c6c' }[l] || '#909399')
const triggerName = (t) => ({ 1: '监测触发', 2: '干预触发', 3: '手动计算' }[t] || '-')

/** 由健康分换算等级 */
const healthLevel = (row) => {
  const v = row ? row.healthScore : null
  if (v === null || v === undefined) return ''
  return Number(v) >= 80 ? '3' : (Number(v) >= 50 ? '2' : '1')
}

const formatNumber = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? '-' : String(v))
const formatPercent = (v) => (v === null || v === undefined || Number.isNaN(Number(v)) ? '-' : `${(Number(v) * 100).toFixed(1)}%`)

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const pickNumber = (obj, key) => {
  const v = obj[key]
  return v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v)
}

/** 旧记录（异常统计格式） */
const buildSummaryDetail = (json) => {
  const totalCount = pickNumber(json, 'total')
  const abnormal = pickNumber(json, 'abnormal')
  const abnormalRate = pickNumber(json, 'abnormalRate')
  const levels = [
    { key: 'level3', name: '高危异常' },
    { key: 'level2', name: '中危异常' },
    { key: 'level1', name: '低危异常' }
  ].map(({ key, name }) => ({ name, count: pickNumber(json, key) }))
    .filter((item) => item.count !== null)

  const cards = [
    { label: '监测总数', value: totalCount === null ? '-' : `${totalCount} 次` },
    { label: '异常次数', value: abnormal === null ? '-' : `${abnormal} 次` },
    { label: '异常发生率', value: abnormalRate === null ? '-' : `${(abnormalRate * 100).toFixed(1)}%` }
  ]

  const items = levels.map((item) => ({
    ...item,
    ratio: abnormal ? Math.round((item.count / abnormal) * 1000) / 10 : 0
  }))

  return { kind: 'summary', cards, items }
}

/** 健康分明细：四个分项 */
const buildHealthDetail = (json) => {
  const items = Array.isArray(json.items)
    ? json.items.map((item) => ({
      code: item.code,
      name: item.name,
      formula: item.formula,
      value: Number(item.value) || 0,
      weight: Number(item.weight) || 0,
      contribution: Number(item.contribution) || 0,
      desc: item.desc
    }))
    : []
  return {
    kind: 'health',
    items,
    indicatorRate: pickNumber(json, 'indicatorRate'),
    medicationRate: pickNumber(json, 'medicationRate'),
    alertDensity: pickNumber(json, 'alertDensity'),
    monitorRate: pickNumber(json, 'monitorRate'),
    alertDays: pickNumber(json, 'alertDays'),
    measuredDays: pickNumber(json, 'measuredDays'),
    medicationOnTime: pickNumber(json, 'medicationOnTime'),
    medicationLate: pickNumber(json, 'medicationLate'),
    medicationMissed: pickNumber(json, 'medicationMissed'),
    missingIndicators: Array.isArray(json.missingIndicators) ? json.missingIndicators : []
  }
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
  if (Array.isArray(json.items) && json.items.length && json.items[0] && json.items[0].formula) {
    return buildHealthDetail(json)
  }
  if ('total' in json || 'abnormal' in json || 'abnormalRate' in json || 'level1' in json || 'level2' in json || 'level3' in json) {
    return buildSummaryDetail(json)
  }
  return null
}

/** 主列表摘要文案 */
const detailSummary = (row) => {
  const d = detailMap.value[row.scoreId]
  if (!d) return ''
  if (d.kind !== 'health') return '经典异常统计'
  return `达标率 ${formatPercent(d.indicatorRate)} · 依从率 ${formatPercent(d.medicationRate)} · 完成率 ${formatPercent(d.monitorRate)}`
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
const calcTableRef = ref()
const calcList = ref([])
const calcSelection = ref([])
const calcResult = ref({})
const calcLoading = ref(false)
const calcRunning = ref(false)

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
  if (!body) return
  unbindBatchScroll()
  batchScrollEl = body
  batchScrollEl.addEventListener('scroll', onBatchScroll, { passive: true })
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

const resetCalcPanel = () => {
  calcSelection.value = []
  calcResult.value = {}
  calcList.value = []
}

const loadCalcPatients = async () => {
  calcLoading.value = true
  try {
    const res = await listPatient({ pageNum: 1, pageSize: 500 })
    calcList.value = res.data.rows || []
    await nextTick()
    calcTableRef.value?.clearSelection()
  } finally {
    calcLoading.value = false
  }
}

const handleCalcSelection = (rows) => {
  calcSelection.value = rows
}

const onBatchActionChange = (val) => {
  if (!val) return
  batchSelection.value = []
  resetCalcPanel()
  if (val === 'calc') {
    unbindBatchScroll()
    batchList.value = []
    batchTotal.value = 0
    loadCalcPatients()
    return
  }
  batchList.value = []
  batchTotal.value = 0
  loadBatchPage(1, false)
}

const openBatchDialog = async () => {
  batchAction.value = 'delete'
  batchSelection.value = []
  resetCalcPanel()
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
  const ids = batchSelection.value.map((r) => r.scoreId)
  if (!ids.length) return
  try {
    await ElMessageBox.confirm(`确认删除选中的 ${ids.length} 条评分记录？`, '提示', { type: 'warning' })
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

const handleBatchCalc = async () => {
  if (!calcSelection.value.length) {
    ElMessage.warning('请先勾选要计算评分的患者')
    return
  }
  const rows = calcSelection.value.slice()
  const results = { ...calcResult.value }
  rows.forEach((row) => { results[row.patientId] = { status: 'pending' } })
  calcResult.value = results
  calcRunning.value = true
  let success = 0
  let failed = 0
  try {
    for (const row of rows) {
      try {
        const res = await calcScore(row.patientId)
        const score = res.data.healthScore
        const level = score >= 80 ? '3' : (score >= 50 ? '2' : '1')
        results[row.patientId] = {
          status: 'ok',
          healthScore: score,
          healthLevel: level,
          healthLevelName: levelName(level)
        }
        row.healthScore = score
        success += 1
      } catch (e) {
        results[row.patientId] = { status: 'fail', message: e?.message || '计算失败' }
        failed += 1
      }
      calcResult.value = { ...results }
    }
    if (success) {
      ElMessage.success(`已完成 ${success} 位患者的健康评分计算${failed ? `，${failed} 位失败` : ''}`)
      loadList()
      await loadCalcPatients()
      // 重新勾选刚计算过的患者，便于查看结果
      await nextTick()
      rows.forEach((row) => {
        const target = calcList.value.find((item) => item.patientId === row.patientId)
        if (target) calcTableRef.value?.toggleRowSelection(target, true)
      })
    }
  } finally {
    calcRunning.value = false
  }
}

const handleCalc = async () => {
  if (!calcPatientId.value) {
    ElMessage.warning('请选择患者')
    return
  }
  const res = await calcScore(calcPatientId.value)
  const level = res.data.healthLevel || (res.data.healthScore >= 80 ? '3' : (res.data.healthScore >= 50 ? '2' : '1'))
  ElMessage.success(`健康评分计算完成：${res.data.healthScore} 分（${levelName(level)}）`)
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
.batch-table-wrap {
  margin-bottom: 8px;
}
.calc-score {
  margin: 0 8px;
  font-weight: 600;
}
.calc-error {
  color: var(--el-color-danger);
  font-size: 12px;
}
.calc-waiting {
  color: var(--t-dim);
  font-size: 12px;
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
  max-width: 260px;
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
.score-formula {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--t-sub);
  background: var(--el-fill-color-light);
  border-radius: 4px;
}
.detail-foot {
  margin-top: 10px;
  font-size: 12px;
  color: var(--t-sub);
}
.warning-hit-title {
  margin: 10px 0 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--t-main);
}
.warning-hit-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
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