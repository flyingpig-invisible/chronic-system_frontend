import { createRouter, createWebHistory } from 'vue-router'
import Layout from '@/layout/index.vue'
import { getToken } from '@/utils/auth'
import { useUserStore } from '@/store/user'

export const routes = [
  {
    path: '/login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '首页看板', icon: 'DataLine' }
      }
    ]
  },
  {
    path: '/patient',
    component: Layout,
    meta: { title: '患者管理', icon: 'User' },
    children: [
      {
        path: 'list',
        name: 'PatientList',
        component: () => import('@/views/patient/list.vue'),
        meta: { title: '患者档案', icon: 'User' }
      },
      {
        path: 'detail/:patientId',
        name: 'PatientDetail',
        component: () => import('@/views/patient/detail.vue'),
        meta: { title: '患者详情', hidden: true }
      },
      {
        path: 'profile',
        name: 'PatientProfile',
        component: () => import('@/views/patient/profile.vue'),
        meta: { title: '专属档案', icon: 'Notebook' }
      },
      {
        path: 'apply',
        name: 'PatientApply',
        component: () => import('@/views/patient/apply.vue'),
        meta: { title: '建档审核', icon: 'Postcard' }
      }
    ]
  },
  {
    path: '/monitor',
    component: Layout,
    meta: { title: '健康监测', icon: 'Odometer' },
    children: [
      {
        path: 'measure',
        name: 'MeasureList',
        component: () => import('@/views/monitor/measure.vue'),
        meta: { title: '监测数据', icon: 'Odometer' }
      },
      {
        path: 'trend',
        name: 'MeasureTrend',
        component: () => import('@/views/monitor/trend.vue'),
        meta: { title: '指标趋势', icon: 'TrendCharts' }
      }
    ]
  },
  {
    path: '/warning',
    component: Layout,
    meta: { title: '预警中心', icon: 'Warning' },
    children: [
      {
        path: 'list',
        name: 'WarningList',
        component: () => import('@/views/warning/list.vue'),
        meta: { title: '预警列表', icon: 'Warning' }
      },
      {
        path: 'rule',
        name: 'WarningRule',
        component: () => import('@/views/warning/rule.vue'),
        meta: { title: '预警规则', icon: 'SetUp' }
      }
    ]
  },
  {
    path: '/intervene',
    component: Layout,
    meta: { title: '健康干预', icon: 'FirstAidKit' },
    children: [
      {
        path: 'guide',
        name: 'GuideList',
        component: () => import('@/views/intervene/guide.vue'),
        meta: { title: '远程指导', icon: 'ChatDotRound' }
      },
      {
        path: 'plan',
        name: 'PlanList',
        component: () => import('@/views/intervene/plan.vue'),
        meta: { title: '健康计划', icon: 'Calendar' }
      },
      {
        path: 'remind',
        name: 'RemindList',
        component: () => import('@/views/intervene/remind.vue'),
        meta: { title: '用药提醒', icon: 'AlarmClock' }
      }
    ]
  },
  {
    path: '/clinic',
    component: Layout,
    meta: { title: '就诊管理', icon: 'FirstAidKit' },
    children: [
      {
        path: 'list',
        name: 'ClinicList',
        component: () => import('@/views/clinic/list.vue'),
        meta: { title: '线上就诊', icon: 'FirstAidKit' }
      }
    ]
  },
  {
    path: '/article',
    component: Layout,
    meta: { title: '健康科普', icon: 'Reading' },
    children: [
      {
        path: 'list',
        name: 'ArticleList',
        component: () => import('@/views/article/list.vue'),
        meta: { title: '科普文章', icon: 'Reading' }
      }
    ]
  },
  {
    path: '/kb',
    component: Layout,
    meta: { title: '医学知识库', icon: 'Notebook' },
    children: [
      {
        path: 'document',
        name: 'KbDocument',
        component: () => import('@/views/kb/document.vue'),
        meta: { title: '知识文档', icon: 'Documentation' }
      }
    ]
  },
  {
    path: '/score',
    component: Layout,
    meta: { title: '健康评分', icon: 'Histogram' },
    children: [
      {
        path: 'list',
        name: 'ScoreList',
        component: () => import('@/views/score/list.vue'),
        meta: { title: '评分记录', icon: 'Histogram' }
      },
      {
        path: 'weight',
        name: 'ScoreWeight',
        component: () => import('@/views/score/weight.vue'),
        meta: { title: '权重配置', icon: 'SetUp' }
      }
    ]
  },
  {
    path: '/ai',
    component: Layout,
    meta: { title: 'AI健康助手', icon: 'MagicStick' },
    children: [
      {
        path: 'chat',
        name: 'AiChat',
        component: () => import('@/views/ai/index.vue'),
        meta: { title: 'AI健康助手', icon: 'MagicStick' }
      }
    ]
  },
  {
    path: '/bind',
    component: Layout,
    meta: { title: '绑定审核', icon: 'Link' },
    children: [
      {
        path: 'list',
        name: 'BindList',
        component: () => import('@/views/bind/list.vue'),
        meta: { title: '家属绑定审核', icon: 'Link' }
      }
    ]
  },
  {
    path: '/system',
    component: Layout,
    meta: { title: '系统管理', icon: 'Setting' },
    children: [
      {
        path: 'user',
        name: 'SysUser',
        component: () => import('@/views/system/user.vue'),
        meta: { title: '用户管理', icon: 'UserFilled' }
      },
      {
        path: 'role',
        name: 'SysRole',
        component: () => import('@/views/system/role.vue'),
        meta: { title: '角色管理', icon: 'Avatar' }
      },
      {
        path: 'dept',
        name: 'SysDept',
        component: () => import('@/views/system/dept.vue'),
        meta: { title: '科室管理', icon: 'OfficeBuilding' }
      },
      {
        path: 'menu',
        name: 'SysMenu',
        component: () => import('@/views/system/menu.vue'),
        meta: { title: '菜单管理', icon: 'Menu' }
      },
      {
        path: 'dict',
        name: 'SysDict',
        component: () => import('@/views/system/dict.vue'),
        meta: { title: '字典管理', icon: 'Collection' }
      },
      {
        path: 'indicator',
        name: 'SysIndicator',
        component: () => import('@/views/system/indicator.vue'),
        meta: { title: '指标管理', icon: 'Odometer' }
      }
    ]
  },
  {
    path: '/404',
    component: () => import('@/views/error/404.vue'),
    meta: { hidden: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

router.beforeEach(async (to, from, next) => {
  const token = getToken()
  if (to.path === '/login') {
    next()
    return
  }
  if (!token) {
    next('/login')
    return
  }
  const userStore = useUserStore()
  // 首次进入或刷新后权限未加载，先拉取用户信息与权限
  if (!userStore.permissions || userStore.permissions.length === 0) {
    try {
      await userStore.getInfo()
    } catch (e) {
      userStore.reset()
      next('/login')
      return
    }
  }
  next()
})

export default router
