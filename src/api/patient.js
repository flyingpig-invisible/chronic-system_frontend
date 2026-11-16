import request from '@/utils/request'

export function listPatient(params) {
  return request({ url: '/chronic/patient/list', method: 'get', params })
}

export function getPatient(patientId) {
  return request({ url: `/chronic/patient/${patientId}`, method: 'get' })
}

export function getDashboard() {
  return request({ url: '/chronic/patient/overview', method: 'get' })
}

export function getPatientProfile(patientId) {
  return request({ url: `/chronic/patient/${patientId}/profile`, method: 'get' })
}

export function addPatient(data) {
  return request({ url: '/chronic/patient', method: 'post', data })
}

export function updatePatient(data) {
  return request({ url: '/chronic/patient', method: 'put', data })
}

export function delPatient(patientIds) {
  return request({ url: `/chronic/patient/${patientIds}`, method: 'delete' })
}

export function exportPatient(params) {
  return request({ url: '/chronic/patient/export', method: 'post', params, responseType: 'blob' })
}
