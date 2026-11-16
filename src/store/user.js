import { defineStore } from 'pinia'
import { login as loginApi, logout as logoutApi, getUserInfo } from '@/api/auth'
import { getToken, setToken, removeToken } from '@/utils/auth'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: getToken() || '',
    userId: null,
    username: '',
    userType: '',
    realName: '',
    avatar: '',
    deptId: null,
    deptName: '',
    roles: [],
    permissions: []
  }),
  getters: {
    isAdmin: (state) => state.roles.includes('admin')
  },
  actions: {
    async login(form) {
      const res = await loginApi(form)
      this.token = res.data.token
      this.userId = res.data.userId
      this.username = res.data.username
      this.realName = res.data.realName
      setToken(res.data.token)
      return res
    },
    async getInfo() {
      const res = await getUserInfo()
      const user = res.data
      this.userId = user.userId
      this.username = user.username
      this.realName = user.realName
      this.userType = user.userType || ''
      this.avatar = user.avatar
      this.deptId = user.deptId
      this.deptName = user.deptName || ''
      this.roles = user.roles && user.roles.length ? user.roles : ['doctor']
      this.permissions = user.permissions && user.permissions.length ? user.permissions : []
      return user
    },
    async logout() {
      try {
        await logoutApi()
      } catch (e) {
        // 忽略
      }
      this.reset()
    },
    reset() {
      this.token = ''
      this.userId = null
      this.username = ''
      this.userType = ''
      this.realName = ''
      this.deptId = null
      this.deptName = ''
      this.roles = []
      this.permissions = []
      removeToken()
    }
  }
})
