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

export function deleteScore(scoreId) {
  return request({ url: `/chronic/score/${scoreId}`, method: 'delete' })
}

export function deleteScores(scoreIds) {
  return request({ url: '/chronic/score/batch', method: 'delete', data: scoreIds })
}

/** 患者健康评分权重（w1~w4），未配置时后端返回默认值 */
export function getPatientWeight(patientId) {
  return request({ url: `/chronic/score/weight/${patientId}`, method: 'get' })
}

/** 保存患者健康评分权重，四项之和须为 1 */
export function savePatientWeight(data) {
  return request({ url: '/chronic/score/weight/save', method: 'post', data })
}