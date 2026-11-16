<template>
  <div class="page-container">
    <div class="search-bar">
      <el-form :model="query" inline>
        <el-form-item label="姓名">
          <el-input v-model="query.name" placeholder="患者姓名" clearable style="width:150px" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="query.phone" placeholder="手机号" clearable style="width:150px" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="风险等级">
          <el-select v-model="query.riskLevel" placeholder="全部" clearable style="width:120px">
            <el-option label="低危" value="1" />
            <el-option label="中危" value="2" />
            <el-option label="高危" value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="病种">
          <el-select v-model="query.diseaseCode" placeholder="全部" clearable style="width:130px">
            <el-option label="高血压" value="1" />
            <el-option label="糖尿病" value="2" />
            <el-option label="冠心病" value="3" />
            <el-option label="慢阻肺" value="4" />
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
        <div>
          <el-button v-permission="['chronic:patient:add']" type="primary" :icon="Plus" @click="openAdd">新增患者</el-button>
          <el-button v-permission="['chronic:patient:export']" :icon="Download" @click="handleExport">导出</el-button>
        </div>
      </div>

      <el-table v-loading="loading" :data="list" border stripe>
        <el-table-column prop="patientNo" label="患者编号" width="120" />
        <el-table-column prop="name" label="姓名" width="90" />
        <el-table-column label="性别" width="60">
          <template #default="{ row }">{{ row.gender === '0' ? '男' : row.gender === '1' ? '女' : '-' }}</template>
        </el-table-column>
        <el-table-column prop="age" label="年龄" width="60" />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column label="病种" min-width="140">
          <template #default="{ row }">
            <el-tag v-for="d in row.diseases || []" :key="d" size="small" style="margin-right:4px">{{ d }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="风险等级" width="90">
          <template #default="{ row }">
            <el-tag :type="levelTag(row.riskLevel)" size="small">{{ levelName(row.riskLevel) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="riskScore" label="风险分" width="80" />
        <el-table-column prop="pendingWarningCount" label="待处理预警" width="100">
          <template #default="{ row }">
            <el-badge v-if="row.pendingWarningCount > 0" :value="row.pendingWarningCount" type="danger" />
            <span v-else>0</span>
          </template>
        </el-table-column>
        <el-table-column prop="doctorName" label="责任医生" width="100" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="goDetail(row)">详情</el-button>
            <el-button v-permission="['chronic:patient:edit']" type="primary" link size="small" @click="openEdit(row)">编辑</el-button>
            <el-button v-permission="['chronic:patient:remove']" type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="query.pageNum"
          v-model:page-size="query.pageSize"
          :page-sizes="[10, 20, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadList"
          @current-change="loadList"
        />
      </div>
    </div>

    <el-dialog v-model="dialogVisible" :title="form.patientId ? '编辑患者' : '新增患者'" width="620px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-row :gutter="12">
          <el-col :span="12"><el-form-item label="姓名" prop="name"><el-input v-model="form.name" /></el-form-item></el-col>
          <el-col :span="12">
            <el-form-item label="性别">
              <el-radio-group v-model="form.gender">
                <el-radio value="0">男</el-radio>
                <el-radio value="1">女</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12"><el-form-item label="出生日期"><el-date-picker v-model="form.birthday" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="手机号" prop="phone"><el-input v-model="form.phone" /></el-form-item></el-col>
          <el-col :span="24"><el-form-item label="身份证"><el-input v-model="form.idCard" /></el-form-item></el-col>
          <el-col :span="24"><el-form-item label="住址"><el-input v-model="form.address" /></el-form-item></el-col>
          <el-col :span="12">
            <el-form-item label="病种">
              <el-select v-model="form.diseaseCodes" multiple style="width:100%">
                <el-option label="高血压" value="1" />
                <el-option label="糖尿病" value="2" />
                <el-option label="冠心病" value="3" />
                <el-option label="慢阻肺" value="4" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="风险等级">
              <el-select v-model="form.riskLevel" style="width:100%">
                <el-option label="低危" value="1" />
                <el-option label="中危" value="2" />
                <el-option label="高危" value="3" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="责任医师">
              <el-select v-model="form.doctorId" clearable style="width:100%">
                <el-option v-for="d in doctors" :key="d.userId" :label="d.realName" :value="d.userId" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所属科室">
              <el-select v-model="form.deptId" clearable style="width:100%">
                <el-option v-for="d in depts" :key="d.deptId" :label="d.deptName" :value="d.deptId" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
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
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus, Download } from '@element-plus/icons-vue'
import { listPatient, addPatient, updatePatient, delPatient, exportPatient } from '@/api/patient'
import { listDoctor, deptTree } from '@/api/system'

const router = useRouter()
const loading = ref(false)
const list = ref([])
const total = ref(0)
const doctors = ref([])
const depts = ref([])
const dialogVisible = ref(false)
const formRef = ref()

const query = reactive({ pageNum: 1, pageSize: 10, name: '', phone: '', riskLevel: '', diseaseCode: '' })
const form = reactive({
  patientId: null, name: '', gender: '0', birthday: '', phone: '', idCard: '', address: '',
  diseaseCodes: [], riskLevel: '1', doctorId: null, deptId: null
})
const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }]
}

const levelTag = (l) => ({ 1: 'success', 2: 'warning', 3: 'danger' }[l] || 'info')
const levelName = (l) => ({ 1: '低危', 2: '中危', 3: '高危' }[l] || '-')

const loadList = async () => {
  loading.value = true
  try {
    const res = await listPatient(query)
    list.value = res.data.rows
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  query.pageNum = 1
  loadList()
}

const resetQuery = () => {
  Object.assign(query, { pageNum: 1, pageSize: 10, name: '', phone: '', riskLevel: '', diseaseCode: '' })
  loadList()
}

const resetForm = () => {
  Object.assign(form, {
    patientId: null, name: '', gender: '0', birthday: '', phone: '', idCard: '', address: '',
    diseaseCodes: [], riskLevel: '1', doctorId: null, deptId: null
  })
}

const openAdd = () => {
  resetForm()
  dialogVisible.value = true
}

const openEdit = async (row) => {
  resetForm()
  Object.assign(form, {
    patientId: row.patientId, name: row.name, gender: row.gender, birthday: row.birthday,
    phone: row.phone, idCard: row.idCard, address: row.address,
    diseaseCodes: row.diseaseCodes || [], riskLevel: row.riskLevel,
    doctorId: row.doctorId, deptId: row.deptId
  })
  dialogVisible.value = true
}

const handleSubmit = () => {
  formRef.value.validate(async (valid) => {
    if (!valid) return
    if (form.patientId) {
      await updatePatient(form)
      ElMessage.success('修改成功')
    } else {
      await addPatient(form)
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    loadList()
  })
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定删除患者「${row.name}」吗？`, '提示', { type: 'warning' }).then(async () => {
    await delPatient(row.patientId)
    ElMessage.success('删除成功')
    loadList()
  })
}

const goDetail = (row) => {
  router.push(`/patient/detail/${row.patientId}`)
}

const handleExport = async () => {
  const res = await exportPatient(query)
  const blob = new Blob([res.data])
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '患者列表.xlsx'
  a.click()
  window.URL.revokeObjectURL(url)
}

onMounted(async () => {
  loadList()
  try {
    const d = await listDoctor()
    doctors.value = d.data || []
  } catch (e) {}
  try {
    const t = await deptTree()
    depts.value = t.data || []
  } catch (e) {}
})
</script>
