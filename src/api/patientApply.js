import request from '@/utils/request'

export function listPatientApply(params) {
  return request({ url: '/chronic/patient-apply/list', method: 'get', params })
}

export function patientApplyPendingCount() {
  return request({ url: '/chronic/patient-apply/pending-count', method: 'get' })
}

export function auditPatientApply(applyId, result, auditOpinion) {
  return request({ url: `/chronic/patient-apply/${applyId}/audit`, method: 'put', params: { result, auditOpinion } })
}