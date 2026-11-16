<template>
  <div class="page-container">
    <el-row :gutter="16">
      <el-col :span="10">
        <div class="table-card">
          <div class="table-toolbar">
            <b>字典类型</b>
            <el-button v-permission="['system:dict:add']" type="primary" size="small" :icon="Plus" @click="openTypeAdd">新增</el-button>
          </div>
          <el-table v-loading="typeLoading" :data="typeList" border highlight-current-row @current-change="onTypeSelect">
            <el-table-column prop="dictName" label="字典名称" min-width="130" />
            <el-table-column prop="dictType" label="字典类型" min-width="150" />
            <el-table-column label="操作" width="130">
              <template #default="{ row }">
                <el-button v-permission="['system:dict:edit']" type="primary" link size="small" @click="openTypeEdit(row)">编辑</el-button>
                <el-button v-permission="['system:dict:remove']" type="danger" link size="small" @click="handleTypeDelete(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div class="pagination-wrap">
            <el-pagination v-model:current-page="typeQuery.pageNum" v-model:page-size="typeQuery.pageSize"
              :total="typeTotal" layout="total, prev, pager, next" @current-change="loadTypes" />
          </div>
        </div>
      </el-col>

      <el-col :span="14">
        <div class="table-card">
          <div class="table-toolbar">
            <b>字典数据 {{ currentType ? '（' + currentType.dictName + '）' : '' }}</b>
            <el-button v-permission="['system:dict:add']" type="primary" size="small" :icon="Plus" :disabled="!currentType" @click="openDataAdd">新增</el-button>
          </div>
          <el-table v-loading="dataLoading" :data="dataList" border>
            <el-table-column prop="dictLabel" label="标签" min-width="110" />
            <el-table-column prop="dictValue" label="键值" width="100" />
            <el-table-column prop="dictSort" label="排序" width="70" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.status === '0' ? 'success' : 'danger'" size="small">{{ row.status === '0' ? '正常' : '停用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="130">
              <template #default="{ row }">
                <el-button v-permission="['system:dict:edit']" type="primary" link size="small" @click="openDataEdit(row)">编辑</el-button>
                <el-button v-permission="['system:dict:remove']" type="danger" link size="small" @click="handleDataDelete(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!currentType" description="请先选择左侧字典类型" :image-size="70" />
        </div>
      </el-col>
    </el-row>

    <el-dialog v-model="typeDialogVisible" :title="typeForm.dictId ? '编辑字典类型' : '新增字典类型'" width="460px">
      <el-form ref="typeFormRef" :model="typeForm" :rules="typeRules" label-width="90px">
        <el-form-item label="字典名称" prop="dictName"><el-input v-model="typeForm.dictName" /></el-form-item>
        <el-form-item label="字典类型" prop="dictType"><el-input v-model="typeForm.dictType" :disabled="!!typeForm.dictId" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="typeForm.remark" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="typeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitType">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="dataDialogVisible" :title="dataForm.dictCode ? '编辑字典数据' : '新增字典数据'" width="460px">
      <el-form ref="dataFormRef" :model="dataForm" :rules="dataRules" label-width="90px">
        <el-form-item label="字典标签" prop="dictLabel"><el-input v-model="dataForm.dictLabel" /></el-form-item>
        <el-form-item label="字典键值" prop="dictValue"><el-input v-model="dataForm.dictValue" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="dataForm.dictSort" :min="0" style="width:100%" /></el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="dataForm.status">
            <el-radio value="0">正常</el-radio>
            <el-radio value="1">停用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="dataForm.remark" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dataDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitData">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import {
  listDictType, dictDataByType, addDictType, updateDictType, delDictType,
  addDictData, updateDictData, delDictData
} from '@/api/system'

const typeLoading = ref(false)
const dataLoading = ref(false)
const typeList = ref([])
const dataList = ref([])
const typeTotal = ref(0)
const currentType = ref(null)
const typeDialogVisible = ref(false)
const dataDialogVisible = ref(false)
const typeFormRef = ref()
const dataFormRef = ref()

const typeQuery = reactive({ pageNum: 1, pageSize: 10 })
const typeForm = reactive({ dictId: null, dictName: '', dictType: '', remark: '' })
const dataForm = reactive({ dictCode: null, dictSort: 0, dictLabel: '', dictValue: '', dictType: '', status: '0', remark: '' })
const typeRules = {
  dictName: [{ required: true, message: '请输入字典名称', trigger: 'blur' }],
  dictType: [{ required: true, message: '请输入字典类型', trigger: 'blur' }]
}
const dataRules = {
  dictLabel: [{ required: true, message: '请输入标签', trigger: 'blur' }],
  dictValue: [{ required: true, message: '请输入键值', trigger: 'blur' }]
}

const loadTypes = async () => {
  typeLoading.value = true
  try {
    const res = await listDictType(typeQuery)
    typeList.value = res.data.rows
    typeTotal.value = res.data.total
    if (typeList.value.length && !currentType.value) {
      onTypeSelect(typeList.value[0])
    }
  } finally {
    typeLoading.value = false
  }
}

const onTypeSelect = async (row) => {
  if (!row) return
  currentType.value = row
  dataLoading.value = true
  try {
    const res = await dictDataByType(row.dictType)
    dataList.value = res.data || []
  } finally {
    dataLoading.value = false
  }
}

const openTypeAdd = () => {
  Object.assign(typeForm, { dictId: null, dictName: '', dictType: '', remark: '' })
  typeDialogVisible.value = true
}

const openTypeEdit = (row) => {
  Object.assign(typeForm, row)
  typeDialogVisible.value = true
}

const submitType = () => {
  typeFormRef.value.validate(async (valid) => {
    if (!valid) return
    if (typeForm.dictId) {
      await updateDictType(typeForm)
    } else {
      await addDictType(typeForm)
    }
    ElMessage.success('保存成功')
    typeDialogVisible.value = false
    currentType.value = null
    loadTypes()
  })
}

const handleTypeDelete = (row) => {
  ElMessageBox.confirm(`确定删除字典类型「${row.dictName}」吗？`, '提示', { type: 'warning' }).then(async () => {
    await delDictType(row.dictId)
    ElMessage.success('删除成功')
    currentType.value = null
    dataList.value = []
    loadTypes()
  })
}

const openDataAdd = () => {
  Object.assign(dataForm, { dictCode: null, dictSort: 0, dictLabel: '', dictValue: '', dictType: currentType.value.dictType, status: '0', remark: '' })
  dataDialogVisible.value = true
}

const openDataEdit = (row) => {
  Object.assign(dataForm, row)
  dataDialogVisible.value = true
}

const submitData = () => {
  dataFormRef.value.validate(async (valid) => {
    if (!valid) return
    if (dataForm.dictCode) {
      await updateDictData(dataForm)
    } else {
      await addDictData(dataForm)
    }
    ElMessage.success('保存成功')
    dataDialogVisible.value = false
    onTypeSelect(currentType.value)
  })
}

const handleDataDelete = (row) => {
  ElMessageBox.confirm(`确定删除字典数据「${row.dictLabel}」吗？`, '提示', { type: 'warning' }).then(async () => {
    await delDictData(row.dictCode)
    ElMessage.success('删除成功')
    onTypeSelect(currentType.value)
  })
}

onMounted(loadTypes)
</script>
