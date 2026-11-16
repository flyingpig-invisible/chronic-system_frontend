<template>
  <div class="page-container">
    <div class="search-bar">
      <el-form :model="query" inline>
        <el-form-item label="患者">
          <PatientSelect v-model="query.patientId" width="220px" style="display:inline-block" />
        </el-form-item>
        <el-form-item label="紧急程度">
          <el-select v-model="query.urgency" placeholder="全部" clearable style="width:120px">
            <el-option label="一般" value="1" />
            <el-option label="紧急" value="2" />
            <el-option label="严重" value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.referralStatus" placeholder="全部" clearable style="width:120px">
            <el-option label="待审核" value="0" />
            <el-option label="已通过" value="1" />
            <el-option label="已驳回" value="2" />
            <el-option label="已完成" value="3" />
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
        <el-button type="primary" :icon="Plus" @click="openApply">发起转诊</el-button>
      </div>
      <el-table v-loading="loading" :data="list" border stripe>
        <el-table-column prop="patientName" label="患者" width="90" />
        <el-table-column prop="targetHospital" label="接收医院" min-width="140" />
        <el-table-column prop="targetDept" label="接收科室" width="110" />
        <el-table-column prop="reason" label="转诊原因" min-width="150" show-overflow-tooltip />
        <el-table-column label="紧急程度" width="90">
          <template #default="{ row }">
            <el-tag :type="urgencyTag(row.urgency)" size="small">{{ urgencyName(row.urgency) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.referralStatus)" size="small">{{ statusName(row.referralStatus) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="applyTime" label="申请时间" width="170" />
        <el-table-column label="操作" width="110" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.referralStatus === '0'" v-permission="['chronic:referral:audit']" type="primary" link size="small" @click="openAudit(row)">审核</el-button>
            <el-button type="info" link size="small" @click="openView(row)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap">
        <el-pagination v-model:current-page="query.pageNum" v-model:page-size="query.pageSize"
          :page-sizes="[10, 20, 50]" :total="total" layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadList" @current-change="loadList" />
      </div>
    </div>

    <el-dialog v-model="applyVisible" title="发起转诊" width="520px">
      <el-form ref="applyRef" :model="applyForm" :rules="applyRules" label-width="100px">
        <el-form-item label="患者" prop="patientId">
          <PatientSelect v-model="applyForm.patientId" @select="(p) => (applyForm.patientName = p ? p.name : '')" />
        </el-form-item>
        <el-form-item label="接收医院" prop="targetHospital"><el-input v-model="applyForm.targetHospital" /></el-form-item>
        <el-form-item label="接收科室"><el-input v-model="applyForm.targetDept" /></el-form-item>
        <el-form-item label="紧急程度">
          <el-radio-group v-model="applyForm.urgency">
            <el-radio value="1">一般</el-radio>
            <el-radio value="2">紧急</el-radio>
            <el-radio value="3">严重</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="转诊原因"><el-input v-model="applyForm.reason" type="textarea" :rows="3" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="applyVisible = false">取消</el-button>
        <el-button type="primary" @click="submitApply">提交</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="auditVisible" title="审核转诊" width="520px">
      <el-form :model="auditForm" label-width="100px">
        <el-form-item label="审核结果">
          <el-radio-group v-model="auditForm.referralStatus">
            <el-radio value="1">通过</el-radio>
            <el-radio value="2">驳回</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="审核意见"><el-input v-model="auditForm.auditOpinion" type="textarea" :rows="2" /></el-form-item>
        <el-form-item v-if="auditForm.referralStatus === '1'" label="接收医院"><el-input v-model="auditForm.receiveHospital" /></el-form-item>
        <el-form-item v-if="auditForm.referralStatus === '1'" label="接收科室"><el-input v-model="auditForm.receiveDept" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="auditVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAudit">提交</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="viewVisible" title="转诊详情" width="540px">
      <el-descriptions :column="1" border size="small">
        <el-descriptions-item label="患者">{{ current.patientName }}</el-descriptions-item>
        <el-descriptions-item label="接收医院">{{ current.targetHospital }}</el-descriptions-item>
        <el-descriptions-item label="接收科室">{{ current.targetDept }}</el-descriptions-item>
        <el-descriptions-item label="转诊原因">{{ current.reason }}</el-descriptions-item>
        <el-descriptions-item label="审核意见">{{ current.auditOpinion }}</el-descriptions-item>
        <el-descriptions-item label="实际接收">{{ current.receiveHospital }} {{ current.receiveDept }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, Plus } from '@element-plus/icons-vue'
import { listReferral, applyReferral, auditReferral } from '@/api/referral'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const applyVisible = ref(false)
const auditVisible = ref(false)
const viewVisible = ref(false)
const current = ref({})
const applyRef = ref()

const query = reactive({ pageNum: 1, pageSize: 10, patientId: null, urgency: '', referralStatus: '' })
const applyForm = reactive({ patientId: null, patientName: '', targetHospital: '', targetDept: '', urgency: '1', reason: '' })
const auditForm = reactive({ referralStatus: '1', auditOpinion: '', receiveHospital: '', receiveDept: '' })
const applyRules = {
  patientId: [{ required: true, message: '请输入患者ID', trigger: 'blur' }],
  targetHospital: [{ required: true, message: '请输入接收医院', trigger: 'blur' }]
}

const urgencyName = (u) => ({ 1: '一般', 2: '紧急', 3: '严重' }[u] || '-')
const urgencyTag = (u) => ({ 1: 'info', 2: 'warning', 3: 'danger' }[u] || 'info')
const statusName = (s) => ({ 0: '待审核', 1: '已通过', 2: '已驳回', 3: '已完成' }[s] || '-')
const statusTag = (s) => ({ 0: 'warning', 1: 'success', 2: 'danger', 3: 'info' }[s] || 'info')

const loadList = async () => {
  loading.value = true
  try {
    const res = await listReferral(query)
    list.value = res.data.rows
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

const handleQuery = () => { query.pageNum = 1; loadList() }
const resetQuery = () => {
  Object.assign(query, { pageNum: 1, pageSize: 10, patientId: null, urgency: '', referralStatus: '' })
  loadList()
}

const openApply = () => {
  Object.assign(applyForm, { patientId: null, patientName: '', targetHospital: '', targetDept: '', urgency: '1', reason: '' })
  applyVisible.value = true
}

const submitApply = () => {
  applyRef.value.validate(async (valid) => {
    if (!valid) return
    await applyReferral(applyForm)
    ElMessage.success('转诊申请已提交')
    applyVisible.value = false
    loadList()
  })
}

const openAudit = (row) => {
  current.value = row
  Object.assign(auditForm, { referralStatus: '1', auditOpinion: '', receiveHospital: row.targetHospital, receiveDept: row.targetDept })
  auditVisible.value = true
}

const submitAudit = async () => {
  await auditReferral(current.value.referralId, auditForm)
  ElMessage.success('审核完成')
  auditVisible.value = false
  loadList()
}

const openView = (row) => {
  current.value = row
  viewVisible.value = true
}

onMounted(loadList)
</script>
