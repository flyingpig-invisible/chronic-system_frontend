<template>
  <div class="page-container">
    <div class="search-bar">
      <el-form :model="query" inline>
        <el-form-item label="患者">
          <PatientSelect v-model="query.patientId" width="220px" style="display:inline-block" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.planStatus" placeholder="全部" clearable style="width:130px">
            <el-option label="未开始" value="0" />
            <el-option label="执行中" value="1" />
            <el-option label="已完成" value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="计划名称"><el-input v-model="query.keyword" clearable style="width:160px" /></el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleQuery">搜索</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="table-card">
      <div class="table-toolbar">
        <el-button type="primary" :icon="Plus" @click="openAdd">新增计划</el-button>
      </div>
      <el-table v-loading="loading" :data="list" border stripe>
        <el-table-column prop="patientName" label="患者" width="90" />
        <el-table-column prop="planName" label="计划名称" min-width="160" />
        <el-table-column label="病种" width="100">
          <template #default="{ row }">{{ diseaseName(row.diseaseCode) }}</template>
        </el-table-column>
        <el-table-column prop="beginDate" label="开始日期" width="110" />
        <el-table-column prop="endDate" label="结束日期" width="110" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="planTag(row.planStatus)" size="small">{{ planStatusName(row.planStatus) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="executeRate" label="执行率" width="90">
          <template #default="{ row }">{{ row.executeRate }}%</template>
        </el-table-column>
        <el-table-column prop="doctorName" label="制定医生" width="100" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openEdit(row)">编辑</el-button>
            <el-button type="success" link size="small" @click="changeStatus(row)">状态</el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap">
        <el-pagination v-model:current-page="query.pageNum" v-model:page-size="query.pageSize"
          :page-sizes="[10, 20, 50]" :total="total" layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadList" @current-change="loadList" />
      </div>
    </div>

    <el-dialog v-model="dialogVisible" :title="form.planId ? '编辑计划' : '新增计划'" width="760px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-row :gutter="12">
          <el-col :span="12"><el-form-item label="患者" prop="patientId">
            <PatientSelect v-model="form.patientId" @select="(p) => (form.patientName = p ? p.name : '')" />
          </el-form-item></el-col>
          <el-col :span="12">
            <el-form-item label="病种">
              <el-select v-model="form.diseaseCode" style="width:100%">
                <el-option label="高血压" value="1" />
                <el-option label="糖尿病" value="2" />
                <el-option label="冠心病" value="3" />
                <el-option label="慢阻肺" value="4" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12"><el-form-item label="计划名称" prop="planName"><el-input v-model="form.planName" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="开始日期"><el-date-picker v-model="form.beginDate" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="结束日期"><el-date-picker v-model="form.endDate" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item></el-col>
          <el-col :span="24"><el-form-item label="目标"><el-input v-model="form.targetDesc" /></el-form-item></el-col>
        </el-row>

        <el-divider content-position="left">计划执行项</el-divider>
        <el-table :data="form.items" size="small" border>
          <el-table-column label="类型" width="120">
            <template #default="{ row }">
              <el-select v-model="row.itemType" size="small">
                <el-option label="饮食" value="1" />
                <el-option label="运动" value="2" />
                <el-option label="监测" value="3" />
                <el-option label="用药" value="4" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="内容">
            <template #default="{ row }"><el-input v-model="row.content" size="small" /></template>
          </el-table-column>
          <el-table-column label="频率" width="120">
            <template #default="{ row }"><el-input v-model="row.frequency" size="small" /></template>
          </el-table-column>
          <el-table-column label="目标值" width="120">
            <template #default="{ row }"><el-input v-model="row.targetValue" size="small" /></template>
          </el-table-column>
          <el-table-column label="操作" width="70">
            <template #default="{ $index }">
              <el-button type="danger" link size="small" @click="form.items.splice($index, 1)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-button type="primary" link :icon="Plus" style="margin-top:8px" @click="addItem">添加执行项</el-button>
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
import { Search, Refresh, Plus } from '@element-plus/icons-vue'
import { listPlan, getPlan, savePlan, delPlan, updatePlanStatus } from '@/api/plan'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const dialogVisible = ref(false)
const formRef = ref()

const query = reactive({ pageNum: 1, pageSize: 10, patientId: null, planStatus: '', keyword: '' })
const form = reactive({
  planId: null, patientId: null, patientName: '', diseaseCode: '1', planName: '',
  beginDate: '', endDate: '', targetDesc: '', planStatus: '0', items: []
})
const rules = {
  patientId: [{ required: true, message: '请输入患者ID', trigger: 'blur' }],
  planName: [{ required: true, message: '请输入计划名称', trigger: 'blur' }]
}

const diseaseName = (c) => ({ 1: '高血压', 2: '糖尿病', 3: '冠心病', 4: '慢阻肺' }[c] || '-')
const planStatusName = (s) => ({ 0: '未开始', 1: '执行中', 2: '已完成' }[s] || '-')
const planTag = (s) => ({ 0: 'info', 1: 'warning', 2: 'success' }[s] || 'info')

const loadList = async () => {
  loading.value = true
  try {
    const res = await listPlan(query)
    list.value = res.data.rows
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

const handleQuery = () => { query.pageNum = 1; loadList() }
const resetQuery = () => {
  Object.assign(query, { pageNum: 1, pageSize: 10, patientId: null, planStatus: '', keyword: '' })
  loadList()
}

const addItem = () => {
  form.items.push({ itemType: '1', content: '', frequency: '', targetValue: '' })
}

const openAdd = () => {
  Object.assign(form, {
    planId: null, patientId: null, patientName: '', diseaseCode: '1', planName: '',
    beginDate: '', endDate: '', targetDesc: '', planStatus: '0', items: []
  })
  addItem()
  dialogVisible.value = true
}

const openEdit = async (row) => {
  const res = await getPlan(row.planId)
  Object.assign(form, res.data)
  form.items = res.data.items || []
  dialogVisible.value = true
}

const handleSubmit = () => {
  formRef.value.validate(async (valid) => {
    if (!valid) return
    await savePlan(form)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadList()
  })
}

const changeStatus = (row) => {
  ElMessageBox.prompt('请输入计划状态（0未开始 1执行中 2已完成）', '修改状态', { inputValue: row.planStatus }).then(async ({ value }) => {
    await updatePlanStatus(row.planId, value)
    ElMessage.success('修改成功')
    loadList()
  })
}

const handleDelete = (row) => {
  ElMessageBox.confirm('确定删除该计划吗？', '提示', { type: 'warning' }).then(async () => {
    await delPlan(row.planId)
    ElMessage.success('删除成功')
    loadList()
  })
}

onMounted(loadList)
</script>
