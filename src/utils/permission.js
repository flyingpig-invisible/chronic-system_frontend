import { useUserStore } from '@/store/user'

export default {
  mounted(el, binding) {
    const { value } = binding
    const userStore = useUserStore()
    const permissions = userStore.permissions || []
    const roles = userStore.roles || []
    if (value && value instanceof Array && value.length > 0) {
      // 超级管理员或通配符直接放行
      if (roles.includes('admin') || permissions.includes('*:*:*')) return
      const hasPermission = permissions.some((p) => value.includes(p))
      if (!hasPermission) {
        el.parentNode && el.parentNode.removeChild(el)
      }
    } else {
      throw new Error('请传入权限标识，如 v-permission="[\'chronic:patient:add\']"')
    }
  }
}
