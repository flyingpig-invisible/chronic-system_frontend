import request from '@/utils/request'

export function listArticle(params) {
  return request({ url: '/chronic/article/list', method: 'get', params })
}

export function getArticle(articleId) {
  return request({ url: `/chronic/article/${articleId}`, method: 'get' })
}

export function saveArticle(data) {
  return request({ url: '/chronic/article', method: 'post', data })
}

export function publishArticle(articleId, publishStatus) {
  return request({ url: `/chronic/article/${articleId}/publish`, method: 'put', params: { publishStatus } })
}

export function delArticle(articleIds) {
  return request({ url: `/chronic/article/${articleIds}`, method: 'delete' })
}

export function listCategory() {
  return request({ url: '/chronic/article/category/list', method: 'get' })
}
