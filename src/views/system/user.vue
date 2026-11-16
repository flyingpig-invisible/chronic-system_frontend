<template>
  <div class="page-container">
    <div class="search-bar">
      <el-form :model="query" inline>
        <el-form-item label="用户名"><el-input v-model="query.username" clearable style="width:150px" /></el-form-item>
        <el-form-item label="姓名"><el-input v-model="query.realName" clearable style="width:150px" /></el-form-item>
        <el-form-item label="类型">
          <el-select v-model="query.userType" placeholder="全部" clearable style="width:120px">
            <el-option label="医生" value="1" />
            <el-option label="管理员" value="2" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleQuery">搜索</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="table-card">
      <div class="table-toolbar">
        <el-button v-permission="['system:user:add']" type="primary" :icon="Plus" @click="openAdd">新增用户</el-button>
      </div>
      <el-table v-loading="loading" :data="list" border stripe>
        <el-table-column prop="userId" label="ID" width="70" />
        <el-table-column prop="username" label="用户名" width="130" />
        <el-table-column prop="realName" label="姓名" width="110" />
        <el-table-column label="类型" width="90">
          <template #default="{ row }">
            <el-tag size="small">{{ row.userType === '2' ? '管理员' : '医生' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column label="所属科室" width="120">
          <template #default="{ row }">
            <span v-if="row.deptName">{{ row.deptName }}</span>
            <span v-else style="color:#909399">-</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === '0' ? 'success' : 'danger'" size="small">
              {{ row.status === '0' ? '正常' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="loginDate" label="最后登录" width="170" />
        <el-table-column label="操作" width="230" fixed="right">
          <template #default="{ row }">
            <el-button v-permission="['system:user:edit']" type="primary" link size="small" @click="openEdit(row)">编辑</el-button>
            <el-button v-permission="['system:user:edit']" type="warning" link size="small" @click="handleResetPwd(row)">重置密码</el-button>
            <el-button v-permission="['system:user:edit']" type="success" link size="small" @click="toggleStatus(row)">
              {{ row.status === '0' ? '停用' : '启用' }}
            </el-button>
            <el-button v-permission="['system:user:remove']" type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap">
        <el-pagination v-model:current-page="query.pageNum" v-model:page-size="query.pageSize"
          :page-sizes="[10, 20, 50]" :total="total" layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadList" @current-change="loadList" />
      </div>
    </div>

    <el-dialog v-model="dialogVisible" :title="form.userId ? '编辑用户' : '新增用户'" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="用户名" prop="username"><el-input v-model="form.username" :disabled="!!form.userId" /></el-form-item>
        <el-form-item v-if="!form.userId" label="初始密码"><el-input v-model="form.password" placeholder="默认 123456" /></el-form-item>
        <el-form-item label="姓名" prop="realName"><el-input v-model="form.realName" /></el-form-item>
        <el-form-item label="手机号"><el-input v-model="form.phone" /></el-form-item>
        <el-form-item label="用户类型">
          <el-radio-group v-model="form.userType">
            <el-radio value="1">医生</el-radio>
            <el-radio value="2">管理员</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="所属科室">
          <el-select v-model="form.deptId" clearable style="width:100%">
            <el-option v-for="d in depts" :key="d.deptId" :label="d.deptName" :value="d.deptId" />
          </el-select>
        </el-form-item>
        <el-form-item label="职称"><el-input v-model="form.title" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus } from '@element-plus/icons-vue'
import { listUser, addUser, updateUser, delUser, resetUserPwd, changeUserStatus, deptTree } from '@/api/system'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const depts = ref([])
const dialogVisible = ref(false)
const formRef = ref()

const query = reactive({ pageNum: 1, pageSize: 10, username: '', realName: '', userType: '' })
const form = reactive({ userId: null, username: '', password: '', realName: '', phone: '', userType: '1', deptId: null, title: '' })
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }]
}

const loadList = async () => {
  loading.value = true
  try {
    const res = await listUser(query)
    list.value = res.data.rows
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

const handleQuery = () => { query.pageNum = 1; loadList() }
const resetQuery = () => {
  Object.assign(query, { pageNum: 1, pageSize: 10, username: '', realName: '', userType: '' })
  loadList()
}

const openAdd = () => {
  Object.assign(form, { userId: null, username: '', password: '', realName: '', phone: '', userType: '1', deptId: null, title: '' })
  dialogVisible.value = true
}

const openEdit = (row) => {
  Object.assign(form, { ...row, password: '' })
  dialogVisible.value = true
}

const handleSubmit = () => {
  formRef.value.validate(async (valid) => {
    if (!valid) return
    if (form.userId) {
      await updateUser(form)
      ElMessage.success('修改成功')
    } else {
      await addUser(form)
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    loadList()
  })
}

const handleResetPwd = (row) => {
  ElMessageBox.prompt('请输入新密码', `重置「${row.realName}」的密码`, { inputValue: '123456' }).then(async ({ value }) => {
    await resetUserPwd(row.userId, value)
    ElMessage.success('密码已重置')
  })
}

const toggleStatus = async (row) => {
  await changeUserStatus(row.userId, row.status === '0' ? '1' : '0')
  ElMessage.success('操作成功')
  loadList()
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定删除用户「${row.realName}」吗？`, '提示', { type: 'warning' }).then(async () => {
    await delUser(row.userId)
    ElMessage.success('删除成功')
    loadList()
  })
}

onMounted(async () => {
  loadList()
  try {
    const res = await deptTree()
    depts.value = res.data || []
  } catch (e) {}
})
</script>
