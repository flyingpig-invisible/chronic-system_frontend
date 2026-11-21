<template>
  <div class="page-container">
    <div class="search-bar">
      <el-form inline>
        <el-form-item label="患者">
          <PatientSelect v-model="patientId" width="220px" style="display:inline-block" />
        </el-form-item>
        <el-form-item label="指标">
          <el-select v-model="indicatorCode" placeholder="请选择指标" filterable style="width:180px">
            <el-option v-for="i in indicators" :key="i.indicatorCode" :label="i.indicatorName" :value="i.indicatorCode">
              <span>{{ i.indicatorName }}</span>
              <span class="option-unit">{{ i.unit || '' }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-radio-group v-model="rangeType" @change="onRangeChange">
            <el-radio-button label="7">近7天</el-radio-button>
            <el-radio-button label="30">近30天</el-radio-button>
            <el-radio-button label="90">近90天</el-radio-button>
            <el-radio-button label="all">全部</el-radio-button>
            <el-radio-button label="custom">自定义</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="rangeType === 'custom'">
          <el-date-picker
            v-model="customRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width:260px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="loadTrend">查询</el-button>
        </el-form-item>
      </el-form>
    </div>
    <div class="chart-card">
      <div v-show="hasData" ref="chartRef" style="height:420px"></div>
      <el-empty v-if="!hasData" description="该时间范围内暂无监测数据" :image-size="80" />
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, nextTick } from 'vue'
import * as echarts from 'echarts'
import { Search } from '@element-plus/icons-vue'
import PatientSelect from '@/components/PatientSelect.vue'
import { getMeasureTrend } from '@/api/measure'
import { indicatorOptions } from '@/api/system'
import { CDMS_THEME } from '@/utils/echartsTheme'

const patientId = ref(null)
const indicatorCode = ref('')
const indicators = ref([])
const rangeType = ref('30')
const customRange = ref([])
const chartRef = ref()
const hasData = ref(false)
let chart = null

const currentIndicator = computed(() => indicators.value.find((i) => i.indicatorCode === indicatorCode.value))

/** 把日期区间转成后端需要的 yyyy-MM-dd HH:mm:ss */
const buildTimeParams = () => {
  if (rangeType.value === 'all') {
    return {}
  }
  if (rangeType.value === 'custom') {
    // 自定义但没选日期时不查，避免误拉全量
    if (!customRange.value || customRange.value.length !== 2) {
      return null
    }
    return { beginTime: `${customRange.value[0]} 00:00:00`, endTime: `${customRange.value[1]} 23:59:59` }
  }
  const begin = new Date()
  begin.setDate(begin.getDate() - (Number(rangeType.value) - 1))
  begin.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 0)
  const fmt = (d) => {
    const p = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  }
  return { beginTime: fmt(begin), endTime: fmt(end) }
}

const onRangeChange = (val) => {
  // 切到「自定义」时默认带上近30天，方便直接调整
  if (val === 'custom' && (!customRange.value || customRange.value.length !== 2)) {
    const end = new Date()
    const begin = new Date()
    begin.setDate(begin.getDate() - 29)
    const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    customRange.value = [fmtDate(begin), fmtDate(end)]
  }
  loadTrend()
}

const loadTrend = async () => {
  if (!patientId.value || !indicatorCode.value) {
    hasData.value = false
    chart?.clear()
    return
  }
  const timeParams = buildTimeParams()
  if (timeParams === null) {
    hasData.value = false
    chart?.clear()
    return
  }
  const res = await getMeasureTrend(patientId.value, { indicatorCode: indicatorCode.value, ...timeParams })
  const rows = res.data || []
  hasData.value = rows.length > 0
  await nextTick()
  if (!chartRef.value) return
  if (!chart) chart = echarts.init(chartRef.value, CDMS_THEME)
  if (!rows.length) {
    chart.clear()
    return
  }
  // 接口按时间升序返回；个别同一时刻的记录按录入顺序稳定展示
  const unit = currentIndicator.value?.unit || rows[rows.length - 1].unit || ''
  const name = currentIndicator.value?.indicatorName || rows[rows.length - 1].indicatorName || '指标'
  chart.setOption(
    {
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          const p = params[0]
          const row = rows[p.dataIndex]
          const flag = row.abnormalFlag === '1' ? '<span style="color:#f56c6c">（异常）</span>' : ''
          return `${p.axisValue}<br/>${name}：<b>${p.data}${unit}</b>${flag}`
        }
      },
      grid: { left: 55, right: 25, top: 40, bottom: 60 },
      title: { text: `${name} 趋势`, left: 'center' },
      xAxis: {
        type: 'category',
        data: rows.map((r) => (r.measureTime || '').replace('T', ' ').slice(5, 16)),
        axisLabel: { rotate: 35 }
      },
      yAxis: { type: 'value', name: unit, scale: true },
      series: [
        {
          type: 'line',
          smooth: true,
          symbolSize: 6,
          data: rows.map((r) => r.value),
          itemStyle: { color: (p) => (rows[p.dataIndex].abnormalFlag === '1' ? '#f56c6c' : '#409eff') },
          areaStyle: {
            opacity: 0.28,
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(64,158,255,0.62)' },
              { offset: 1, color: 'rgba(64,158,255,0.02)' }
            ])
          },
          markPoint: { data: [{ type: 'max', name: '最大值' }, { type: 'min', name: '最小值' }] }
        }
      ],
      color: ['#409eff']
    },
    true
  )
  chart.resize()
}

const initIndicators = async () => {
  const res = await indicatorOptions()
  indicators.value = res.data || []
  if (indicators.value.length) {
    indicatorCode.value = indicators.value.some((i) => i.indicatorCode === 'sbp') ? 'sbp' : indicators.value[0].indicatorCode
  }
}

const resize = () => chart?.resize()

onMounted(async () => {
  window.addEventListener('resize', resize)
  await initIndicators()
  if (patientId.value) loadTrend()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  chart?.dispose()
  chart = null
})
</script>

<style scoped>
.option-unit {
  float: right;
  color: #909399;
  font-size: 12px;
}
</style>