<template>
  <div class="page-container">
    <div class="search-bar">
      <el-form :model="query" inline>
        <el-form-item label="患者">
          <PatientSelect v-model="query.patientId" width="220px" style="display:inline-block" />
        </el-form-item>
        <el-form-item label="风险等级">
          <el-select v-model="query.riskLevel" placeholder="全部" clearable style="width:120px">
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
        <div style="display:flex;gap:8px">
          <PatientSelect v-model="calcPatientId" width="240px" placeholder="选择患者后计算评分" />
          <el-button type="primary" @click="handleCalc">计算评分</el-button>
        </div>
      </div>
      <el-table v-loading="loading" :data="list" border stripe>
        <el-table-column prop="scoreId" label="ID" width="70" />
        <el-table-column label="患者" width="120">
          <template #default="{ row }">
            <span v-if="row.patientName">{{ row.patientName }}</span>
            <span v-else style="color:#909399">ID:{{ row.patientId }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="totalScore" label="风险评分" width="100">
          <template #default="{ row }">
            <b :style="{ color: levelColor(row.riskLevel) }">{{ row.totalScore }}</b>
          </template>
        </el-table-column>
        <el-table-column label="风险等级" width="100">
          <template #default="{ row }">
            <el-tag :type="levelTag(row.riskLevel)" size="small">{{ levelName(row.riskLevel) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="触发来源" width="100">
          <template #default="{ row }">{{ triggerName(row.triggerType) }}</template>
        </el-table-column>
        <el-table-column prop="detailJson" label="评分明细" min-width="260" show-overflow-tooltip />
        <el-table-column prop="calcTime" label="计算时间" width="170" />
      </el-table>
      <div class="pagination-wrap">
        <el-pagination v-model:current-page="query.pageNum" v-model:page-size="query.pageSize"
          :page-sizes="[10, 20, 50]" :total="total" layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadList" @current-change="loadList" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { listScore, calcScore } from '@/api/score'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const calcPatientId = ref(1)

const query = reactive({ pageNum: 1, pageSize: 10, patientId: null, riskLevel: '' })

const levelTag = (l) => ({ 1: 'success', 2: 'warning', 3: 'danger' }[l] || 'info')
const levelName = (l) => ({ 1: '低危', 2: '中危', 3: '高危' }[l] || '-')
const levelColor = (l) => ({ 1: '#67c23a', 2: '#e6a23c', 3: '#f56c6c' }[l] || '#909399')
const triggerName = (t) => ({ 1: '监测', 2: '干预', 3: '定时' }[t] || '-')

const loadList = async () => {
  loading.value = true
  try {
    const res = await listScore(query)
    list.value = res.data.rows
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

const handleQuery = () => { query.pageNum = 1; loadList() }
const resetQuery = () => {
  Object.assign(query, { pageNum: 1, pageSize: 10, patientId: null, riskLevel: '' })
  loadList()
}

const handleCalc = async () => {
  if (!calcPatientId.value) {
    ElMessage.warning('请输入患者ID')
    return
  }
  const res = await calcScore(calcPatientId.value)
  ElMessage.success(`计算完成：${res.data.totalScore} 分（${res.data.riskLevelName}）`)
  loadList()
}

onMounted(loadList)
</script>
