import request from '@/utils/request'

export function listScore(params) {
  return request({ url: '/chronic/score/list', method: 'get', params })
}

export function calcScore(patientId) {
  return request({ url: `/chronic/score/calc/${patientId}`, method: 'post' })
}

export function scoreTrend(patientId) {
  return request({ url: `/chronic/score/trend/${patientId}`, method: 'get' })
}

export function listWeight(params) {
  return request({ url: '/chronic/score/weight/list', method: 'get', params })
}

export function saveWeight(data) {
  return request({ url: '/chronic/score/weight', method: 'post', data })
}
