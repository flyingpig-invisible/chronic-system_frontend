<template>
  <div class="page-container">
    <el-row :gutter="16" style="margin-bottom:16px">
      <el-col :span="6" v-for="s in statCards" :key="s.name">
        <el-card shadow="hover">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="color:#909399;font-size:13px">{{ s.name }}</div>
              <div :style="{ fontSize:'26px', fontWeight:'bold', color: s.color }">{{ s.count }}</div>
            </div>
            <el-icon :size="34" :color="s.color"><Warning /></el-icon>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <div class="search-bar">
      <el-form :model="query" inline>
        <el-form-item label="患者">
          <PatientSelect v-model="query.patientId" width="220px" style="display:inline-block" />
        </el-form-item>
        <el-form-item label="级别">
          <el-select v-model="query.warningLevel" placeholder="全部" clearable style="width:110px">
            <el-option label="低危" value="1" />
            <el-option label="中危" value="2" />
            <el-option label="高危" value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.handleStatus" placeholder="全部" clearable style="width:120px">
            <el-option label="待处理" value="0" />
            <el-option label="处理中" value="1" />
            <el-option label="已处理" value="2" />
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
        <el-button v-permission="['chronic:warning:export']" :icon="Download" @click="handleExport">导出</el-button>
      </div>
      <el-table v-loading="loading" :data="list" border stripe>
        <el-table-column prop="patientName" label="患者" width="90" />
        <el-table-column prop="indicatorName" label="指标" width="110" />
        <el-table-column prop="indicatorValue" label="数值" width="80" />
        <el-table-column prop="unit" label="单位" width="70" />
        <el-table-column prop="thresholdDesc" label="触发阈值" min-width="150" />
        <el-table-column label="级别" width="80">
          <template #default="{ row }">
            <el-tag :type="levelTag(row.warningLevel)" size="small" effect="dark">{{ levelName(row.warningLevel) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.handleStatus)" size="small">{{ statusName(row.handleStatus) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="triggerTime" label="触发时间" width="160" />
        <el-table-column prop="handleBy" label="处置人" width="90" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.handleStatus !== '2'" v-permission="['chronic:warning:handle']" type="primary" link size="small" @click="openHandle(row)">处置</el-button>
            <el-button v-if="row.warningLevel === '3'" v-permission="['chronic:warning:handle']" type="danger" link size="small" @click="openEmergency(row)">急救联动</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap">
        <el-pagination v-model:current-page="query.pageNum" v-model:page-size="query.pageSize"
          :page-sizes="[10, 20, 50]" :total="total" layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadList" @current-change="loadList" />
      </div>
    </div>

    <el-dialog v-model="handleVisible" title="预警处置" width="480px">
      <el-descriptions :column="1" border size="small" style="margin-bottom:16px">
        <el-descriptions-item label="患者">{{ current.patientName }}</el-descriptions-item>
        <el-descriptions-item label="指标">{{ current.indicatorName }} {{ current.indicatorValue }}{{ current.unit }}</el-descriptions-item>
        <el-descriptions-item label="阈值">{{ current.thresholdDesc }}</el-descriptions-item>
      </el-descriptions>
      <el-form :model="handleForm" label-width="90px">
        <el-form-item label="处置状态">
          <el-radio-group v-model="handleForm.handleStatus">
            <el-radio value="1">处理中</el-radio>
            <el-radio value="2">已处理</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="处置方式">
          <el-select v-model="handleForm.handleType" style="width:100%">
            <el-option label="电话随访" value="1" />
            <el-option label="在线指导" value="2" />
            <el-option label="调整用药" value="3" />
            <el-option label="建议就诊" value="4" />
          </el-select>
        </el-form-item>
        <el-form-item label="处置说明">
          <el-input v-model="handleForm.handleContent" type="textarea" :rows="3" placeholder="填写处置内容" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="handleVisible = false">取消</el-button>
        <el-button type="primary" @click="submitHandle">提交</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="emergencyVisible" title="急救联动" width="480px">
      <el-alert type="error" :closable="false" title="高危预警！请确认是否需要联动急救资源" style="margin-bottom:16px" />
      <el-form :model="emergencyForm" label-width="90px">
        <el-form-item label="联动类型">
          <el-select v-model="emergencyForm.linkType" style="width:100%">
            <el-option label="120急救中心" value="1" />
            <el-option label="家属通知" value="2" />
            <el-option label="转诊医院" value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="联动对象"><el-input v-model="emergencyForm.linkTarget" placeholder="如：市急救中心 / 家属张小明" /></el-form-item>
        <el-form-item label="联动内容"><el-input v-model="emergencyForm.linkContent" type="textarea" :rows="3" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="emergencyVisible = false">取消</el-button>
        <el-button type="danger" @click="submitEmergency">发起联动</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, Download, Warning } from '@element-plus/icons-vue'
import { listWarning, handleWarning, linkEmergency, statWarningLevel, exportWarning } from '@/api/warning'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const handleVisible = ref(false)
const emergencyVisible = ref(false)
const current = ref({})
const statCards = ref([
  { name: '高危预警', count: 0, color: '#f56c6c' },
  { name: '中危预警', count: 0, color: '#e6a23c' },
  { name: '低危预警', count: 0, color: '#909399' },
  { name: '待处理', count: 0, color: '#409eff' }
])

const query = reactive({ pageNum: 1, pageSize: 10, patientId: null, warningLevel: '', handleStatus: '' })
const handleForm = reactive({ handleStatus: '2', handleType: '1', handleContent: '' })
const emergencyForm = reactive({ linkType: '1', linkTarget: '', linkContent: '' })

const levelTag = (l) => ({ 1: 'info', 2: 'warning', 3: 'danger' }[l] || 'info')
const levelName = (l) => ({ 1: '低危', 2: '中危', 3: '高危' }[l] || '-')
const statusTag = (s) => ({ 0: 'danger', 1: 'warning', 2: 'success' }[s] || 'info')
const statusName = (s) => ({ 0: '待处理', 1: '处理中', 2: '已处理' }[s] || '-')

const loadList = async () => {
  loading.value = true
  try {
    const res = await listWarning(query)
    list.value = res.data.rows
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

const loadStat = async () => {
  try {
    const res = await statWarningLevel({})
    const map = {}
    ;(res.data || []).forEach((i) => (map[i.riskLevel] = i.count))
    statCards.value[0].count = map['3'] || 0
    statCards.value[1].count = map['2'] || 0
    statCards.value[2].count = map['1'] || 0
    const pending = await listWarning({ pageNum: 1, pageSize: 1, handleStatus: '0' })
    statCards.value[3].count = pending.data.total || 0
  } catch (e) {}
}

const handleQuery = () => { query.pageNum = 1; loadList() }
const resetQuery = () => {
  Object.assign(query, { pageNum: 1, pageSize: 10, patientId: null, warningLevel: '', handleStatus: '' })
  loadList()
}

const openHandle = (row) => {
  current.value = row
  Object.assign(handleForm, { handleStatus: '2', handleType: '1', handleContent: '' })
  handleVisible.value = true
}

const submitHandle = async () => {
  await handleWarning(current.value.warningId, handleForm)
  ElMessage.success('处置成功')
  handleVisible.value = false
  loadList()
  loadStat()
}

const openEmergency = (row) => {
  current.value = row
  Object.assign(emergencyForm, { linkType: '1', linkTarget: '', linkContent: `患者${row.patientName} ${row.indicatorName} ${row.indicatorValue}${row.unit}，请立即处置` })
  emergencyVisible.value = true
}

const submitEmergency = async () => {
  await linkEmergency(current.value.warningId, emergencyForm)
  ElMessage.success('急救联动已发起')
  emergencyVisible.value = false
}

const handleExport = async () => {
  const res = await exportWarning(query)
  const blob = new Blob([res.data])
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '预警列表.xlsx'
  a.click()
  window.URL.revokeObjectURL(url)
}

onMounted(() => {
  loadList()
  loadStat()
})
</script>
