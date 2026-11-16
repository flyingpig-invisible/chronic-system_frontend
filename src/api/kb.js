import request from '@/utils/request'

export function listKbDocument(params) {
  return request({ url: '/chronic/kb/list', method: 'get', params })
}

export function getKbDocument(docId) {
  return request({ url: `/chronic/kb/${docId}`, method: 'get' })
}

export function saveKbDocument(data) {
  return request({ url: '/chronic/kb', method: 'post', data })
}

export function delKbDocument(docIds) {
  return request({ url: `/chronic/kb/${docIds}`, method: 'delete' })
}

export function getKbStats() {
  return request({ url: '/chronic/kb/stats', method: 'get' })
}

export function uploadKbFile(file) {
  const form = new FormData()
  form.append('file', file)
  return request({
    url: '/chronic/kb/upload',
    method: 'post',
    data: form,
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000
  })
}

export function searchKbSnippet(params) {
  return request({ url: '/chronic/kb/search', method: 'get', params })
}

export function previewKbContext(params) {
  return request({ url: '/chronic/kb/search/context', method: 'get', params })
}
