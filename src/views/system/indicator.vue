<template>
  <div class="page-container">
    <div class="search-bar">
      <el-form :model="query" inline>
        <el-form-item label="关键字">
          <el-input v-model="query.keyword" placeholder="指标名称或编码" clearable style="width:200px"
            @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width:110px">
            <el-option label="正常" value="0" />
            <el-option label="停用" value="1" />
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
        <el-button v-permission="['system:indicator:add']" type="primary" :icon="Plus" @click="openAdd">新增指标</el-button>
        <span class="toolbar-tip">指标为系统级主数据，不归属任何病种；停用的指标不会出现在录入等下拉中。</span>
      </div>

      <el-table v-loading="loading" :data="list" border stripe row-key="indicatorId">
        <el-table-column prop="indicatorId" label="ID" width="70" />
        <el-table-column prop="indicatorCode" label="指标编码" width="150">
          <template #default="{ row }">
            <span class="code-text">{{ row.indicatorCode }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="indicatorName" label="指标名称" min-width="140" />
        <el-table-column prop="unit" label="单位" width="110">
          <template #default="{ row }">{{ row.unit || '-' }}</template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="80" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === '0' ? 'success' : 'info'" size="small">
              {{ row.status === '0' ? '正常' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="160">
          <template #default="{ row }">{{ row.remark || '-' }}</template>
        </el-table-column>
        <el-table-column prop="updateTime" label="更新时间" width="170">
          <template #default="{ row }">{{ formatTime(row.updateTime || row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button v-permission="['system:indicator:edit']" type="primary" link size="small" @click="openEdit(row)">编辑</el-button>
            <el-button v-permission="['system:indicator:remove']" type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination v-model:current-page="query.pageNum" v-model:page-size="query.pageSize"
          :page-sizes="[10, 20, 50]" :total="total" layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadList" @current-change="loadList" />
      </div>
    </div>

    <el-dialog v-model="dialogVisible" :title="form.indicatorId ? '编辑指标' : '新增指标'" width="480px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="指标编码" prop="indicatorCode">
          <el-input v-model="form.indicatorCode" placeholder="如 sbp，全局唯一" :disabled="!!form.indicatorId" />
        </el-form-item>
        <el-form-item label="指标名称" prop="indicatorName">
          <el-input v-model="form.indicatorName" placeholder="如 收缩压" />
        </el-form-item>
        <el-form-item label="单位" prop="unit">
          <el-input v-model="form.unit" placeholder="如 mmHg" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" style="width:100%" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="0">正常</el-radio>
            <el-radio value="1">停用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import { listIndicator, addIndicator, updateIndicator, delIndicator } from '@/api/system'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const dialogVisible = ref(false)
const formRef = ref()

const query = reactive({ pageNum: 1, pageSize: 10, keyword: '', status: '' })
const form = reactive({
  indicatorId: null, indicatorCode: '', indicatorName: '', unit: '', sort: 0, status: '0', remark: ''
})

const rules = {
  indicatorCode: [
    { required: true, message: '请输入指标编码', trigger: 'blur' },
    { pattern: /^[A-Za-z][A-Za-z0-9_]{0,31}$/, message: '需以字母开头，仅可包含字母、数字和下划线', trigger: 'blur' }
  ],
  indicatorName: [{ required: true, message: '请输入指标名称', trigger: 'blur' }]
}

/** 后端返回 ISO 时间（2026-11-19T19:43:35），统一转成 yyyy-MM-dd HH:mm:ss */
const formatTime = (v) => (v ? String(v).replace('T', ' ').slice(0, 19) : '-')

const loadList = async () => {
  loading.value = true
  try {
    const res = await listIndicator(query)
    list.value = res.data.rows || []
    total.value = res.data.total || 0
  } finally {
    loading.value = false
  }
}

const handleQuery = () => { query.pageNum = 1; loadList() }
const resetQuery = () => {
  Object.assign(query, { pageNum: 1, pageSize: 10, keyword: '', status: '' })
  loadList()
}

const openAdd = () => {
  Object.assign(form, { indicatorId: null, indicatorCode: '', indicatorName: '', unit: '', sort: 0, status: '0', remark: '' })
  dialogVisible.value = true
}

const openEdit = (row) => {
  Object.assign(form, {
    indicatorId: row.indicatorId, indicatorCode: row.indicatorCode, indicatorName: row.indicatorName,
    unit: row.unit || '', sort: row.sort ?? 0, status: row.status || '0', remark: row.remark || ''
  })
  dialogVisible.value = true
}

const submitForm = () => {
  formRef.value.validate(async (valid) => {
    if (!valid) return
    if (form.indicatorId) {
      await updateIndicator(form)
      ElMessage.success('修改成功')
    } else {
      await addIndicator(form)
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    loadList()
  })
}

const handleDelete = (row) => {
  ElMessageBox.confirm(
    `确定删除指标「${row.indicatorName}」吗？删除后已录入的历史监测数据不受影响。`,
    '提示',
    { type: 'warning' }
  ).then(async () => {
    await delIndicator(row.indicatorId)
    ElMessage.success('删除成功')
    loadList()
  }).catch(() => {})
}

onMounted(loadList)
</script>

<style scoped>
.toolbar-tip {
  margin-left: 12px;
  font-size: 12px;
  color: var(--t-dim);
}
.code-text {
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
  color: var(--t-main);
}
</style>