import request from '@/utils/request'

export function listPlan(params) {
  return request({ url: '/chronic/plan/list', method: 'get', params })
}

export function getPlan(planId) {
  return request({ url: `/chronic/plan/${planId}`, method: 'get' })
}

export function savePlan(data) {
  return request({ url: '/chronic/plan', method: 'post', data })
}

export function updatePlanStatus(planId, planStatus) {
  return request({ url: `/chronic/plan/${planId}/status`, method: 'put', params: { planStatus } })
}

export function delPlan(planIds) {
  return request({ url: `/chronic/plan/${planIds}`, method: 'delete' })
}
