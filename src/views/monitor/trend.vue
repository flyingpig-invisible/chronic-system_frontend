<template>
  <div class="page-container">
    <div class="search-bar">
      <el-form inline>
        <el-form-item label="患者">
          <PatientSelect v-model="patientId" width="220px" style="display:inline-block" />
        </el-form-item>
        <el-form-item label="指标">
          <el-select v-model="indicatorCode" style="width:130px">
            <el-option v-for="i in indicators" :key="i.code" :label="i.name" :value="i.code" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="loadTrend">查询</el-button>
        </el-form-item>
      </el-form>
    </div>
    <div class="chart-card">
      <div ref="chartRef" style="height:420px"></div>
      <el-empty v-if="!hasData" description="暂无数据" :image-size="80" />
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, nextTick } from 'vue'
import * as echarts from 'echarts'
import { Search } from '@element-plus/icons-vue'
import { listMeasure } from '@/api/measure'
import { CDMS_THEME } from '@/utils/echartsTheme'

const patientId = ref(1)
const indicatorCode = ref('sbp')
const chartRef = ref()
const hasData = ref(false)
let chart = null

const indicators = [
  { code: 'sbp', name: '收缩压' }, { code: 'dbp', name: '舒张压' }, { code: 'hr', name: '心率' },
  { code: 'spo2', name: '血氧SpO2' }, { code: 'glu', name: '血糖' }, { code: 'rr', name: '呼吸频率' }
]

const loadTrend = async () => {
  const res = await listMeasure({ patientId: patientId.value, indicatorCode: indicatorCode.value, pageNum: 1, pageSize: 50 })
  const rows = (res.data.rows || []).reverse()
  hasData.value = rows.length > 0
  await nextTick()
  if (!chartRef.value) return
  if (!chart) chart = echarts.init(chartRef.value, CDMS_THEME)
  const unit = rows.length ? rows[0].unit : ''
  chart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 50, right: 25, top: 40, bottom: 60 },
    title: { text: (indicators.find((i) => i.code === indicatorCode.value)?.name || '指标') + ' 趋势', left: 'center' },
    xAxis: { type: 'category', data: rows.map((r) => (r.measureTime || '').replace('T', ' ').slice(5, 16)), axisLabel: { rotate: 35 } },
    yAxis: { type: 'value', name: unit },
    series: [
      {
        type: 'line',
        smooth: true,
        data: rows.map((r) => r.value),
        areaStyle: { opacity: 0.28, color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(64,158,255,0.62)' }, { offset: 1, color: 'rgba(64,158,255,0.02)' }]) },
        markPoint: { data: [{ type: 'max', name: '最大值' }, { type: 'min', name: '最小值' }] }
      }
    ],
    color: ['#409eff']
  })
  chart.resize()
}

onMounted(loadTrend)
</script>
