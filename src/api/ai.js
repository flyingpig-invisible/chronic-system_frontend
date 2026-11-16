import request from '@/utils/request'

export function aiChat(data) {
  return request({ url: '/chronic/ai/chat', method: 'post', data, timeout: 90000 })
}

export function aiHistory(limit) {
  return request({ url: '/chronic/ai/history', method: 'get', params: { limit } })
}
