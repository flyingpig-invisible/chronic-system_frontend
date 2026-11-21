import request from '@/utils/request'

export function listMeasure(params) {
  return request({ url: '/chronic/measure/list', method: 'get', params })
}

export function getMeasure(measureId) {
  return request({ url: `/chronic/measure/${measureId}`, method: 'get' })
}

export function addMeasure(data) {
  return request({ url: '/chronic/measure', method: 'post', data })
}

export function addMeasureOnce(data) {
  return request({ url: '/chronic/measure/once', method: 'post', data })
}

export function addMeasureBatch(data) {
  return request({ url: '/chronic/measure/batch', method: 'post', data })
}

export function listMeasureGrouped(params) {
  return request({ url: '/chronic/measure/grouped', method: 'get', params })
}

export function delMeasureGroup(patientId, measureTime) {
  return request({ url: '/chronic/measure/group/delete', method: 'delete', params: { patientId, measureTime } })
}

export function delMeasure(measureIds) {
  return request({ url: `/chronic/measure/${measureIds}`, method: 'delete' })
}

export function getMeasureTrend(patientId, params) {
  // 后端趋势接口挂在患者模块下：/chronic/patient/{patientId}/trend
  return request({ url: `/chronic/patient/${patientId}/trend`, method: 'get', params })
}
