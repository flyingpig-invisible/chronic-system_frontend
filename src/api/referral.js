import request from '@/utils/request'

export function listReferral(params) {
  return request({ url: '/chronic/referral/list', method: 'get', params })
}

export function getReferral(referralId) {
  return request({ url: `/chronic/referral/${referralId}`, method: 'get' })
}

export function applyReferral(data) {
  return request({ url: '/chronic/referral', method: 'post', data })
}

export function auditReferral(referralId, data) {
  return request({ url: `/chronic/referral/${referralId}/audit`, method: 'put', data })
}
