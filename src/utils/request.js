import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/store/user'
import router from '@/router'

const service = axios.create({
  baseURL: import.meta.env.VITE_APP_BASE_API || '/api',
  timeout: 30000
})

service.interceptors.request.use(
  (config) => {
    const userStore = useUserStore()
    if (userStore.token) {
      config.headers['Authorization'] = 'Bearer ' + userStore.token
    }
    return config
  },
  (error) => Promise.reject(error)
)

service.interceptors.response.use(
  (response) => {
    const res = response.data
    if (response.config.responseType === 'blob') {
      return response
    }
    if (res.code === undefined) {
      return res
    }
    if (res.code !== 200) {
      if (res.code === 401) {
        ElMessageBox.confirm('登录状态已过期，请重新登录', '提示', {
          confirmButtonText: '重新登录',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          useUserStore().logout().then(() => {
            router.push('/login')
          })
        })
      } else {
        ElMessage.error(res.msg || '请求失败')
      }
      return Promise.reject(new Error(res.msg || 'Error'))
    }
    return res
  },
  (error) => {
    let msg = error.message
    if (msg.includes('timeout')) {
      msg = '请求超时'
    } else if (msg.includes('Network Error')) {
      msg = '网络连接异常，请检查后端服务是否启动'
    }
    ElMessage.error(msg)
    return Promise.reject(error)
  }
)

export default service
