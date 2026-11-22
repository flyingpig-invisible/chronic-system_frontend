<template>
  <div class="login-page">
    <div class="bg-grid"></div>
    <div class="bg-glow g1"></div>
    <div class="bg-glow g2"></div>
    <div class="bg-glow g3"></div>
    <div class="scan-line"></div>

    <div class="brand-side">
      <div class="brand-logo">
        <el-icon :size="30"><FirstAidKit /></el-icon>
      </div>
      <h1 class="brand-name">慢病管理系统</h1>
      <p class="brand-sub">Chronic Disease Management Platform</p>
      <div class="brand-desc">全周期健康监测 · 智能风险预警 · 医患协同干预</div>
      <ul class="brand-points">
        <li><span class="dot"></span>实时采集 7 项体征指标</li>
        <li><span class="dot"></span>规则引擎自动分级预警</li>
        <li><span class="dot"></span>AI 健康助手辅助临床决策</li>
        <li><span class="dot"></span>医学知识库沉淀诊疗经验</li>
      </ul>
    </div>

    <div class="login-box">
      <div class="box-line"></div>
      <div class="box-head">
        <div class="box-icon"><el-icon :size="20"><Lock /></el-icon></div>
        <div>
          <h2>医生端登录</h2>
          <p>Doctor Console Access</p>
        </div>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" size="large" @keyup.enter="handleLogin">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" :prefix-icon="User" clearable />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            :prefix-icon="Key"
            show-password
          />
        </el-form-item>
        <el-form-item>
          <el-button class="login-btn" type="primary" :loading="loading" @click="handleLogin">
            <span v-if="!loading">进 入 系 统</span>
            <span v-else>登 录 中…</span>
          </el-button>
        </el-form-item>
      </el-form>

      <div class="login-tip">
        <span class="tip-key">admin</span> / <span class="tip-key">123456</span> 管理员
        <span class="tip-sep">·</span>
        <span class="tip-key">doctor</span> / <span class="tip-key">123456</span> 医生
      </div>
    </div>

    <div class="foot-note">Chronic Disease Management System v1.0 · Spring Boot 3 + Vue 3</div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, Key } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/user'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref()
const loading = ref(false)
const form = reactive({ username: 'admin', password: '123456' })
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const handleLogin = () => {
  formRef.value.validate((valid) => {
    if (!valid) return
    loading.value = true
    userStore
      .login(form)
      .then(() => userStore.getInfo())
      .then(() => {
        ElMessage.success('登录成功')
        router.push('/dashboard')
      })
      .finally(() => {
        loading.value = false
      })
  })
}
</script>

<style scoped>
.login-page {
  position: relative;
  height: 100vh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 90px;
  background: #f5f7fa;
}

/* 装饰元素在浅色主题下隐藏 */
.bg-grid,
.bg-glow,
.scan-line {
  display: none;
}

/* 左侧品牌区 */
.brand-side {
  position: relative;
  z-index: 2;
  width: 460px;
}
.brand-logo {
  width: 58px;
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  color: #ffffff;
  background: #409eff;
  margin-bottom: 22px;
}
.brand-name {
  margin: 0;
  font-size: 40px;
  letter-spacing: 3px;
  color: #303133;
}
.brand-sub {
  margin: 10px 0 22px;
  font-size: 12px;
  letter-spacing: 2.6px;
  text-transform: uppercase;
  color: #909399;
}
.brand-desc {
  font-size: 15px;
  color: #606266;
  letter-spacing: 1px;
}
.brand-points {
  margin: 30px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.brand-points li {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: #606266;
}
.brand-points .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #67c23a;
  flex: none;
}

/* 登录卡片 */
.login-box {
  position: relative;
  z-index: 2;
  width: 420px;
  padding: 38px 38px 26px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #e4e7ed;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
}
.box-line {
  display: none;
}
.box-head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 28px;
}
.box-icon {
  width: 44px;
  height: 44px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  color: #409eff;
  background: #ecf5ff;
  border: 1px solid #d9ecff;
}
.box-head h2 {
  margin: 0;
  font-size: 20px;
  letter-spacing: 1.5px;
  color: #303133;
}
.box-head p {
  margin: 4px 0 0;
  font-size: 11px;
  letter-spacing: 1.8px;
  text-transform: uppercase;
  color: #909399;
}

.login-box :deep(.el-form-item) {
  margin-bottom: 22px;
}
.login-box :deep(.el-input__wrapper) {
  border-radius: 8px;
  padding: 4px 14px;
}
.login-box :deep(.el-input__inner) {
  color: #303133;
  letter-spacing: 0.5px;
}
.login-box :deep(.el-input__inner::placeholder) {
  color: #a8abb2;
}

.login-btn {
  width: 100%;
  height: 46px;
  font-size: 15px;
  letter-spacing: 4px;
  border: none;
  border-radius: 8px;
  color: #ffffff;
  font-weight: 700;
  background: #409eff;
  transition: background 0.2s;
}
.login-btn:hover {
  background: #66b1ff;
}
.login-btn:active {
  background: #337ecc;
}

.login-tip {
  margin-top: 6px;
  text-align: center;
  font-size: 12px;
  color: #909399;
  letter-spacing: 0.4px;
}
.tip-key {
  color: #409eff;
  font-family: Consolas, Monaco, monospace;
}
.tip-sep {
  margin: 0 8px;
  color: #dcdfe6;
}

.foot-note {
  position: absolute;
  bottom: 22px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 12px;
  letter-spacing: 1.2px;
  color: #a8abb2;
  z-index: 2;
}

@media (max-width: 1080px) {
  .brand-side { display: none; }
  .login-page { gap: 0; }
}
</style>
