import request from '@/utils/request'

export function listBindApply(params) {
  return request({ url: '/chronic/bind/list', method: 'get', params })
}

export function auditBindApply(applyId, data) {
  return request({ url: `/chronic/bind/${applyId}/audit`, method: 'put', data })
}
