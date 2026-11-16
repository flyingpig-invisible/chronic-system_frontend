import * as echarts from 'echarts'

/**
 * 浅色主题 ECharts 主题
 * 用法：echarts.init(dom, 'cdms')
 */
export const CDMS_THEME = 'cdms'

const axisLine = { lineStyle: { color: '#dcdfe6' } }
const axisLabel = { color: '#606266', fontSize: 12 }
const splitLine = { lineStyle: { color: '#ebeef5', type: 'dashed' } }

const theme = {
  color: ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399', '#337ecc', '#6b7fd7'],
  backgroundColor: 'transparent',
  textStyle: { color: '#606266', fontFamily: 'Helvetica Neue, PingFang SC, Microsoft YaHei, sans-serif' },
  title: {
    textStyle: { color: '#303133', fontSize: 15, fontWeight: 600 },
    subtextStyle: { color: '#909399' }
  },
  legend: { textStyle: { color: '#606266' } },
  tooltip: {
    backgroundColor: '#ffffff',
    borderColor: '#e4e7ed',
    borderWidth: 1,
    textStyle: { color: '#303133', fontSize: 12 },
    extraCssText: 'border-radius: 8px; box-shadow: 0 6px 18px rgba(0,0,0,0.1);'
  },
  categoryAxis: {
    axisLine,
    axisTick: { show: false },
    axisLabel,
    splitLine: { show: false }
  },
  valueAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel,
    splitLine,
    nameTextStyle: { color: '#909399' }
  },
  line: {
    smooth: true,
    symbol: 'circle',
    symbolSize: 7,
    lineStyle: { width: 2 },
    itemStyle: { borderWidth: 2, borderColor: '#ffffff' }
  },
  bar: {
    itemStyle: { borderRadius: [4, 4, 0, 0] },
    barMaxWidth: 34
  },
  pie: {
    itemStyle: { borderColor: '#ffffff', borderWidth: 2 },
    label: { color: '#606266' },
    labelLine: { lineStyle: { color: '#dcdfe6' } }
  },
  radar: {
    axisLine: { lineStyle: { color: '#e4e7ed' } },
    splitLine: { lineStyle: { color: '#ebeef5' } },
    splitArea: { areaStyle: { color: ['#ffffff', '#f5f7fa'] } },
    axisName: { color: '#606266' }
  },
  gauge: {
    axisLine: { lineStyle: { color: [[1, '#ebeef5']] } },
    splitLine: { lineStyle: { color: '#dcdfe6' } },
    axisLabel: { color: '#909399' },
    detail: { color: '#409eff' },
    title: { color: '#606266' }
  }
}

let registered = false
export function registerCdmsTheme() {
  if (registered) return
  echarts.registerTheme(CDMS_THEME, theme)
  registered = true
}

export default theme
