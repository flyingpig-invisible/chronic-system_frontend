import request from '@/utils/request'

export function getPatientProfileDetail(patientId) {
  return request({ url: `/chronic/profile/patient/${patientId}`, method: 'get' })
}

export function savePatientProfile(data) {
  return request({ url: '/chronic/profile', method: 'post', data })
}

export function aiAnalyzeProfile(patientId) {
  return request({ url: `/chronic/ai/analyze/profile/${patientId}`, method: 'post', timeout: 90000 })
}
