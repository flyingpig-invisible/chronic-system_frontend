import request from '@/utils/request'

export function listClinic(params) {
  return request({ url: '/chronic/clinic/list', method: 'get', params })
}

export function getClinic(visitId) {
  return request({ url: `/chronic/clinic/${visitId}`, method: 'get' })
}

export function bookClinic(data) {
  return request({ url: '/chronic/clinic', method: 'post', data })
}

export function acceptClinic(visitId) {
  return request({ url: `/chronic/clinic/${visitId}/accept`, method: 'put' })
}

export function finishClinic(visitId, data) {
  return request({ url: `/chronic/clinic/${visitId}/finish`, method: 'put', data })
}

export function cancelClinic(visitId) {
  return request({ url: `/chronic/clinic/${visitId}/cancel`, method: 'put' })
}
