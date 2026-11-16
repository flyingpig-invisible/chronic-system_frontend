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
  return request({ url: `/chronic/measure/trend/${patientId}`, method: 'get', params })
}
