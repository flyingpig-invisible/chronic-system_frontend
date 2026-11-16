<template>
  <div class="page-container">
    <div class="search-bar">
      <el-form :model="query" inline>
        <el-form-item label="绑定状态">
          <el-select v-model="query.bindStatus" placeholder="全部" clearable style="width:140px" @change="handleQuery">
            <el-option label="申请中" value="0" />
            <el-option label="绑定成功" value="1" />
            <el-option label="已拒绝" value="2" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleQuery">搜索</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-alert
      type="info"
      :closable="false"
      title="绑定流程：家属发起申请 → 患者同意 → 医生审核。仅当患者已同意后，医生才能审核。"
      style="margin-bottom:16px"
    />

    <div class="table-card">
      <el-table v-loading="loading" :data="list" border stripe>
        <el-table-column prop="applyId" label="ID" width="70" />
        <el-table-column prop="familyName" label="家属" width="100" />
        <el-table-column prop="patientName" label="患者" width="100" />
        <el-table-column prop="relation" label="关系" width="90" />
        <el-table-column prop="applyRemark" label="申请备注" min-width="180" show-overflow-tooltip />
        <el-table-column label="患者确认" width="100">
          <template #default="{ row }">
            <el-tag :type="patientTag(row.patientStatus)" size="small">{{ patientStatusName(row.patientStatus) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="医生审核" width="100">
          <template #default="{ row }">
            <el-tag :type="doctorTag(row.doctorStatus)" size="small">{{ doctorStatusName(row.doctorStatus) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="最终状态" width="100">
          <template #default="{ row }">
            <el-tag :type="bindTag(row.bindStatus)" size="small">{{ bindStatusName(row.bindStatus) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="applyTime" label="申请时间" width="170" />
        <el-table-column prop="doctorName" label="审核医生" width="100" />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.patientStatus === '1' && row.doctorStatus === '0'"
              v-permission="['chronic:bind:audit']"
              type="primary"
              link
              size="small"
              @click="openAudit(row)"
            >审核</el-button>
            <span v-else-if="row.patientStatus === '0'" style="color:#909399;font-size:12px">待患者同意</span>
            <span v-else style="color:#909399;font-size:12px">已完成</span>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap">
        <el-pagination v-model:current-page="query.pageNum" v-model:page-size="query.pageSize"
          :page-sizes="[10, 20, 50]" :total="total" layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadList" @current-change="loadList" />
      </div>
    </div>

    <el-dialog v-model="auditVisible" title="绑定申请审核" width="480px">
      <el-descriptions :column="1" border size="small" style="margin-bottom:16px">
        <el-descriptions-item label="家属">{{ current.familyName }}</el-descriptions-item>
        <el-descriptions-item label="患者">{{ current.patientName }}</el-descriptions-item>
        <el-descriptions-item label="关系">{{ current.relation }}</el-descriptions-item>
        <el-descriptions-item label="申请备注">{{ current.applyRemark }}</el-descriptions-item>
        <el-descriptions-item label="患者确认状态">
          <el-tag type="success" size="small">已同意</el-tag>
        </el-descriptions-item>
      </el-descriptions>
      <el-form :model="auditForm" label-width="90px">
        <el-form-item label="审核结果">
          <el-radio-group v-model="auditForm.result">
            <el-radio value="1">通过</el-radio>
            <el-radio value="2">拒绝</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="审核意见"><el-input v-model="auditForm.auditOpinion" type="textarea" :rows="3" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="auditVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAudit">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { listBindApply, auditBindApply } from '@/api/bind'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const auditVisible = ref(false)
const current = ref({})

const query = reactive({ pageNum: 1, pageSize: 10, bindStatus: '' })
const auditForm = reactive({ result: '1', auditOpinion: '' })

const patientStatusName = (s) => ({ 0: '待确认', 1: '已同意', 2: '已拒绝' }[s] || '-')
const patientTag = (s) => ({ 0: 'info', 1: 'success', 2: 'danger' }[s] || 'info')
const doctorStatusName = (s) => ({ 0: '待审核', 1: '已通过', 2: '已驳回' }[s] || '-')
const doctorTag = (s) => ({ 0: 'warning', 1: 'success', 2: 'danger' }[s] || 'info')
const bindStatusName = (s) => ({ 0: '申请中', 1: '绑定成功', 2: '已拒绝' }[s] || '-')
const bindTag = (s) => ({ 0: 'warning', 1: 'success', 2: 'danger' }[s] || 'info')

const loadList = async () => {
  loading.value = true
  try {
    const res = await listBindApply(query)
    list.value = res.data.rows
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

const handleQuery = () => { query.pageNum = 1; loadList() }
const resetQuery = () => {
  Object.assign(query, { pageNum: 1, pageSize: 10, bindStatus: '' })
  loadList()
}

const openAudit = (row) => {
  current.value = row
  Object.assign(auditForm, { result: '1', auditOpinion: '' })
  auditVisible.value = true
}

const submitAudit = async () => {
  await auditBindApply(current.value.applyId, auditForm)
  ElMessage.success('审核完成')
  auditVisible.value = false
  loadList()
}

onMounted(loadList)
</script>
