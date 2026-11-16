<template>
  <div class="page-container">
    <el-row :gutter="16">
      <el-col :span="6" v-for="card in statCards" :key="card.label">
        <div class="stat-card" :class="'tone-' + card.tone">
          <div class="stat-glow"></div>
          <div class="stat-top">
            <span class="stat-label">{{ card.label }}</span>
            <div class="stat-icon">
              <el-icon :size="19"><component :is="card.icon" /></el-icon>
            </div>
          </div>
          <div class="stat-value">{{ card.value }}</div>
          <div class="stat-sub">
            <span class="sub-dot"></span>{{ card.sub }}
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top:16px">
      <el-col :span="8">
        <div class="chart-card">
          <h3 class="chart-title">预警级别分布</h3>
          <div ref="levelChartRef" class="chart" style="height:300px"></div>
        </div>
      </el-col>
      <el-col :span="16">
        <div class="chart-card">
          <h3 class="chart-title">患者风险等级分布</h3>
          <div ref="riskChartRef" class="chart" style="height:300px"></div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top:16px">
      <el-col :span="12">
        <div class="chart-card">
          <div class="table-toolbar">
            <h3 class="chart-title" style="margin:0">待处理预警</h3>
            <el-button type="primary" link @click="$router.push('/warning/list')">查看全部 »</el-button>
          </div>
          <el-table :data="pendingWarnings" size="small" height="300">
            <el-table-column prop="patientName" label="患者" width="90" />
            <el-table-column prop="indicatorName" label="指标" width="90" />
            <el-table-column prop="indicatorValue" label="数值" width="70" />
            <el-table-column label="级别" width="80">
              <template #default="{ row }">
                <el-tag :type="levelTag(row.warningLevel)" size="small">
                  {{ levelName(row.warningLevel) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="triggerTime" label="触发时间" />
          </el-table>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="chart-card">
          <div class="table-toolbar">
            <h3 class="chart-title" style="margin:0">高危患者</h3>
            <el-button type="primary" link @click="$router.push('/patient/list')">查看全部 »</el-button>
          </div>
          <el-table :data="highRiskPatients" size="small" height="300">
            <el-table-column prop="name" label="姓名" width="90" />
            <el-table-column prop="gender" label="性别" width="60">
              <template #default="{ row }">{{ row.gender === '0' ? '男' : '女' }}</template>
            </el-table-column>
            <el-table-column prop="phone" label="电话" width="130" />
            <el-table-column prop="riskScore" label="风险分" width="80" />
            <el-table-column prop="pendingWarningCount" label="待处理预警" />
          </el-table>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { onMounted, ref, nextTick } from 'vue'
import * as echarts from 'echarts'
import { User, Warning, Bell, DataLine } from '@element-plus/icons-vue'
import { getDashboard } from '@/api/patient'
import { listWarning, statWarningLevel } from '@/api/warning'
import { CDMS_THEME } from '@/utils/echartsTheme'

const statCards = ref([
  { label: '患者总数', value: 0, sub: '在管患者', tone: 'blue', icon: User },
  { label: '高危患者', value: 0, sub: '风险分 ≥ 60', tone: 'red', icon: Warning },
  { label: '待处理预警', value: 0, sub: '需及时处置', tone: 'orange', icon: Bell },
  { label: '今日监测', value: 0, sub: '条采集数据', tone: 'green', icon: DataLine }
])
const pendingWarnings = ref([])
const highRiskPatients = ref([])
const riskDist = ref([0, 0, 0])
const levelChartRef = ref()
const riskChartRef = ref()
let levelChart = null
let riskChart = null

const levelTag = (l) => ({ 1: 'info', 2: 'warning', 3: 'danger' }[l] || 'info')
const levelName = (l) => ({ 1: '低危', 2: '中危', 3: '高危' }[l] || '-')

const loadData = async () => {
  try {
    const res = await getDashboard()
    const d = res.data || {}
    statCards.value[0].value = d.patientTotal ?? d.total ?? 0
    statCards.value[1].value = d.highRiskCount ?? 0
    statCards.value[2].value = d.pendingWarningCount ?? 0
    statCards.value[3].value = d.todayMeasureCount ?? 0
    highRiskPatients.value = d.highRiskPatients || []
    riskDist.value = [d.lowRiskCount ?? 0, d.midRiskCount ?? 0, d.highRiskCount ?? 0]
    applyRiskData()
  } catch (e) {
    // 忽略
  }
}

const loadWarnings = async () => {
  try {
    const res = await listWarning({ pageNum: 1, pageSize: 10, handleStatus: '0' })
    pendingWarnings.value = res.data.rows || []
  } catch (e) {
    // 忽略
  }
}

const gradeColor = (hex) => new echarts.graphic.LinearGradient(0, 0, 0, 1, [
  { offset: 0, color: hex },
  { offset: 1, color: hex + '22' }
])

const loadLevelChart = async () => {
  let data = []
  try {
    const res = await statWarningLevel({})
    data = res.data || []
  } catch (e) {
    // 忽略
  }
  await nextTick()
  if (!levelChartRef.value) return
  levelChart = echarts.init(levelChartRef.value, CDMS_THEME)
  const colorMap = { 1: '#67c23a', 2: '#e6a23c', 3: '#f56c6c' }
  levelChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}<br/>{c} 条 ({d}%)' },
    legend: {
      bottom: 0,
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { color: '#909399', fontSize: 12 }
    },
    series: [
      {
        type: 'pie',
        radius: ['48%', '70%'],
        center: ['50%', '44%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: '#ffffff', borderWidth: 2 },
        label: { show: true, color: '#606266', fontSize: 12, formatter: '{b}\n{c}' },
        labelLine: { length: 10, length2: 12, lineStyle: { color: 'rgba(64,158,255,0.32)' } },
        data: data.map((i, idx) => ({
          name: i.name || levelName(i.level ?? idx + 1),
          value: i.count ?? i.value ?? 0,
          itemStyle: { color: colorMap[i.level ?? idx + 1] || '#409eff' }
        }))
      }
    ]
  })
  window.addEventListener('resize', () => levelChart && levelChart.resize())
}

const applyRiskData = () => {
  if (!riskChart) return
  const [low, mid, high] = riskDist.value
  riskChart.setOption({
    series: [{
      data: [
        { value: low, itemStyle: { color: gradeColor('#67c23a') } },
        { value: mid, itemStyle: { color: gradeColor('#e6a23c') } },
        { value: high, itemStyle: { color: gradeColor('#f56c6c') } }
      ]
    }]
  })
}

const loadRiskChart = () => {
  if (!riskChartRef.value) return
  riskChart = echarts.init(riskChartRef.value, CDMS_THEME)
  riskChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 50, right: 24, top: 34, bottom: 34 },
    xAxis: { type: 'category', data: ['低危', '中危', '高危'] },
    yAxis: { type: 'value', name: '人数', minInterval: 1 },
    series: [
      {
        type: 'bar',
        barWidth: 52,
        data: [
          { value: 0, itemStyle: { color: gradeColor('#67c23a') } },
          { value: 0, itemStyle: { color: gradeColor('#e6a23c') } },
          { value: 0, itemStyle: { color: gradeColor('#f56c6c') } }
        ],
        label: { show: true, position: 'top', color: '#606266', fontSize: 13, fontWeight: 600 }
      }
    ]
  })
  applyRiskData()
  window.addEventListener('resize', () => riskChart && riskChart.resize())
}

onMounted(async () => {
  await nextTick()
  loadRiskChart()
  loadLevelChart()
  loadData()
  loadWarnings()
})
</script>

<style scoped>
.stat-card {
  position: relative;
  padding: 18px 20px 16px;
  border-radius: 12px;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #e4e7ed;
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.28s, border-color 0.28s;
}
.stat-card:hover {
  transform: translateY(-3px);
  border-color: #d9ecff;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
}
.stat-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--tone);
}
.tone-blue { --tone: #409eff; }
.tone-red { --tone: #f56c6c; }
.tone-orange { --tone: #e6a23c; }
.tone-green { --tone: #67c23a; }

.stat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.stat-label {
  font-size: 13px;
  letter-spacing: 1px;
  color: #909399;
}
.stat-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--tone);
  background: #f5f7fa;
}
.stat-value {
  font-size: 34px;
  font-weight: 700;
  line-height: 1.15;
  font-family: 'DIN Alternate', Consolas, Monaco, monospace;
  letter-spacing: 1px;
  color: var(--tone);
}
.stat-sub {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}
.sub-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--tone);
}

.chart-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.6px;
  margin-bottom: 12px;
  color: #303133;
}
.chart {
  height: 280px;
}
</style>
