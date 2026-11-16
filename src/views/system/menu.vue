<template>
  <div class="page-container">
    <div class="table-card">
      <div class="table-toolbar">
        <el-button v-permission="['system:menu:add']" type="primary" :icon="Plus" @click="openAdd(null)">新增菜单</el-button>
      </div>
      <el-table
        v-loading="loading"
        :data="list"
        row-key="menuId"
        border
        :tree-props="{ children: 'children' }"
      >
        <el-table-column prop="menuName" label="菜单名称" min-width="180" />
        <el-table-column label="类型" width="90">
          <template #default="{ row }">
            <el-tag :type="typeTag(row.menuType)" size="small">{{ typeName(row.menuType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="orderNum" label="排序" width="80" />
        <el-table-column prop="path" label="路由" width="150" />
        <el-table-column prop="component" label="组件" width="180" show-overflow-tooltip />
        <el-table-column prop="perms" label="权限标识" width="200" show-overflow-tooltip />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === '0' ? 'success' : 'danger'" size="small">{{ row.status === '0' ? '正常' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button v-permission="['system:menu:add']" type="primary" link size="small" @click="openAdd(row)">新增下级</el-button>
            <el-button v-permission="['system:menu:edit']" type="primary" link size="small" @click="openEdit(row)">编辑</el-button>
            <el-button v-permission="['system:menu:remove']" type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="form.menuId ? '编辑菜单' : '新增菜单'" width="560px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="上级菜单">
          <el-tree-select
            v-model="form.parentId"
            :data="treeSelectData"
            :props="{ label: 'menuName', children: 'children', value: 'menuId' }"
            check-strictly
            node-key="menuId"
            placeholder="不选则为顶级"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item label="菜单类型">
          <el-radio-group v-model="form.menuType">
            <el-radio value="M">目录</el-radio>
            <el-radio value="C">菜单</el-radio>
            <el-radio value="F">按钮</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="菜单名称" prop="menuName"><el-input v-model="form.menuName" /></el-form-item>
        <el-form-item v-if="form.menuType !== 'F'" label="路由地址"><el-input v-model="form.path" /></el-form-item>
        <el-form-item v-if="form.menuType === 'C'" label="组件路径"><el-input v-model="form.component" /></el-form-item>
        <el-form-item v-if="form.menuType === 'F'" label="权限标识"><el-input v-model="form.perms" placeholder="如 chronic:patient:add" /></el-form-item>
        <el-form-item label="显示排序"><el-input-number v-model="form.orderNum" :min="0" style="width:100%" /></el-form-item>
        <el-form-item v-if="form.menuType !== 'F'" label="菜单图标"><el-input v-model="form.icon" /></el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="0">正常</el-radio>
            <el-radio value="1">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { menuTree, addMenu, updateMenu, delMenu } from '@/api/system'

const loading = ref(false)
const list = ref([])
const rawTree = ref([])
const dialogVisible = ref(false)
const formRef = ref()

const form = reactive({
  menuId: null, parentId: 0, menuName: '', menuType: 'C', path: '', component: '',
  perms: '', orderNum: 0, icon: '', status: '0'
})
const rules = { menuName: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }] }

const treeSelectData = computed(() => [{ menuId: 0, menuName: '顶级菜单', children: rawTree.value }])
const typeName = (t) => ({ M: '目录', C: '菜单', F: '按钮' }[t] || '-')
const typeTag = (t) => ({ M: '', C: 'success', F: 'info' }[t] || 'info')

const loadTree = async () => {
  loading.value = true
  try {
    const res = await menuTree()
    rawTree.value = res.data || []
    list.value = res.data || []
  } finally {
    loading.value = false
  }
}

const openAdd = (row) => {
  Object.assign(form, {
    menuId: null, parentId: row ? row.menuId : 0, menuName: '', menuType: 'C', path: '', component: '',
    perms: '', orderNum: 0, icon: '', status: '0'
  })
  dialogVisible.value = true
}

const openEdit = (row) => {
  Object.assign(form, {
    menuId: row.menuId, parentId: row.parentId, menuName: row.menuName, menuType: row.menuType,
    path: row.path, component: row.component, perms: row.perms, orderNum: row.orderNum,
    icon: row.icon, status: row.status
  })
  dialogVisible.value = true
}

const handleSubmit = () => {
  formRef.value.validate(async (valid) => {
    if (!valid) return
    if (form.menuId) {
      await updateMenu(form)
      ElMessage.success('修改成功')
    } else {
      await addMenu(form)
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    loadTree()
  })
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定删除菜单「${row.menuName}」吗？`, '提示', { type: 'warning' }).then(async () => {
    await delMenu(row.menuId)
    ElMessage.success('删除成功')
    loadTree()
  })
}

onMounted(loadTree)
</script>
