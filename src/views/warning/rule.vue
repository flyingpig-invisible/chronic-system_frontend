<template>
  <div class="page-container">
    <div class="search-bar">
      <el-form :model="query" inline>
        <el-form-item label="病种">
          <el-select v-model="query.diseaseCode" placeholder="全部" clearable style="width:130px">
            <el-option label="高血压" value="1" />
            <el-option label="糖尿病" value="2" />
            <el-option label="冠心病" value="3" />
            <el-option label="慢阻肺" value="4" />
          </el-select>
        </el-form-item>
        <el-form-item label="级别">
          <el-select v-model="query.warningLevel" placeholder="全部" clearable style="width:110px">
            <el-option label="低危" value="1" />
            <el-option label="中危" value="2" />
            <el-option label="高危" value="3" />
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
        <el-button type="primary" :icon="Plus" @click="openAdd">新增规则</el-button>
      </div>
      <el-table v-loading="loading" :data="list" border stripe>
        <el-table-column prop="ruleName" label="规则名称" min-width="150" />
        <el-table-column label="病种" width="100">
          <template #default="{ row }">{{ diseaseName(row.diseaseCode) }}</template>
        </el-table-column>
        <el-table-column prop="indicatorName" label="指标" width="110" />
        <el-table-column label="条件" width="140">
          <template #default="{ row }">{{ row.indicatorName }} {{ row.operator }} {{ row.thresholdValue }}</template>
        </el-table-column>
        <el-table-column label="级别" width="80">
          <template #default="{ row }">
            <el-tag :type="levelTag(row.warningLevel)" size="small">{{ levelName(row.warningLevel) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="durationMinutes" label="持续(分钟)" width="100" />
        <el-table-column prop="actionDesc" label="处置建议" min-width="160" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === '0' ? 'success' : 'info'" size="small">{{ row.status === '0' ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="130" fixed="right">
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

    <el-dialog v-model="dialogVisible" :title="form.ruleId ? '编辑规则' : '新增规则'" width="540px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="规则名称" prop="ruleName"><el-input v-model="form.ruleName" /></el-form-item>
        <el-form-item label="病种" prop="diseaseCode">
          <el-select v-model="form.diseaseCode" style="width:100%">
            <el-option label="高血压" value="1" />
            <el-option label="糖尿病" value="2" />
            <el-option label="冠心病" value="3" />
            <el-option label="慢阻肺" value="4" />
          </el-select>
        </el-form-item>
        <el-form-item label="指标" prop="indicatorCode">
          <el-select v-model="form.indicatorCode" style="width:100%" @change="onIndicatorChange">
            <el-option v-for="i in indicators" :key="i.code" :label="i.name" :value="i.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="运算符" prop="operator">
          <el-select v-model="form.operator" style="width:100%">
            <el-option label="大于等于 (>=)" value=">=" />
            <el-option label="大于 (>)" value=">" />
            <el-option label="小于等于 (<=)" value="<=" />
            <el-option label="小于 (<)" value="<" />
            <el-option label="等于 (=)" value="=" />
          </el-select>
        </el-form-item>
        <el-form-item label="阈值" prop="thresholdValue">
          <el-input-number v-model="form.thresholdValue" :precision="2" style="width:100%" />
        </el-form-item>
        <el-form-item label="预警级别" prop="warningLevel">
          <el-radio-group v-model="form.warningLevel">
            <el-radio value="1">低危</el-radio>
            <el-radio value="2">中危</el-radio>
            <el-radio value="3">高危</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="持续分钟"><el-input-number v-model="form.durationMinutes" :min="0" style="width:100%" /></el-form-item>
        <el-form-item label="处置建议"><el-input v-model="form.actionDesc" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="0">启用</el-radio>
            <el-radio value="1">停用</el-radio>
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
import { Search, Refresh, Plus } from '@element-plus/icons-vue'
import { listRule, addRule, updateRule, delRule } from '@/api/warning'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const dialogVisible = ref(false)
const formRef = ref()

const indicators = [
  { code: 'sbp', name: '收缩压' }, { code: 'dbp', name: '舒张压' }, { code: 'hr', name: '心率' },
  { code: 'spo2', name: '血氧SpO2' }, { code: 'glu', name: '血糖' }, { code: 'rr', name: '呼吸频率' }
]

const query = reactive({ pageNum: 1, pageSize: 10, diseaseCode: '', warningLevel: '' })
const form = reactive({
  ruleId: null, ruleName: '', diseaseCode: '1', indicatorCode: 'sbp', indicatorName: '收缩压',
  operator: '>=', thresholdValue: 140, warningLevel: '1', durationMinutes: 0, actionDesc: '', status: '0'
})
const rules = {
  ruleName: [{ required: true, message: '请输入规则名称', trigger: 'blur' }],
  thresholdValue: [{ required: true, message: '请输入阈值', trigger: 'blur' }]
}

const levelTag = (l) => ({ 1: 'info', 2: 'warning', 3: 'danger' }[l] || 'info')
const levelName = (l) => ({ 1: '低危', 2: '中危', 3: '高危' }[l] || '-')
const diseaseName = (c) => ({ 1: '高血压', 2: '糖尿病', 3: '冠心病', 4: '慢阻肺' }[c] || '-')

const loadList = async () => {
  loading.value = true
  try {
    const res = await listRule(query)
    list.value = res.data.rows
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

const handleQuery = () => { query.pageNum = 1; loadList() }
const resetQuery = () => {
  Object.assign(query, { pageNum: 1, pageSize: 10, diseaseCode: '', warningLevel: '' })
  loadList()
}

const onIndicatorChange = (code) => {
  const i = indicators.find((x) => x.code === code)
  form.indicatorName = i ? i.name : ''
}

const openAdd = () => {
  Object.assign(form, {
    ruleId: null, ruleName: '', diseaseCode: '1', indicatorCode: 'sbp', indicatorName: '收缩压',
    operator: '>=', thresholdValue: 140, warningLevel: '1', durationMinutes: 0, actionDesc: '', status: '0'
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
    if (form.ruleId) {
      await updateRule(form)
      ElMessage.success('修改成功')
    } else {
      await addRule(form)
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    loadList()
  })
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定删除规则「${row.ruleName}」吗？`, '提示', { type: 'warning' }).then(async () => {
    await delRule(row.ruleId)
    ElMessage.success('删除成功')
    loadList()
  })
}

onMounted(loadList)
</script>
