import request from '@/utils/request'

export function listGuide(params) {
  return request({ url: '/chronic/guide/list', method: 'get', params })
}

export function getGuide(guideId) {
  return request({ url: `/chronic/guide/${guideId}`, method: 'get' })
}

export function guideByPatient(patientId) {
  return request({ url: `/chronic/guide/patient/${patientId}`, method: 'get' })
}

export function addGuide(data) {
  return request({ url: '/chronic/guide', method: 'post', data })
}

export function updateGuide(data) {
  return request({ url: '/chronic/guide', method: 'put', data })
}

export function delGuide(guideIds) {
  return request({ url: `/chronic/guide/${guideIds}`, method: 'delete' })
}

export function markGuideRead(guideId) {
  return request({ url: `/chronic/guide/${guideId}/read`, method: 'put' })
}

export function guideTypeOptions() {
  return request({ url: '/chronic/guide/type/option', method: 'get' })
}

export function addGuideType(label) {
  return request({ url: '/chronic/guide/type', method: 'post', data: { label } })
}

export function deleteGuideType(label) {
  return request({ url: '/chronic/guide/delete', method: 'post', params: { label } })
}
