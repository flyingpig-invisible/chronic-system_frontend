<template>
  <div class="page-container">
    <div class="search-bar">
      <el-form :model="query" inline>
        <el-form-item label="角色名称"><el-input v-model="query.roleName" clearable style="width:160px" /></el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleQuery">搜索</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="table-card">
      <div class="table-toolbar">
        <el-button v-permission="['system:role:add']" type="primary" :icon="Plus" @click="openAdd">新增角色</el-button>
      </div>
      <el-table v-loading="loading" :data="list" border stripe>
        <el-table-column prop="roleId" label="ID" width="70" />
        <el-table-column prop="roleName" label="角色名称" width="150" />
        <el-table-column prop="roleKey" label="权限字符" width="150" />
        <el-table-column prop="orderNum" label="排序" width="80" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === '0' ? 'success' : 'danger'" size="small">{{ row.status === '0' ? '正常' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="160" />
        <el-table-column label="操作" width="230" fixed="right">
          <template #default="{ row }">
            <el-button v-permission="['system:role:edit']" type="primary" link size="small" @click="openEdit(row)">编辑</el-button>
            <el-button v-permission="['system:role:edit']" type="success" link size="small" @click="openMenu(row)">分配权限</el-button>
            <el-button v-permission="['system:role:remove']" type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap">
        <el-pagination v-model:current-page="query.pageNum" v-model:page-size="query.pageSize"
          :page-sizes="[10, 20, 50]" :total="total" layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadList" @current-change="loadList" />
      </div>
    </div>

    <el-dialog v-model="dialogVisible" :title="form.roleId ? '编辑角色' : '新增角色'" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="角色名称" prop="roleName"><el-input v-model="form.roleName" /></el-form-item>
        <el-form-item label="权限字符" prop="roleKey"><el-input v-model="form.roleKey" placeholder="如 doctor" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.orderNum" :min="0" style="width:100%" /></el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="0">正常</el-radio>
            <el-radio value="1">停用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="menuVisible" title="分配菜单权限" width="480px">
      <el-tree
        ref="menuTreeRef"
        :data="menuTreeData"
        show-checkbox
        node-key="menuId"
        :props="{ label: 'menuName', children: 'children' }"
        default-expand-all
        style="max-height:420px;overflow:auto"
      />
      <template #footer>
        <el-button @click="menuVisible = false">取消</el-button>
        <el-button type="primary" @click="submitMenu">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus } from '@element-plus/icons-vue'
import { listRole, addRole, updateRole, delRole, getRoleMenuIds, setRoleMenu, menuTree } from '@/api/system'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const dialogVisible = ref(false)
const menuVisible = ref(false)
const formRef = ref()
const menuTreeRef = ref()
const menuTreeData = ref([])
const currentRoleId = ref(null)

const query = reactive({ pageNum: 1, pageSize: 10, roleName: '' })
const form = reactive({ roleId: null, roleName: '', roleKey: '', orderNum: 0, status: '0', remark: '' })
const rules = {
  roleName: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  roleKey: [{ required: true, message: '请输入权限字符', trigger: 'blur' }]
}

const loadList = async () => {
  loading.value = true
  try {
    const res = await listRole(query)
    list.value = res.data.rows
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

const handleQuery = () => { query.pageNum = 1; loadList() }
const resetQuery = () => {
  Object.assign(query, { pageNum: 1, pageSize: 10, roleName: '' })
  loadList()
}

const openAdd = () => {
  Object.assign(form, { roleId: null, roleName: '', roleKey: '', orderNum: 0, status: '0', remark: '' })
  dialogVisible.value = true
}

const openEdit = (row) => {
  Object.assign(form, row)
  dialogVisible.value = true
}

const handleSubmit = () => {
  formRef.value.validate(async (valid) => {
    if (!valid) return
    if (form.roleId) {
      await updateRole(form)
      ElMessage.success('修改成功')
    } else {
      await addRole(form)
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    loadList()
  })
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定删除角色「${row.roleName}」吗？`, '提示', { type: 'warning' }).then(async () => {
    await delRole(row.roleId)
    ElMessage.success('删除成功')
    loadList()
  })
}

const openMenu = async (row) => {
  currentRoleId.value = row.roleId
  const [treeRes, checkedRes] = await Promise.all([menuTree(), getRoleMenuIds(row.roleId)])
  menuTreeData.value = treeRes.data || []
  menuVisible.value = true
  setTimeout(() => {
    if (menuTreeRef.value) {
      menuTreeRef.value.setCheckedKeys(checkedRes.data || [])
    }
  }, 100)
}

const submitMenu = async () => {
  const checked = menuTreeRef.value.getCheckedKeys()
  const halfChecked = menuTreeRef.value.getHalfCheckedKeys()
  await setRoleMenu(currentRoleId.value, [...checked, ...halfChecked])
  ElMessage.success('权限分配成功')
  menuVisible.value = false
}

onMounted(loadList)
</script>
