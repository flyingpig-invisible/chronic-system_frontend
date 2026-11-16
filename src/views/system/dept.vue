<template>
  <div class="page-container">
    <div class="table-card">
      <div class="table-toolbar">
        <el-button v-permission="['system:dept:add']" type="primary" :icon="Plus" @click="openAdd(null)">新增科室</el-button>
      </div>
      <el-table
        v-loading="loading"
        :data="list"
        row-key="deptId"
        border
        default-expand-all
        :tree-props="{ children: 'children' }"
      >
        <el-table-column prop="deptName" label="科室名称" min-width="200" />
        <el-table-column prop="orderNum" label="排序" width="90" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === '0' ? 'success' : 'danger'" size="small">{{ row.status === '0' ? '正常' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="300" fixed="right">
          <template #default="{ row }">
            <el-button v-permission="['system:dept:add']" type="primary" link size="small" @click="openAdd(row)">新增下级</el-button>
            <el-button v-permission="['system:dept:edit']" type="primary" link size="small" @click="openEdit(row)">编辑</el-button>
            <el-button type="info" link size="small" @click="openDoctors(row)">查看医生</el-button>
            <el-button v-permission="['system:dept:remove']" type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-drawer v-model="doctorDrawer" :title="`【${currentDept.deptName}】医生列表`" size="560px">
      <el-table v-loading="doctorLoading" :data="doctorList" border stripe>
        <el-table-column prop="userId" label="ID" width="70" />
        <el-table-column prop="realName" label="姓名" width="110" />
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="title" label="职称" width="100" />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === '0' ? 'success' : 'danger'" size="small">
              {{ row.status === '0' ? '正常' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!doctorLoading && !doctorList.length" description="该科室暂无医生" :image-size="80" />
    </el-drawer>

    <el-dialog v-model="dialogVisible" :title="form.deptId ? '编辑科室' : '新增科室'" width="460px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="上级科室">
          <el-tree-select
            v-model="form.parentId"
            :data="treeSelectData"
            :props="{ label: 'deptName', children: 'children', value: 'deptId' }"
            check-strictly
            node-key="deptId"
            placeholder="不选则为顶级"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item label="科室名称" prop="deptName"><el-input v-model="form.deptName" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.orderNum" :min="0" style="width:100%" /></el-form-item>
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
import { deptTree, addDept, updateDept, delDept, deptDoctors } from '@/api/system'

const loading = ref(false)
const list = ref([])
const rawTree = ref([])
const dialogVisible = ref(false)
const doctorDrawer = ref(false)
const doctorLoading = ref(false)
const doctorList = ref([])
const currentDept = ref({})
const formRef = ref()

const form = reactive({ deptId: null, parentId: null, deptName: '', orderNum: 0, status: '0' })
const rules = { deptName: [{ required: true, message: '请输入科室名称', trigger: 'blur' }] }

const treeSelectData = computed(() => [{ deptId: 0, deptName: '顶级科室', children: rawTree.value }])

const loadTree = async () => {
  loading.value = true
  try {
    const res = await deptTree()
    rawTree.value = res.data || []
    list.value = res.data || []
  } finally {
    loading.value = false
  }
}

const openAdd = (row) => {
  Object.assign(form, { deptId: null, parentId: row ? row.deptId : 0, deptName: '', orderNum: 0, status: '0' })
  dialogVisible.value = true
}

const openEdit = (row) => {
  Object.assign(form, { deptId: row.deptId, parentId: row.parentId, deptName: row.deptName, orderNum: row.orderNum, status: row.status })
  dialogVisible.value = true
}

const handleSubmit = () => {
  formRef.value.validate(async (valid) => {
    if (!valid) return
    if (form.deptId) {
      await updateDept(form)
      ElMessage.success('修改成功')
    } else {
      await addDept(form)
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    loadTree()
  })
}

const openDoctors = async (row) => {
  currentDept.value = row
  doctorList.value = []
  doctorDrawer.value = true
  doctorLoading.value = true
  try {
    const res = await deptDoctors(row.deptId)
    doctorList.value = res.data || []
  } finally {
    doctorLoading.value = false
  }
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定删除科室「${row.deptName}」吗？`, '提示', { type: 'warning' }).then(async () => {
    await delDept(row.deptId)
    ElMessage.success('删除成功')
    loadTree()
  })
}

onMounted(loadTree)
</script>
