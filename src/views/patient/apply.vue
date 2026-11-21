<template>
  <div class="page-container">
    <div class="search-bar">
      <el-form :model="query" inline>
        <el-form-item label="审核状态">
          <el-select v-model="query.applyStatus" placeholder="全部" clearable style="width:140px" @change="handleQuery">
            <el-option label="待审核" value="0" />
            <el-option label="已通过" value="1" />
            <el-option label="已驳回" value="2" />
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
      title="患者在小程序注册后提交建档申请，审核通过即自动创建患者档案并关联其小程序账号。"
      style="margin-bottom:16px"
    />

    <div class="table-card">
      <el-table v-loading="loading" :data="list" border stripe>
        <el-table-column prop="applyId" label="ID" width="70" />
        <el-table-column prop="userName" label="姓名" width="100" />
        <el-table-column prop="userPhone" label="手机号" width="130" />
        <el-table-column label="性别" width="70">
          <template #default="{ row }">{{ row.userGender === '1' ? '男' : row.userGender === '0' ? '女' : '-' }}</template>
        </el-table-column>
        <el-table-column prop="age" label="年龄" width="70">
          <template #default="{ row }">{{ row.age == null ? '-' : row.age }}</template>
        </el-table-column>
        <el-table-column prop="birthday" label="出生日期" width="120">
          <template #default="{ row }">{{ row.birthday || '-' }}</template>
        </el-table-column>
        <el-table-column label="自述病种" min-width="150">
          <template #default="{ row }">
            <el-tag v-for="d in diseaseList(row)" :key="d" size="small" style="margin-right:4px">{{ d }}</el-tag>
            <span v-if="!diseaseList(row).length" style="color:#909399">-</span>
          </template>
        </el-table-column>
        <el-table-column label="审核状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.applyStatus)" size="small">{{ row.applyStatusName }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="applyTime" label="申请时间" width="170">
          <template #default="{ row }">{{ formatTime(row.applyTime) }}</template>
        </el-table-column>
        <el-table-column prop="doctorName" label="审核人" width="100">
          <template #default="{ row }">{{ row.doctorName || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="110">
          <template #default="{ row }">
            <el-button v-if="row.applyStatus === '0'" type="primary" link size="small" @click="openAudit(row)">审核</el-button>
            <el-button v-else type="primary" link size="small" @click="openAudit(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap">
        <el-pagination v-model:current-page="query.pageNum" v-model:page-size="query.pageSize"
          :page-sizes="[10, 20, 50]" :total="total" layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadList" @current-change="loadList" />
      </div>
    </div>

    <el-dialog v-model="auditVisible" title="建档申请审核" width="560px">
      <el-descriptions :column="2" border size="small" style="margin-bottom:16px">
        <el-descriptions-item label="姓名">{{ current.userName }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ current.userPhone }}</el-descriptions-item>
        <el-descriptions-item label="性别">{{ current.userGender === '1' ? '男' : current.userGender === '0' ? '女' : '-' }}</el-descriptions-item>
        <el-descriptions-item label="出生日期">{{ current.birthday || '-' }}</el-descriptions-item>
        <el-descriptions-item label="身份证号">{{ current.idCard || '-' }}</el-descriptions-item>
        <el-descriptions-item label="联系地址">{{ current.address || '-' }}</el-descriptions-item>
        <el-descriptions-item label="自述病种" :span="2">{{ current.diseaseNames || '-' }}</el-descriptions-item>
        <el-descriptions-item label="补充说明" :span="2">{{ current.applyRemark || '-' }}</el-descriptions-item>
        <el-descriptions-item label="申请时间" :span="2">{{ formatTime(current.applyTime) }}</el-descriptions-item>
      </el-descriptions>

      <template v-if="current.applyStatus === '0'">
        <el-form :model="auditForm" label-width="90px">
          <el-form-item label="审核结果">
            <el-radio-group v-model="auditForm.result">
              <el-radio value="1">通过并建档</el-radio>
              <el-radio value="2">驳回</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="审核意见">
            <el-input v-model="auditForm.auditOpinion" type="textarea" :rows="3" placeholder="驳回时建议说明原因" />
          </el-form-item>
        </el-form>
        <div class="audit-tip">审核通过后将自动创建患者档案（编号自动生成），并把该档案关联到申请人的小程序账号。</div>
      </template>
      <template v-else>
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="审核状态">{{ current.applyStatusName }}</el-descriptions-item>
          <el-descriptions-item label="审核时间">{{ formatTime(current.auditTime) }}</el-descriptions-item>
          <el-descriptions-item label="审核意见">{{ current.auditOpinion || '-' }}</el-descriptions-item>
        </el-descriptions>
      </template>

      <template #footer>
        <el-button @click="auditVisible = false">关闭</el-button>
        <el-button v-if="current.applyStatus === '0'" type="primary" @click="submitAudit">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { listPatientApply, auditPatientApply } from '@/api/patientApply'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const auditVisible = ref(false)
const current = ref({})

const query = reactive({ pageNum: 1, pageSize: 10, applyStatus: '' })
const auditForm = reactive({ result: '1', auditOpinion: '' })

const statusTag = (s) => ({ '0': 'warning', '1': 'success', '2': 'danger' }[s] || 'info')

const diseaseList = (row) => (row.diseaseNames ? row.diseaseNames.split('、') : [])

const formatTime = (v) => (v ? String(v).replace('T', ' ').slice(0, 16) : '-')

const loadList = async () => {
  loading.value = true
  try {
    const res = await listPatientApply(query)
    list.value = res.data.rows
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

const handleQuery = () => { query.pageNum = 1; loadList() }
const resetQuery = () => {
  Object.assign(query, { pageNum: 1, pageSize: 10, applyStatus: '' })
  loadList()
}

const openAudit = (row) => {
  current.value = row
  Object.assign(auditForm, { result: '1', auditOpinion: '' })
  auditVisible.value = true
}

const submitAudit = async () => {
  const res = await auditPatientApply(current.value.applyId, auditForm.result, auditForm.auditOpinion)
  if (auditForm.result === '1') {
    ElMessage.success(res.data ? `审核通过，已创建档案（ID:${res.data}）` : '审核通过')
  } else {
    ElMessage.success('已驳回')
  }
  auditVisible.value = false
  loadList()
}

onMounted(loadList)
</script>

<style scoped>
.audit-tip {
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
  background: #f5f7fa;
  border-radius: 4px;
  padding: 10px 12px;
}
</style>