<template>
  <div class="page-container">
    <div class="search-bar">
      <el-form :model="query" inline>
        <el-form-item label="患者">
          <PatientSelect v-model="query.patientId" width="220px" style="display:inline-block" />
        </el-form-item>
        <el-form-item label="就诊方式">
          <el-select v-model="query.visitType" placeholder="全部" clearable style="width:120px">
            <el-option label="图文" value="1" />
            <el-option label="视频" value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.visitStatus" placeholder="全部" clearable style="width:120px">
            <el-option label="待接诊" value="0" />
            <el-option label="问诊中" value="1" />
            <el-option label="已完成" value="2" />
            <el-option label="已取消" value="3" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleQuery">搜索</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </div>
    <div class="table-card">
      <el-table v-loading="loading" :data="list" border stripe>
        <el-table-column prop="patientName" label="患者" width="90" />
        <el-table-column label="方式" width="80">
          <template #default="{ row }">{{ row.visitType === '2' ? '视频' : '图文' }}</template>
        </el-table-column>
        <el-table-column prop="chiefComplaint" label="主诉" min-width="160" show-overflow-tooltip />
        <el-table-column prop="doctorName" label="接诊医生" width="100" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.visitStatus)" size="small">{{ statusName(row.visitStatus) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="applyTime" label="申请时间" width="170" />
        <el-table-column label="操作" width="190" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.visitStatus === '0'" type="primary" link size="small" @click="handleAccept(row)">接诊</el-button>
            <el-button v-if="row.visitStatus === '1'" type="success" link size="small" @click="openFinish(row)">完成</el-button>
            <el-button v-if="row.visitStatus === '0' || row.visitStatus === '1'" type="danger" link size="small" @click="handleCancel(row)">取消</el-button>
            <el-button type="info" link size="small" @click="openView(row)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap">
        <el-pagination v-model:current-page="query.pageNum" v-model:page-size="query.pageSize"
          :page-sizes="[10, 20, 50]" :total="total" layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadList" @current-change="loadList" />
      </div>
    </div>

    <el-dialog v-model="finishVisible" title="完成就诊" width="560px">
      <el-form ref="finishRef" :model="finishForm" :rules="finishRules" label-width="90px">
        <el-form-item label="诊断" prop="diagnosis"><el-input v-model="finishForm.diagnosis" /></el-form-item>
        <el-form-item label="医嘱建议"><el-input v-model="finishForm.advice" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="处方"><el-input v-model="finishForm.prescription" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="附件图片">
          <el-upload
            action="/api/chronic/upload/image"
            name="file"
            :headers="uploadHeaders"
            list-type="picture-card"
            :limit="9"
            :file-list="finishFiles"
            :on-success="onFinishUploadSuccess"
            :on-remove="onFinishUploadRemove"
            :on-change="onFinishUploadChange"
            :before-upload="beforeImageUpload"
            accept="image/*"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
          <div class="upload-tip">用于发送检验单、患处照片等，单张不超过 5MB，最多 9 张</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="finishVisible = false">取消</el-button>
        <el-button type="primary" @click="submitFinish">提交</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="viewVisible" title="就诊详情" width="560px">
      <el-descriptions :column="1" border size="small">
        <el-descriptions-item label="患者">{{ current.patientName }}</el-descriptions-item>
        <el-descriptions-item label="主诉">{{ current.chiefComplaint }}</el-descriptions-item>
        <el-descriptions-item v-if="current.imageList && current.imageList.length" label="症状图片">
          <el-image v-for="(img, i) in current.imageList" :key="img" :src="img" :preview-src-list="current.imageList" :initial-index="i" fit="cover" style="width:88px;height:88px;border-radius:6px;margin-right:8px" />
        </el-descriptions-item>
        <el-descriptions-item label="诊断">{{ current.diagnosis }}</el-descriptions-item>
        <el-descriptions-item label="医嘱">{{ current.advice }}</el-descriptions-item>
        <el-descriptions-item label="处方">{{ current.prescription }}</el-descriptions-item>
        <el-descriptions-item v-if="current.adviceImageList && current.adviceImageList.length" label="诊断附件">
          <el-image v-for="(img, i) in current.adviceImageList" :key="img" :src="img" :preview-src-list="current.adviceImageList" :initial-index="i" fit="cover" style="width:88px;height:88px;border-radius:6px;margin-right:8px" />
        </el-descriptions-item>
        <el-descriptions-item label="接诊医生">{{ current.doctorName }}</el-descriptions-item>
        <el-descriptions-item label="完成时间">{{ current.finishTime }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus } from '@element-plus/icons-vue'
import { listClinic, acceptClinic, finishClinic, cancelClinic } from '@/api/clinic'
import { useUserStore } from '@/store/user'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const finishVisible = ref(false)
const viewVisible = ref(false)
const current = ref({})
const finishRef = ref()

const query = reactive({ pageNum: 1, pageSize: 10, patientId: null, visitType: '', visitStatus: '' })
const finishForm = reactive({ diagnosis: '', advice: '', prescription: '', adviceImages: '' })
const finishFiles = ref([])
const uploadHeaders = computed(() => ({ Authorization: 'Bearer ' + useUserStore().token }))

const beforeImageUpload = (file) => {
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.warning('图片不能超过 5MB')
    return false
  }
  return true
}

// el-upload 自己维护内部文件列表，这里同步一份，保证提交时能拿到已上传成功的路径
const onFinishUploadSuccess = (res, file, files) => {
  if (!res || res.code !== 200) {
    ElMessage.error((res && res.msg) || '上传失败')
    finishFiles.value = (files || []).filter((f) => f.uid !== file.uid)
    syncFinishImages()
    return
  }
  // url 必须挂在 response 上，组件才认作上传成功并保留地址
  finishFiles.value = (files || []).map((f) => (f.uid === file.uid
    ? Object.assign({}, f, { url: res.data.url, response: res })
    : f))
  syncFinishImages()
}

const onFinishUploadRemove = (file, files) => {
  finishFiles.value = (files || []).filter((f) => f.uid !== file.uid)
  syncFinishImages()
}

const onFinishUploadChange = (file, files) => {
  finishFiles.value = files || []
}

const syncFinishImages = () => {
  finishForm.adviceImages = finishFiles.value.filter((f) => f.url).map((f) => f.url).join(',')
}
const finishRules = { diagnosis: [{ required: true, message: '请输入诊断', trigger: 'blur' }] }

const statusName = (s) => ({ 0: '待接诊', 1: '问诊中', 2: '已完成', 3: '已取消' }[s] || '-')
const statusTag = (s) => ({ 0: 'warning', 1: 'primary', 2: 'success', 3: 'info' }[s] || 'info')

const loadList = async () => {
  loading.value = true
  try {
    const res = await listClinic(query)
    list.value = res.data.rows
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

const handleQuery = () => { query.pageNum = 1; loadList() }
const resetQuery = () => {
  Object.assign(query, { pageNum: 1, pageSize: 10, patientId: null, visitType: '', visitStatus: '' })
  loadList()
}

const handleAccept = async (row) => {
  await acceptClinic(row.visitId)
  ElMessage.success('已接诊')
  loadList()
}

const openFinish = (row) => {
  current.value = row
  Object.assign(finishForm, { diagnosis: '', advice: '', prescription: '', adviceImages: '' })
  finishFiles.value = []
  finishVisible.value = true
}

const submitFinish = () => {
  finishRef.value.validate(async (valid) => {
    if (!valid) return
    await finishClinic(current.value.visitId, finishForm)
    ElMessage.success('就诊已完成')
    finishVisible.value = false
    loadList()
  })
}

const handleCancel = (row) => {
  ElMessageBox.confirm('确定取消该就诊吗？', '提示', { type: 'warning' }).then(async () => {
    await cancelClinic(row.visitId)
    ElMessage.success('已取消')
    loadList()
  })
}

const openView = (row) => {
  current.value = Object.assign({}, row, {
    imageList: row.imageUrls ? row.imageUrls.split(',').filter((u) => !!u) : [],
    adviceImageList: row.adviceImages ? row.adviceImages.split(',').filter((u) => !!u) : []
  })
  viewVisible.value = true
}

onMounted(loadList)
</script>
