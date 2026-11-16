<template>
  <el-container class="layout">
    <el-aside :width="collapsed ? '66px' : '226px'" class="aside">
      <div class="logo">
        <div class="logo-mark">
          <el-icon :size="20"><FirstAidKit /></el-icon>
        </div>
        <div v-show="!collapsed" class="logo-text">
          <span class="logo-cn">慢病管理系统</span>
          <span class="logo-en">CDMS CONSOLE</span>
        </div>
      </div>

      <el-scrollbar class="menu-scroll">
        <el-menu
          :default-active="activeMenu"
          :collapse="collapsed"
          router
          unique-opened
        >
          <template v-for="item in menuList" :key="item.path">
            <el-sub-menu v-if="item.children && item.children.length > 1" :index="item.path">
              <template #title>
                <el-icon><component :is="item.icon" /></el-icon>
                <span>{{ item.title }}</span>
              </template>
              <el-menu-item v-for="child in visibleChildren(item)" :key="child.path" :index="child.path">
                <el-icon><component :is="child.icon" /></el-icon>
                <span>{{ child.title }}</span>
              </el-menu-item>
            </el-sub-menu>
            <el-menu-item v-else :index="firstPath(item)">
              <el-icon><component :is="item.icon" /></el-icon>
              <template #title>{{ item.children[0].title }}</template>
            </el-menu-item>
          </template>
        </el-menu>
      </el-scrollbar>

      <div class="aside-foot">
        <span class="pulse-dot"></span>
        <span v-show="!collapsed">服务运行中</span>
      </div>
    </el-aside>

    <el-container class="right-wrap">
      <el-header class="header">
        <div class="header-left">
          <el-icon class="collapse-btn" :size="19" @click="collapsed = !collapsed">
            <Fold v-if="!collapsed" />
            <Expand v-else />
          </el-icon>
          <div class="crumb">
            <el-breadcrumb separator="/">
              <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
              <el-breadcrumb-item v-if="currentTitle">{{ currentTitle }}</el-breadcrumb-item>
            </el-breadcrumb>
          </div>
        </div>
        <div class="header-right">
          <div class="clock">
            <el-icon><Clock /></el-icon>
            <span>{{ nowText }}</span>
          </div>
          <el-tag class="role-tag" effect="dark" size="small">
            {{ userStore.roles.includes('admin') ? '管理员' : '医生' }}
          </el-tag>
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <span class="avatar">{{ avatarText }}</span>
              <span class="uname">{{ userStore.realName || userStore.username }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="main">
        <router-view v-slot="{ Component }">
          <keep-alive :max="10">
            <component :is="Component" :key="$route.fullPath" />
          </keep-alive>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { Clock } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/user'
import { routes } from '@/router'

const collapsed = ref(false)
const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const menuList = computed(() =>
  routes
    .filter((r) => r.meta && r.meta.title && !r.meta.hidden && r.children && r.children.length)
    .map((r) => ({
      path: r.path,
      title: r.meta.title,
      icon: r.meta.icon || 'Menu',
      children: r.children
        .filter((c) => !c.meta?.hidden)
        .map((c) => ({ path: r.path + '/' + c.path, title: c.meta.title, icon: c.meta.icon || 'Menu' }))
    }))
)

const visibleChildren = (item) => item.children
const firstPath = (item) => item.children[0].path
const activeMenu = computed(() => route.path)
const currentTitle = computed(() => route.meta?.title || '')

const avatarText = computed(() => {
  const n = userStore.realName || userStore.username || '医'
  return n.slice(0, 1).toUpperCase()
})

const now = ref(new Date())
let timer = null
const pad = (n) => String(n).padStart(2, '0')
const nowText = computed(() => {
  const d = now.value
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
})

onMounted(() => {
  timer = setInterval(() => { now.value = new Date() }, 1000)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

const handleCommand = (command) => {
  if (command === 'logout') {
    ElMessageBox.confirm('确定退出登录吗？', '提示', { type: 'warning' }).then(() => {
      userStore.logout().then(() => {
        router.push('/login')
      })
    })
  }
}
</script>

<style scoped>
.layout {
  height: 100vh;
  background: #f5f7fa;
}

/* ================= 侧边栏 ================= */
.aside {
  position: relative;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-right: 1px solid #e4e7ed;
  transition: width 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.logo {
  height: 64px;
  flex: none;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 0 16px;
  border-bottom: 1px solid #e4e7ed;
  white-space: nowrap;
  overflow: hidden;
}
.logo-mark {
  width: 34px;
  height: 34px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: #ffffff;
  background: #409eff;
}
.logo-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  overflow: hidden;
}
.logo-cn {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #303133;
}
.logo-en {
  font-size: 9px;
  letter-spacing: 1.6px;
  color: #909399;
}

.menu-scroll {
  flex: 1;
  min-height: 0;
}

.aside :deep(.el-menu) {
  border-right: none;
  background: transparent;
  padding: 10px 8px;
}
.aside :deep(.el-menu-item),
.aside :deep(.el-sub-menu__title) {
  height: 44px;
  line-height: 44px;
  margin: 3px 0;
  border-radius: 8px;
  color: #606266;
  font-size: 14px;
  letter-spacing: 0.4px;
  transition: color 0.2s, background 0.25s;
}
.aside :deep(.el-menu-item:hover),
.aside :deep(.el-sub-menu__title:hover) {
  background: #f5f7fa;
  color: #409eff;
}
.aside :deep(.el-menu-item.is-active) {
  color: #409eff;
  font-weight: 600;
  background: #ecf5ff;
}
.aside :deep(.el-sub-menu.is-active > .el-sub-menu__title) {
  color: #409eff;
}
.aside :deep(.el-sub-menu .el-menu) {
  background: transparent;
  border-radius: 8px;
  padding: 4px 0;
}
.aside :deep(.el-menu--collapse .el-sub-menu__title span),
.aside :deep(.el-menu--collapse .el-menu-item span) {
  display: none;
}

.aside-foot {
  flex: none;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 12px;
  letter-spacing: 0.6px;
  color: #909399;
  border-top: 1px solid #ebeef5;
  white-space: nowrap;
  overflow: hidden;
}
.pulse-dot {
  width: 7px;
  height: 7px;
  flex: none;
  border-radius: 50%;
  background: #67c23a;
}

/* ================= 右侧 ================= */
.right-wrap {
  min-width: 0;
  background: #f5f7fa;
}

.header {
  position: relative;
  height: 64px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 22px;
  background: #ffffff;
  border-bottom: 1px solid #e4e7ed;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}
.collapse-btn {
  cursor: pointer;
  color: #606266;
  padding: 7px;
  border-radius: 8px;
  transition: color 0.2s, background 0.2s;
}
.collapse-btn:hover {
  color: #409eff;
  background: #f5f7fa;
}
.crumb :deep(.el-breadcrumb__inner) {
  color: #909399;
  font-size: 13px;
}
.crumb :deep(.el-breadcrumb__inner.is-link:hover) {
  color: #409eff;
}
.crumb :deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
  color: #303133;
  font-weight: 600;
}
.crumb :deep(.el-breadcrumb__separator) {
  color: #c0c4cc;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}
.clock {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-family: Consolas, Monaco, monospace;
  letter-spacing: 0.6px;
  color: #909399;
}
.role-tag {
  letter-spacing: 1px;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 9px;
  cursor: pointer;
  outline: none;
  padding: 5px 11px 5px 5px;
  border-radius: 22px;
  border: 1px solid transparent;
  color: #606266;
  font-size: 13.5px;
  transition: border-color 0.2s, background 0.2s;
}
.user-info:hover {
  background: #f5f7fa;
  border-color: #e4e7ed;
}
.avatar {
  width: 30px;
  height: 30px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  background: #409eff;
}
.uname {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.main {
  background: #f5f7fa;
  padding: 18px;
  overflow-y: auto;
}

@media (max-width: 900px) {
  .clock { display: none; }
}
</style>
