<template>
  <div class="page-container">
    <div class="search-bar">
      <el-form :model="query" inline>
        <el-form-item label="患者">
          <PatientSelect v-model="query.patientId" width="220px" style="display:inline-block" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width:110px">
            <el-option label="启用" value="1" />
            <el-option label="停用" value="0" />
          </el-select>
        </el-form-item>
        <el-form-item label="药品"><el-input v-model="query.keyword" clearable style="width:150px" /></el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleQuery">搜索</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="table-card">
      <div class="table-toolbar">
        <el-button type="primary" :icon="Plus" @click="openAdd">新增提醒</el-button>
      </div>
      <el-table v-loading="loading" :data="list" border stripe>
        <el-table-column label="患者" width="110">
          <template #default="{ row }">
            <span v-if="row.patientName">{{ row.patientName }}</span>
            <span v-else style="color:#909399">ID:{{ row.patientId }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="medicineName" label="药品名称" width="140" />
        <el-table-column prop="dosage" label="剂量" width="90" />
        <el-table-column label="频次" width="110">
          <template #default="{ row }">{{ freqName(row.frequency) }}</template>
        </el-table-column>
        <el-table-column prop="remindTimes" label="提醒时间" width="150" />
        <el-table-column prop="beginDate" label="开始" width="110" />
        <el-table-column prop="endDate" label="结束" width="110" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === '1' ? 'success' : 'info'" size="small">{{ row.status === '1' ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" align="center" class-name="op-col">
          <template #default="{ row }">
            <div class="op-btns">
              <el-button type="primary" link size="small" @click="openLogs(row)">打卡记录</el-button>
              <el-button type="primary" link size="small" @click="openEdit(row)">编辑</el-button>
              <el-button type="success" link size="small" @click="toggleStatus(row)">{{ row.status === '1' ? '停用' : '启用' }}</el-button>
              <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap">
        <el-pagination v-model:current-page="query.pageNum" v-model:page-size="query.pageSize"
          :page-sizes="[10, 20, 50]" :total="total" layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadList" @current-change="loadList" />
      </div>
    </div>

    <el-dialog v-model="logVisible" :title="logTitle" width="720px">
      <div class="log-summary">
        <span class="log-item">共 {{ logSummary.total }} 次计划服药</span>
        <span class="log-item ok">已打卡 {{ logSummary.checked }} 次</span>
        <span class="log-item miss">漏服 {{ logSummary.missed }} 次</span>
        <span class="log-item pending">未打卡 {{ logSummary.pending }} 次</span>
        <span class="log-item">打卡率 {{ logSummary.rate }}%</span>
        <el-radio-group v-model="logDays" size="small" style="margin-left:auto" @change="loadLogs">
          <el-radio-button :value="7">近 7 天</el-radio-button>
          <el-radio-button :value="30">近 30 天</el-radio-button>
          <el-radio-button :value="0">全部</el-radio-button>
        </el-radio-group>
      </div>
      <el-table v-loading="logLoading" :data="logs" border stripe max-height="420">
        <el-table-column prop="planDate" label="计划日期" width="120" />
        <el-table-column prop="planTime" label="计划时间" width="100" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="logTagType(row.checkStatus)" size="small">{{ logStatusName(row.checkStatus) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="打卡时间" min-width="170">
          <template #default="{ row }">{{ row.checkTime ? formatTime(row.checkTime) : '-' }}</template>
        </el-table-column>
        <el-table-column label="是否按时" width="100">
          <template #default="{ row }">
            <span v-if="row.checkStatus !== '1'" style="color:#909399">-</span>
            <el-tag v-else-if="isLate(row)" type="warning" size="small">延迟</el-tag>
            <el-tag v-else type="success" size="small">按时</el-tag>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="logVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="dialogVisible" :title="form.remindId ? '编辑用药提醒' : '新增用药提醒'" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="患者" prop="patientId">
          <PatientSelect v-model="form.patientId" />
        </el-form-item>
        <el-form-item label="药品名称" prop="medicineName"><el-input v-model="form.medicineName" /></el-form-item>
        <el-form-item label="剂量"><el-input v-model="form.dosage" placeholder="如 5mg" /></el-form-item>
        <el-form-item label="频次">
          <el-select v-model="form.frequency" style="width:100%">
            <el-option label="每日一次" value="1" />
            <el-option label="每日两次" value="2" />
            <el-option label="每日三次" value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="提醒时间"><el-input v-model="form.remindTimes" placeholder="逗号分隔，如 08:00,20:00" /></el-form-item>
        <el-form-item label="开始日期"><el-date-picker v-model="form.beginDate" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item>
        <el-form-item label="结束日期"><el-date-picker v-model="form.endDate" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus } from '@element-plus/icons-vue'
import { listRemind, saveRemind, delRemind, changeRemindStatus, remindLogs } from '@/api/remind'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const dialogVisible = ref(false)
const formRef = ref()

const query = reactive({ pageNum: 1, pageSize: 10, patientId: null, status: '', keyword: '' })
const form = reactive({
  remindId: null, patientId: null, medicineName: '', dosage: '', frequency: '1',
  remindTimes: '08:00', beginDate: '', endDate: '', status: '1'
})
const rules = {
  patientId: [{ required: true, message: '请输入患者ID', trigger: 'blur' }],
  medicineName: [{ required: true, message: '请输入药品名称', trigger: 'blur' }]
}

const freqName = (f) => ({ 1: '每日一次', 2: '每日两次', 3: '每日三次' }[f] || '-')

const loadList = async () => {
  loading.value = true
  try {
    const res = await listRemind(query)
    list.value = res.data.rows
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

const handleQuery = () => { query.pageNum = 1; loadList() }
const resetQuery = () => {
  Object.assign(query, { pageNum: 1, pageSize: 10, patientId: null, status: '', keyword: '' })
  loadList()
}

const openAdd = () => {
  Object.assign(form, {
    remindId: null, patientId: null, medicineName: '', dosage: '', frequency: '1',
    remindTimes: '08:00', beginDate: '', endDate: '', status: '1'
  })
  dialogVisible.value = true
}

const openEdit = (row) => {
  Object.assign(form, row)
  dialogVisible.value = true
}

const handleSubmit = () => {
  formRef.value.validate(async (valid) => {
    if (!valid) return
    await saveRemind(form)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadList()
  })
}

const toggleStatus = async (row) => {
  await changeRemindStatus(row.remindId, row.status === '1' ? '0' : '1')
  ElMessage.success('操作成功')
  loadList()
}

const handleDelete = (row) => {
  ElMessageBox.confirm('确定删除该用药提醒吗？', '提示', { type: 'warning' }).then(async () => {
    await delRemind(row.remindId)
    ElMessage.success('删除成功')
    loadList()
  })
}

// ---------------- 打卡记录 ----------------
const logVisible = ref(false)
const logLoading = ref(false)
const logDays = ref(30)
const logs = ref([])
const logRemind = ref(null)

const logTitle = computed(() => {
  const r = logRemind.value
  if (!r) return '打卡记录'
  const who = r.patientName || ('患者ID:' + r.patientId)
  return who + ' · ' + r.medicineName + ' 打卡记录'
})

const LOG_STATUS = { '0': '未打卡', '1': '已打卡', '2': '漏服' }
const logStatusName = (s) => LOG_STATUS[s] || '-'
const logTagType = (s) => ({ '1': 'success', '2': 'danger', '0': 'info' }[s] || 'info')

const formatTime = (v) => {
  if (!v) return '-'
  return String(v).replace('T', ' ').slice(0, 16)
}

const logSummary = computed(() => {
  const rows = logs.value
  const total = rows.length
  const checked = rows.filter((r) => r.checkStatus === '1').length
  const missed = rows.filter((r) => r.checkStatus === '2').length
  const result = { total, checked, missed, pending: total - checked - missed }
  result.rate = total ? Math.round(checked * 100 / total) : 0
  return result
})

/** 打卡时间晚于计划时间 30 分钟以上算延迟 */
const isLate = (row) => {
  if (!row.checkTime || !row.planDate || !row.planTime) return false
  const plan = new Date(row.planDate + 'T' + row.planTime + ':00')
  if (isNaN(plan.getTime())) return false
  const actual = new Date(String(row.checkTime).replace('T', ' ').replace(/-/g, '/'))
  if (isNaN(actual.getTime())) return false
  return actual.getTime() - plan.getTime() > 30 * 60 * 1000
}

const loadLogs = async () => {
  if (!logRemind.value) return
  logLoading.value = true
  try {
    const res = await remindLogs(logRemind.value.remindId, logDays.value || undefined)
    logs.value = res.data || []
  } finally {
    logLoading.value = false
  }
}

const openLogs = (row) => {
  logRemind.value = row
  logDays.value = 30
  logs.value = []
  logVisible.value = true
  loadLogs()
}

onMounted(loadList)
</script>

<style scoped>
.op-btns {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: nowrap;
  white-space: nowrap;
}
.op-btns .el-button { margin-left: 0; }
.op-col .cell { padding-left: 12px; padding-right: 12px; }
.log-summary {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 14px;
  font-size: 13px;
  color: #606266;
}
.log-item.ok { color: #16A34A; }
.log-item.miss { color: #E5484D; }
.log-item.pending { color: #8A94A6; }
</style>
