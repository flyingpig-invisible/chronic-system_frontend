<template>
  <div class="page-container">
    <div class="search-bar">
      <el-form :model="query" inline>
        <el-form-item label="患者">
          <PatientSelect v-model="query.patientId" width="220px" style="display:inline-block" />
        </el-form-item>
        <el-form-item label="指标">
          <el-select v-model="query.indicatorCode" placeholder="全部" clearable style="width:130px">
            <el-option v-for="i in indicators" :key="i.indicatorCode" :label="i.indicatorName" :value="i.indicatorCode" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.abnormalFlag" placeholder="全部" clearable style="width:110px">
            <el-option label="正常" value="0" />
            <el-option label="异常" value="1" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间">
          <el-date-picker v-model="timeRange" type="datetimerange" value-format="YYYY-MM-DD HH:mm:ss"
            start-placeholder="开始时间" end-placeholder="结束时间" style="width:360px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleQuery">搜索</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="table-card">
      <div class="table-toolbar">
        <div>
          <el-button v-permission="['chronic:measure:add']" type="primary" :icon="Plus" @click="openAdd">录入监测</el-button>
          <span class="toolbar-tip">共 {{ total }} 次测量，每次测量一张表格</span>
        </div>
      </div>

      <el-empty v-if="!loading && !groups.length" description="暂无监测数据" />

      <div v-loading="loading" class="group-list">
        <div v-for="g in groups" :key="g.groupKey" class="measure-group">
          <div class="group-head">
            <div class="group-title">
              <span class="patient-name">{{ g.patientName }}</span>
              <span class="measure-time">{{ g.measureTime }}</span>
              <el-tag size="small" type="info">{{ g.dataSource === '1' ? '设备采集' : '手动录入' }}</el-tag>
              <el-tag v-if="g.hasAbnormal" size="small" type="danger">
                异常 {{ g.abnormalCount }} 项
              </el-tag>
              <el-tag v-else size="small" type="success">全部正常</el-tag>
            </div>
            <el-button v-permission="['chronic:measure:remove']" type="danger" link size="small"
              @click="handleDeleteGroup(g)">删除本次</el-button>
          </div>

          <table class="measure-table">
            <thead>
              <tr>
                <th style="width:180px">指标</th>
                <th style="width:180px">数值</th>
                <th style="width:120px">单位</th>
                <th style="width:120px">状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="it in g.items" :key="it.indicatorCode" :class="{ 'row-abnormal': it.abnormalFlag === '1' }">
                <td class="cell-name">{{ it.indicatorName }}</td>
                <td class="cell-value">
                  <span v-if="it.value !== null && it.value !== undefined">{{ it.value }}</span>
                  <span v-else class="not-entered">未录入</span>
                </td>
                <td class="cell-unit">{{ it.unit }}</td>
                <td class="cell-status">
                  <el-tag v-if="it.abnormalFlag === '1'" size="small" type="danger">异常</el-tag>
                  <el-tag v-else-if="it.abnormalFlag === '0'" size="small" type="success">正常</el-tag>
                  <span v-else class="not-entered">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="pagination-wrap">
        <el-pagination v-model:current-page="query.pageNum" v-model:page-size="query.pageSize"
          :page-sizes="[5, 10, 20, 50]" :total="total" layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadList" @current-change="loadList" />
      </div>
    </div>

    <el-dialog v-model="dialogVisible" title="录入监测数据（可一次录入多个指标）" width="640px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="患者" prop="patientId">
          <PatientSelect v-model="form.patientId" />
        </el-form-item>
        <el-form-item label="病种" prop="diseaseCode">
          <el-select v-model="form.diseaseCode" style="width:100%">
            <el-option label="高血压" value="1" />
            <el-option label="糖尿病" value="2" />
            <el-option label="冠心病" value="3" />
            <el-option label="慢阻肺" value="4" />
          </el-select>
        </el-form-item>
        <el-form-item label="指标" required>
          <div class="entry-list">
            <div v-for="(e, idx) in form.entries" :key="idx" class="entry-row">
              <el-select v-model="e.indicatorCode" filterable placeholder="选择指标" style="width:180px"
                @change="() => onEntryChange(e)">
                <el-option v-for="i in indicators" :key="i.indicatorCode" :label="i.indicatorName"
                  :value="i.indicatorCode" :disabled="isUsed(i.indicatorCode, idx)" />
              </el-select>
              <el-input-number v-model="e.value" :precision="2" :step="unitOf(e) === '小时' ? 0.5 : 1"
                :min="0" :max="unitOf(e) === '小时' ? 24 : undefined" placeholder="数值" style="width:130px" />
              <span class="entry-unit">{{ unitOf(e) || '单位' }}</span>
              <el-button type="danger" link :icon="Delete" :disabled="form.entries.length <= 1"
                @click="removeEntry(idx)" />
            </div>
            <el-button type="primary" link :icon="Plus" :disabled="indicators.length <= form.entries.length"
              @click="addEntry">添加指标</el-button>
          </div>
        </el-form-item>
        <el-form-item label="测量时间">
          <el-date-picker v-model="form.measureTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width:100%" />
        </el-form-item>
        <el-form-item label="数据来源">
          <el-radio-group v-model="form.dataSource">
            <el-radio value="2">手动录入</el-radio>
            <el-radio value="1">设备采集</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus, Delete } from '@element-plus/icons-vue'
import { listMeasureGrouped, addMeasureOnce, delMeasureGroup } from '@/api/measure'
import { indicatorOptions } from '@/api/system'

const loading = ref(false)
const groups = ref([])
const total = ref(0)
const dialogVisible = ref(false)
const formRef = ref()
const timeRange = ref([])

// 指标只能从指标字典（sys_indicator）中选择，页面本身不再写死任何指标
const indicators = ref([])

const query = reactive({
  pageNum: 1, pageSize: 10, patientId: null,
  indicatorCode: '', abnormalFlag: '', beginTime: '', endTime: ''
})
const form = reactive({
  patientId: null, diseaseCode: '1', measureTime: '', dataSource: '2',
  entries: [{ indicatorCode: '', value: null }]
})
const rules = {
  patientId: [{ required: true, message: '请选择患者', trigger: 'change' }]
}

const loadIndicators = async () => {
  try {
    const res = await indicatorOptions()
    indicators.value = res.data || []
  } catch (e) {
    indicators.value = []
  }
}

const unitOf = (entry) => {
  const i = indicators.value.find((x) => x.indicatorCode === entry.indicatorCode)
  return i ? i.unit : ''
}

const isUsed = (code, idx) => form.entries.some((e, i) => i !== idx && e.indicatorCode === code)

const onEntryChange = (entry) => {
  entry.value = null
}

const addEntry = () => {
  form.entries.push({ indicatorCode: '', value: null })
}

const removeEntry = (idx) => {
  if (form.entries.length <= 1) return
  form.entries.splice(idx, 1)
}
const loadList = async () => {
  loading.value = true
  try {
    query.beginTime = timeRange.value && timeRange.value[0] ? timeRange.value[0] : ''
    query.endTime = timeRange.value && timeRange.value[1] ? timeRange.value[1] : ''
    const res = await listMeasureGrouped(query)
    groups.value = res.data.rows || []
    total.value = res.data.total || 0
  } finally {
    loading.value = false
  }
}

const handleQuery = () => { query.pageNum = 1; loadList() }
const resetQuery = () => {
  Object.assign(query, {
    pageNum: 1, pageSize: 10, patientId: null,
    indicatorCode: '', abnormalFlag: '', beginTime: '', endTime: ''
  })
  timeRange.value = []
  loadList()
}

const openAdd = () => {
  Object.assign(form, {
    patientId: null, diseaseCode: '1', measureTime: '', dataSource: '2',
    entries: [{ indicatorCode: '', value: null }]
  })
  dialogVisible.value = true
}

const handleSubmit = () => {
  const entries = form.entries.filter((e) => e.indicatorCode)
  if (!entries.length) {
    ElMessage.warning('请至少选择一项指标')
    return
  }
  if (entries.some((e) => e.value === null || e.value === undefined || e.value === '')) {
    ElMessage.warning('请填写每个指标的数值')
    return
  }
  const codes = entries.map((e) => e.indicatorCode)
  if (new Set(codes).size !== codes.length) {
    ElMessage.warning('同一指标不能重复录入')
    return
  }
  formRef.value.validate(async (valid) => {
    if (!valid) return
    await addMeasureOnce({
      patientId: form.patientId,
      diseaseCode: form.diseaseCode,
      measureTime: form.measureTime || null,
      dataSource: form.dataSource,
      entries: entries.map((e) => ({ indicatorCode: e.indicatorCode, value: e.value }))
    })
    ElMessage.success('已录入 ' + entries.length + ' 项指标')
    dialogVisible.value = false
    loadList()
  })
}
const handleDeleteGroup = (g) => {
  ElMessageBox.confirm(
    '确定删除 ' + g.patientName + ' 在 ' + g.measureTime + ' 的整组监测数据吗？',
    '提示',
    { type: 'warning' }
  ).then(async () => {
    await delMeasureGroup(g.patientId, g.measureTime)
    ElMessage.success('删除成功')
    loadList()
  })
}

onMounted(() => {
  loadIndicators()
  loadList()
})
</script>

<style scoped>
.toolbar-tip {
  margin-left: 16px;
  color: var(--t-sub);
  font-size: 13px;
}
.group-list {
  min-height: 120px;
}
.measure-group {
  border: 1px solid var(--line);
  border-radius: 14px;
  margin-bottom: 20px;
  overflow: hidden;
  background: var(--bg-panel);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.32);
  animation: fade-slide-up 0.42s ease both;
  transition: border-color 0.25s, box-shadow 0.25s;
}
.measure-group:hover {
  border-color: var(--line-strong);
  box-shadow: 0 14px 38px rgba(0, 0, 0, 0.4), 0 0 22px rgba(64, 158, 255, 0.12);
}
.group-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 18px;
  background: linear-gradient(90deg, rgba(64, 158, 255, 0.12), rgba(64, 158, 255, 0.02));
  border-bottom: 1px solid var(--line);
}
.group-title {
  display: flex;
  align-items: center;
  gap: 12px;
}
.patient-name {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #303133;
}
.measure-time {
  color: var(--t-sub);
  font-size: 13px;
  font-family: Consolas, Monaco, monospace;
}
.measure-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.measure-table th {
  text-align: left;
  padding: 10px 18px;
  background: rgba(64, 158, 255, 0.06);
  color: var(--t-sub);
  font-weight: 500;
  font-size: 13px;
  letter-spacing: 0.6px;
  border-bottom: 1px solid var(--line);
}
.measure-table td {
  padding: 10px 18px;
  border-bottom: 1px solid rgba(64, 158, 255, 0.08);
  color: var(--t-main);
}
.measure-table tbody tr:last-child td {
  border-bottom: none;
}
.measure-table tbody tr {
  transition: background 0.2s;
}
.measure-table tbody tr:hover {
  background: rgba(64, 158, 255, 0.05);
}
.row-abnormal {
  background: rgba(245, 108, 108, 0.1) !important;
  box-shadow: inset 3px 0 0 #f56c6c;
}
.cell-name {
  color: var(--t-sub);
}
.cell-value {
  font-weight: 700;
  font-family: Consolas, Monaco, monospace;
}
.row-abnormal .cell-value {
  color: #f56c6c;
  text-shadow: 0 0 12px rgba(255, 77, 94, 0.5);
}
.cell-unit {
  color: var(--t-dim);
}
.not-entered {
  color: var(--t-dim);
  font-weight: 400;
  font-style: italic;
}

.entry-list {
  width: 100%;
}
.entry-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.entry-unit {
  width: 60px;
  color: var(--t-sub);
  font-size: 13px;
}
</style>
