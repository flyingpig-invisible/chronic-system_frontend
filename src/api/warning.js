import request from '@/utils/request'

export function listWarning(params) {
  return request({ url: '/chronic/warning/list', method: 'get', params })
}

export function getWarning(warningId) {
  return request({ url: `/chronic/warning/${warningId}`, method: 'get' })
}

export function handleWarning(warningId, data) {
  return request({ url: `/chronic/warning/${warningId}/handle`, method: 'put', data })
}

export function linkEmergency(warningId, data) {
  return request({ url: `/chronic/warning/${warningId}/emergency`, method: 'post', data })
}

export function emergencyByWarning(warningId) {
  return request({ url: `/chronic/warning/${warningId}/emergency/list`, method: 'get' })
}

export function listEmergency(params) {
  return request({ url: '/chronic/warning/emergency/list', method: 'get', params })
}

export function statWarningLevel(params) {
  return request({ url: '/chronic/warning/stat/level', method: 'get', params })
}

export function statWarningResponse(params) {
  return request({ url: '/chronic/warning/stat/response', method: 'get', params })
}

export function exportWarning(params) {
  return request({ url: '/chronic/warning/export', method: 'post', params, responseType: 'blob' })
}

export function listRule(params) {
  return request({ url: '/chronic/rule/list', method: 'get', params })
}

export function getRule(ruleId) {
  return request({ url: `/chronic/rule/${ruleId}`, method: 'get' })
}

export function addRule(data) {
  return request({ url: '/chronic/rule', method: 'post', data })
}

export function updateRule(data) {
  return request({ url: '/chronic/rule', method: 'put', data })
}

export function delRule(ruleIds) {
  return request({ url: `/chronic/rule/${ruleIds}`, method: 'delete' })
}
