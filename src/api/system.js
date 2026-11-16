import request from '@/utils/request'

// ========== 用户 ==========
export function listUser(params) {
  return request({ url: '/system/user/list', method: 'get', params })
}

export function getUser(userId) {
  return request({ url: `/system/user/${userId}`, method: 'get' })
}

export function addUser(data) {
  return request({ url: '/system/user', method: 'post', data })
}

export function updateUser(data) {
  return request({ url: '/system/user', method: 'put', data })
}

export function delUser(userId) {
  return request({ url: `/system/user/${userId}`, method: 'delete' })
}

export function resetUserPwd(userId, password) {
  return request({ url: `/system/user/${userId}/resetPwd`, method: 'put', data: { password } })
}

export function changeUserStatus(userId, status) {
  return request({ url: `/system/user/${userId}/status`, method: 'put', params: { status } })
}

export function listDoctor() {
  return request({ url: '/system/user/doctor/list', method: 'get' })
}

// ========== 角色 ==========
export function listRole(params) {
  return request({ url: '/system/role/list', method: 'get', params })
}

export function getRole(roleId) {
  return request({ url: `/system/role/${roleId}`, method: 'get' })
}

export function getRoleMenuIds(roleId) {
  return request({ url: `/system/role/${roleId}/menuIds`, method: 'get' })
}

export function addRole(data) {
  return request({ url: '/system/role', method: 'post', data })
}

export function updateRole(data) {
  return request({ url: '/system/role', method: 'put', data })
}

export function delRole(roleId) {
  return request({ url: `/system/role/${roleId}`, method: 'delete' })
}

export function setRoleMenu(roleId, menuIds) {
  return request({ url: `/system/role/${roleId}/menu`, method: 'put', data: { menuIds } })
}

// ========== 科室 ==========
export function deptTree() {
  return request({ url: '/system/dept/tree', method: 'get' })
}

export function getDept(deptId) {
  return request({ url: `/system/dept/${deptId}`, method: 'get' })
}

export function addDept(data) {
  return request({ url: '/system/dept', method: 'post', data })
}

export function updateDept(data) {
  return request({ url: '/system/dept', method: 'put', data })
}

export function deptDoctors(deptId) {
  return request({ url: `/system/dept/${deptId}/doctors`, method: 'get' })
}

export function delDept(deptId) {
  return request({ url: `/system/dept/${deptId}`, method: 'delete' })
}

// ========== 菜单 ==========
export function menuTree() {
  return request({ url: '/system/menu/tree', method: 'get' })
}

export function menuRoute() {
  return request({ url: '/system/menu/route', method: 'get' })
}

export function addMenu(data) {
  return request({ url: '/system/menu', method: 'post', data })
}

export function updateMenu(data) {
  return request({ url: '/system/menu', method: 'put', data })
}

export function delMenu(menuId) {
  return request({ url: `/system/menu/${menuId}`, method: 'delete' })
}

// ========== 字典 ==========
export function listDictType(params) {
  return request({ url: '/system/dict/type/list', method: 'get', params })
}

export function dictTypeOption() {
  return request({ url: '/system/dict/type/option', method: 'get' })
}

export function dictDataByType(dictType) {
  return request({ url: `/system/dict/data/type/${dictType}`, method: 'get' })
}

export function addDictType(data) {
  return request({ url: '/system/dict/type', method: 'post', data })
}

export function updateDictType(data) {
  return request({ url: '/system/dict/type', method: 'put', data })
}

export function delDictType(dictId) {
  return request({ url: `/system/dict/type/${dictId}`, method: 'delete' })
}

export function addDictData(data) {
  return request({ url: '/system/dict/data', method: 'post', data })
}

export function updateDictData(data) {
  return request({ url: '/system/dict/data', method: 'put', data })
}

export function delDictData(dictCode) {
  return request({ url: `/system/dict/data/${dictCode}`, method: 'delete' })
}
