import request from '@/utils/request'

export function listRemind(params) {
  return request({ url: '/chronic/remind/list', method: 'get', params })
}

export function getRemind(remindId) {
  return request({ url: `/chronic/remind/${remindId}`, method: 'get' })
}

export function saveRemind(data) {
  return request({ url: '/chronic/remind', method: 'post', data })
}

export function changeRemindStatus(remindId, status) {
  return request({ url: `/chronic/remind/${remindId}/status`, method: 'put', params: { status } })
}

export function delRemind(remindIds) {
  return request({ url: `/chronic/remind/${remindIds}`, method: 'delete' })
}

export function todayLog(patientId) {
  return request({ url: `/chronic/remind/today/${patientId}`, method: 'get' })
}

export function checkRemind(remindId, checkStatus) {
  return request({ url: `/chronic/remind/${remindId}/check`, method: 'put', params: { checkStatus } })
}
