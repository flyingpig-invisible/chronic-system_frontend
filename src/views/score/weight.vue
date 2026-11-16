<template>
  <div class="page-container">
    <div class="search-bar">
      <el-form :model="query" inline>
        <el-form-item label="病种">
          <el-select v-model="query.diseaseCode" placeholder="全部" clearable style="width:150px" @change="loadList">
            <el-option label="高血压" value="1" />
            <el-option label="糖尿病" value="2" />
            <el-option label="冠心病" value="3" />
            <el-option label="慢阻肺" value="4" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>

    <div class="table-card">
      <div class="table-toolbar">
        <el-button type="primary" :icon="Plus" @click="openAdd">新增权重</el-button>
      </div>
      <el-table v-loading="loading" :data="list" border stripe>
        <el-table-column prop="weightId" label="ID" width="70" />
        <el-table-column label="病种" width="120">
          <template #default="{ row }">{{ diseaseName(row.diseaseCode) }}</template>
        </el-table-column>
        <el-table-column prop="indicatorName" label="指标" width="140" />
        <el-table-column prop="indicatorCode" label="指标编码" width="120" />
        <el-table-column prop="weight" label="权重(0-1)" width="130" />
        <el-table-column label="权重占比" min-width="200">
          <template #default="{ row }">
            <el-progress :percentage="Math.round(row.weight * 100)" />
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" title="新增评分权重" width="460px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
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
        <el-form-item label="权重" prop="weight">
          <el-input-number v-model="form.weight" :min="0" :max="1" :step="0.05" :precision="2" style="width:100%" />
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
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { listWeight, saveWeight } from '@/api/score'

const loading = ref(false)
const list = ref([])
const dialogVisible = ref(false)
const formRef = ref()

const indicators = [
  { code: 'sbp', name: '收缩压' }, { code: 'dbp', name: '舒张压' }, { code: 'hr', name: '心率' },
  { code: 'spo2', name: '血氧SpO2' }, { code: 'glu', name: '血糖' }, { code: 'rr', name: '呼吸频率' }
]

const query = reactive({ diseaseCode: '' })
const form = reactive({ diseaseCode: '1', indicatorCode: 'sbp', indicatorName: '收缩压', weight: 0.3 })
const rules = {
  diseaseCode: [{ required: true, message: '请选择病种', trigger: 'change' }],
  indicatorCode: [{ required: true, message: '请选择指标', trigger: 'change' }],
  weight: [{ required: true, message: '请输入权重', trigger: 'blur' }]
}

const diseaseName = (c) => ({ 1: '高血压', 2: '糖尿病', 3: '冠心病', 4: '慢阻肺' }[c] || '-')

const loadList = async () => {
  loading.value = true
  try {
    const res = await listWeight(query)
    list.value = res.data || []
  } finally {
    loading.value = false
  }
}

const onIndicatorChange = (code) => {
  const i = indicators.find((x) => x.code === code)
  form.indicatorName = i ? i.name : ''
}

const openAdd = () => {
  Object.assign(form, { diseaseCode: '1', indicatorCode: 'sbp', indicatorName: '收缩压', weight: 0.3 })
  dialogVisible.value = true
}

const handleSubmit = () => {
  formRef.value.validate(async (valid) => {
    if (!valid) return
    await saveWeight(form)
    ElMessage.success('新增成功')
    dialogVisible.value = false
    loadList()
  })
}

onMounted(loadList)
</script>
