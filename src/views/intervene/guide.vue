<template>
  <div class="page-container">
    <div class="search-bar">
      <el-form :model="query" inline>
        <el-form-item label="患者">
          <PatientSelect v-model="query.patientId" width="220px" style="display:inline-block" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="query.guideType" placeholder="全部" clearable style="width:130px">
            <el-option label="调药" value="1" />
            <el-option label="用药提醒" value="2" />
            <el-option label="饮食推荐" value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.readStatus" placeholder="全部" clearable style="width:110px">
            <el-option label="未读" value="0" />
            <el-option label="已读" value="1" />
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
        <el-button type="primary" :icon="Plus" @click="openAdd">新增指导</el-button>
        <el-tag type="success" effect="dark" style="margin-left:12px">v2026-10-07 22:55 修复版</el-tag>
      </div>
      <el-table v-loading="loading" :data="list" border stripe>
        <el-table-column prop="patientName" label="患者" width="90" />
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag size="small">{{ guideTypeName(row.guideType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="指导内容" min-width="240" show-overflow-tooltip />
        <el-table-column prop="doctorName" label="医生" width="100" />
        <el-table-column prop="guideTime" label="指导时间" width="170" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.readStatus === '1' ? 'success' : 'warning'" size="small">
              {{ row.readStatus === '1' ? '已读' : '未读' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openEdit(row)">编辑</el-button>
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

    <el-dialog v-model="dialogVisible" :title="form.guideId ? '编辑指导' : '新增指导'" width="540px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="患者" prop="patientId">
          <PatientSelect v-model="form.patientId" @select="(p) => (form.patientName = p ? p.name : '')" />
        </el-form-item>
        <el-form-item label="关联预警"><el-input-number v-model="form.warningId" :min="1" style="width:100%" placeholder="可空" /></el-form-item>
        <el-form-item label="指导类型" prop="guideType">
          <el-select v-model="form.guideType" style="width:100%">
            <el-option label="调药" value="1" />
            <el-option label="用药提醒" value="2" />
            <el-option label="饮食推荐" value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="指导内容" prop="content"><el-input v-model="form.content" type="textarea" :rows="4" /></el-form-item>
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
import { listGuide, addGuide, updateGuide, delGuide } from '@/api/guide'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const dialogVisible = ref(false)
const formRef = ref()

const query = reactive({ pageNum: 1, pageSize: 10, patientId: null, guideType: '', readStatus: '' })
const form = reactive({ guideId: null, patientId: null, patientName: '', warningId: null, guideType: '1', content: '' })
const rules = {
  patientId: [{ required: true, message: '请输入患者ID', trigger: 'blur' }],
  content: [{ required: true, message: '请输入指导内容', trigger: 'blur' }]
}

const guideTypeName = (t) => ({ 1: '调药', 2: '用药提醒', 3: '饮食推荐' }[t] || '-')

const loadList = async () => {
  loading.value = true
  try {
    const res = await listGuide(query)
    list.value = res.data.rows
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

const handleQuery = () => { query.pageNum = 1; loadList() }
const resetQuery = () => {
  Object.assign(query, { pageNum: 1, pageSize: 10, patientId: null, guideType: '', readStatus: '' })
  loadList()
}

const openAdd = () => {
  Object.assign(form, { guideId: null, patientId: null, patientName: '', warningId: null, guideType: '1', content: '' })
  dialogVisible.value = true
}

const openEdit = (row) => {
  Object.assign(form, row)
  dialogVisible.value = true
}

const handleSubmit = () => {
  formRef.value.validate(async (valid) => {
    if (!valid) return
    if (form.guideId) {
      await updateGuide(form)
      ElMessage.success('修改成功')
    } else {
      await addGuide(form)
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    loadList()
  })
}

const handleDelete = (row) => {
  ElMessageBox.confirm('确定删除该指导吗？', '提示', { type: 'warning' }).then(async () => {
    await delGuide(row.guideId)
    ElMessage.success('删除成功')
    loadList()
  })
}

onMounted(loadList)
</script>
