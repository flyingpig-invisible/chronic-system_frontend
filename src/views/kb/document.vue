<template>
  <div class="page-container kb-page">
    <div class="kb-layout">
      <!-- 左侧：文档列表 -->
      <div class="kb-side">
        <div class="side-head">
          <el-input v-model="query.keyword" placeholder="搜索标题 / 摘要 / 标签" clearable
            :prefix-icon="Search" @keyup.enter="handleQuery" @clear="handleQuery" />
        </div>

        <div class="side-filter">
          <el-select v-model="query.kbType" placeholder="知识类型" clearable size="small" @change="handleQuery">
            <el-option label="标准来源库" value="1" />
            <el-option label="辅助解释库" value="2" />
          </el-select>
          <el-select v-model="query.diseaseCode" placeholder="病种" clearable size="small" @change="handleQuery">
            <el-option label="高血压" value="1" />
            <el-option label="糖尿病" value="2" />
            <el-option label="冠心病" value="3" />
            <el-option label="慢阻肺" value="4" />
          </el-select>
        </div>

        <div class="side-stat">
          <span>共 {{ total }} 篇</span>
          <span class="muted">已发布 {{ stats.published || 0 }} / 草稿 {{ stats.draft || 0 }}</span>
        </div>

        <div v-loading="loading" class="doc-list">
          <div v-for="d in list" :key="d.docId"
            :class="['doc-item', current && current.docId === d.docId ? 'active' : '']"
            @click="openDoc(d)">
            <div class="doc-title">{{ d.title }}</div>
            <div class="doc-meta">
              <el-tag size="small" :type="d.kbType === '1' ? 'warning' : 'success'" effect="plain">
                {{ d.kbType === '1' ? '标准来源' : '辅助解释' }}
              </el-tag>
              <span class="muted">{{ diseaseName(d.diseaseCode) }}</span>
            </div>
            <div class="doc-summary">{{ d.summary || '暂无摘要' }}</div>
            <div class="doc-foot">
              <span class="muted">{{ d.category || '未分类' }}</span>
              <span class="muted">{{ (d.updateTime || d.createTime || '').slice(0, 10) }}</span>
            </div>
          </div>
          <el-empty v-if="!loading && !list.length" description="暂无知识文档" :image-size="70" />
        </div>

        <div class="side-pager">
          <el-pagination small layout="prev, pager, next" :total="total"
            :page-size="query.pageSize" :current-page="query.pageNum" @current-change="onPageChange" />
        </div>
      </div>

      <!-- 右侧：阅读 / 编辑 -->
      <div class="kb-main">
        <div class="main-toolbar">
          <div class="left">
            <el-button v-permission="['chronic:kb:edit']" type="primary" :icon="Plus" @click="openAdd">
              新增文章
            </el-button>
            <el-button v-if="current" :icon="EditPen" @click="openEdit(current)">编辑</el-button>
            <el-button v-if="current" type="danger" plain :icon="Delete" @click="handleDelete(current)">
              删除
            </el-button>
          </div>
          <div class="right">
            <el-tag v-if="!isEditing && current" size="small" type="info">
              浏览 {{ current.viewCount || 0 }}
            </el-tag>
            <el-button v-if="isEditing" @click="cancelEdit">取消</el-button>
            <el-button v-if="isEditing" type="primary" :loading="saving" @click="handleSubmit">保存</el-button>
          </div>
        </div>

        <!-- 阅读态 -->
        <div v-if="!isEditing && current" class="reader">
          <h1 class="reader-title">{{ current.title }}</h1>
          <div class="reader-meta">
            <el-tag size="small" :type="current.kbType === '1' ? 'warning' : 'success'">
              {{ current.kbType === '1' ? '标准来源库' : '辅助解释库' }}
            </el-tag>
            <span>{{ diseaseName(current.diseaseCode) }}</span>
            <span v-if="current.category">· {{ current.category }}</span>
            <span v-if="current.publisher">· {{ current.publisher }}</span>
            <span v-if="current.version">· {{ current.version }}</span>
          </div>

          <el-descriptions :column="2" size="small" border class="reader-desc">
            <el-descriptions-item label="发布日期">{{ current.publishDate || '-' }}</el-descriptions-item>
            <el-descriptions-item label="生效日期">{{ current.effectiveDate || '-' }}</el-descriptions-item>
            <el-descriptions-item label="适用人群">{{ current.applicableScope || '-' }}</el-descriptions-item>
            <el-descriptions-item label="原文位置">{{ current.sourceLocation || '-' }}</el-descriptions-item>
            <el-descriptions-item label="文件名">{{ current.fileName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="文件哈希">
              <span class="hash">{{ current.fileHash || '-' }}</span>
              <el-tag v-if="current.fileHash" size="small" type="success" effect="plain" class="hash-tag">
                服务端计算
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>

          <div v-if="current.summary" class="reader-summary">{{ current.summary }}</div>
          <div class="reader-content">{{ current.content }}</div>

          <div v-if="current.tags" class="reader-tags">
            <el-tag v-for="t in tagList(current.tags)" :key="t" size="small" effect="plain">{{ t }}</el-tag>
          </div>

          <!-- AI 知识依据预览：查看该病种下，AI 回答某问题会引用哪些知识 -->
          <div class="kb-preview">
            <div class="kb-preview-head">
              <span>AI 知识依据预览</span>
              <span class="muted">模拟患者提问，查看 AI 回答将引用哪些知识条目及出处</span>
            </div>
            <div class="kb-preview-form">
              <el-input v-model="previewForm.question" placeholder="如：血压高需要注意什么？"
                clearable @keyup.enter="handlePreview" />
              <el-select v-model="previewForm.diseaseCode" placeholder="病种" clearable style="width:130px">
                <el-option label="高血压" value="1" />
                <el-option label="糖尿病" value="2" />
                <el-option label="冠心病" value="3" />
                <el-option label="慢阻肺" value="4" />
              </el-select>
              <el-button type="primary" :loading="previewLoading" @click="handlePreview">预览</el-button>
            </div>
            <div v-if="previewHits.length" class="kb-preview-list">
              <div v-for="(h, i) in previewHits" :key="h.docId" class="kb-preview-item">
                <div class="kb-preview-item-head">
                  <el-tag size="small" :type="h.kbType === '1' ? 'warning' : 'success'" effect="plain">
                    {{ h.kbType === '1' ? '标准来源库' : '辅助解释库' }}
                  </el-tag>
                  <span class="kb-preview-title">{{ i + 1 }}. {{ h.title }}</span>
                  <span class="kb-preview-score">相关度 {{ h.score }}</span>
                </div>
                <div class="kb-preview-body">{{ h.content }}</div>
                <div class="kb-preview-src">
                  出处：{{ h.publisher || '系统知识库' }}
                  <span v-if="h.version"> {{ h.version }}</span>
                  <span v-if="h.sourceLocation"> {{ h.sourceLocation }}</span>
                </div>
              </div>
            </div>
            <el-empty v-else-if="previewed" description="该提问下未命中知识条目（AI 将提示“知识库暂无依据”）"
              :image-size="60" />
          </div>
        </div>

        <!-- 编辑态 -->
        <div v-else-if="isEditing" class="editor">
          <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
            <el-form-item label="标题" prop="title">
              <el-input v-model="form.title" placeholder="请输入文档标题" />
            </el-form-item>
            <el-row :gutter="12">
              <el-col :span="8">
                <el-form-item label="知识类型">
                  <el-select v-model="form.kbType" style="width:100%">
                    <el-option label="标准来源库" value="1" />
                    <el-option label="辅助解释库" value="2" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="病种">
                  <el-select v-model="form.diseaseCode" clearable style="width:100%">
                    <el-option label="高血压" value="1" />
                    <el-option label="糖尿病" value="2" />
                    <el-option label="冠心病" value="3" />
                    <el-option label="慢阻肺" value="4" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="分类">
                  <el-input v-model="form.category" placeholder="指南 / 规范 / 科普 / FAQ" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="12">
              <el-col :span="8">
                <el-form-item label="发布单位"><el-input v-model="form.publisher" /></el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="发布日期"><el-input v-model="form.publishDate" placeholder="2024-01-01" /></el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="生效日期"><el-input v-model="form.effectiveDate" placeholder="2024-01-01" /></el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="12">
              <el-col :span="8">
                <el-form-item label="适用人群"><el-input v-model="form.applicableScope" /></el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="版本"><el-input v-model="form.version" placeholder="2024版" /></el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="原文位置"><el-input v-model="form.sourceLocation" placeholder="第3.2节" /></el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="原始文件">
              <div class="upload-row">
                <el-upload
                  :show-file-list="false"
                  :before-upload="handleBeforeUpload"
                  :http-request="handleUpload"
                  accept=".pdf,.txt,.md,.doc,.docx"
                >
                  <el-button :icon="UploadFilled" :loading="uploading">选择文件上传</el-button>
                </el-upload>
                <span class="upload-tip">
                  支持 PDF / TXT / MD / DOC / DOCX，≤20MB；哈希由系统自动计算
                </span>
              </div>
            </el-form-item>
            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item label="文件名">
                  <el-input v-model="form.fileName" placeholder="上传后自动填充" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="文件地址">
                  <el-input v-model="form.fileUrl" placeholder="上传后自动填充" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="文件哈希">
              <el-input v-model="form.fileHash" readonly placeholder="上传后由服务端自动计算 SHA-256">
                <template #append>
                  <el-tooltip content="服务端对文件字节流计算，保证与文件一一对应" placement="top">
                    <span class="auto-tag">自动</span>
                  </el-tooltip>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item label="标签">
              <el-input v-model="form.tags" placeholder="多个标签用英文逗号分隔，如：血压,阈值,成人" />
            </el-form-item>
            <el-form-item label="检索关键词">
              <el-input v-model="form.keywords" placeholder="供 AI 检索用，英文逗号分隔，如：高血压,降压药,依从性" />
            </el-form-item>
            <el-form-item label="摘要">
              <el-input v-model="form.summary" type="textarea" :rows="2" />
            </el-form-item>
            <el-form-item label="正文" prop="content">
              <el-input v-model="form.content" type="textarea" :rows="16"
                placeholder="支持纯文本或 Markdown" />
            </el-form-item>
            <el-form-item label="状态">
              <el-radio-group v-model="form.status">
                <el-radio value="1">发布</el-radio>
                <el-radio value="0">草稿</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-form>
        </div>

        <el-empty v-else description="请从左侧选择一篇文档阅读，或点击「新增文章」" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, EditPen, Delete, UploadFilled } from '@element-plus/icons-vue'
import { listKbDocument, getKbDocument, saveKbDocument, delKbDocument, getKbStats, uploadKbFile, searchKbSnippet } from '@/api/kb'

const loading = ref(false)
const saving = ref(false)
const list = ref([])
const total = ref(0)
const current = ref(null)
const isEditing = ref(false)
const formRef = ref()
const stats = ref({})
const uploading = ref(false)

const query = reactive({ pageNum: 1, pageSize: 20, keyword: '', kbType: '', diseaseCode: '' })

const emptyForm = () => ({
  docId: null, title: '', kbType: '1', diseaseCode: '', category: '',
  summary: '', content: '', publisher: '', publishDate: '', effectiveDate: '',
  applicableScope: '', version: '', fileName: '', fileUrl: '', fileHash: '',
  sourceLocation: '', tags: '', keywords: '', status: '1'
})
const form = reactive(emptyForm())

const rules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入正文内容', trigger: 'blur' }]
}

const diseaseName = (c) => ({ 1: '高血压', 2: '糖尿病', 3: '冠心病', 4: '慢阻肺' }[c] || '通用')

// 知识依据预览
const previewForm = reactive({ question: '', diseaseCode: '' })
const previewHits = ref([])
const previewed = ref(false)
const previewLoading = ref(false)

const handlePreview = async () => {
  previewLoading.value = true
  previewed.value = false
  try {
    const params = { question: previewForm.question, topK: 3 }
    if (previewForm.diseaseCode) params.diseaseCode = previewForm.diseaseCode
    else if (current.value && current.value.diseaseCode && current.value.diseaseCode !== '0') {
      params.diseaseCode = current.value.diseaseCode
    }
    const res = await searchKbSnippet(params)
    previewHits.value = res.data || []
    previewed.value = true
  } catch (e) {
    previewHits.value = []
  } finally {
    previewLoading.value = false
  }
}
const tagList = (t) => (t || '').split(',').map((x) => x.trim()).filter(Boolean)

const loadList = async () => {
  loading.value = true
  try {
    const res = await listKbDocument(query)
    list.value = res.data.rows || []
    total.value = res.data.total || 0
  } finally {
    loading.value = false
  }
}

const loadStats = async () => {
  try {
    const res = await getKbStats()
    stats.value = res.data || {}
  } catch (e) {}
}

const handleQuery = () => { query.pageNum = 1; loadList() }
const onPageChange = (p) => { query.pageNum = p; loadList() }

const openDoc = async (d) => {
  isEditing.value = false
  const res = await getKbDocument(d.docId)
  current.value = res.data
  const idx = list.value.findIndex((x) => x.docId === d.docId)
  if (idx > -1 && current.value) {
    list.value[idx].viewCount = current.value.viewCount
  }
}

const openAdd = () => {
  Object.assign(form, emptyForm())
  isEditing.value = true
}

const openEdit = (d) => {
  Object.assign(form, emptyForm(), d)
  isEditing.value = true
}

// 上传前校验大小
const handleBeforeUpload = (file) => {
  const max = 20 * 1024 * 1024
  if (file.size > max) {
    ElMessage.error('文件大小不能超过 20MB')
    return false
  }
  return true
}

// 上传：哈希、文件名、地址、正文全部由服务端返回后回填
const handleUpload = async (options) => {
  uploading.value = true
  try {
    const res = await uploadKbFile(options.file)
    const d = res.data || {}
    if (d.duplicate) {
      ElMessageBox.confirm(
        '该文件已上传过（哈希一致），对应文档「' + (d.duplicateDocTitle || '未命名') + '」，是否直接打开？',
        '重复文件',
        { type: 'warning', confirmButtonText: '打开该文档', cancelButtonText: '留在此页' }
      ).then(() => {
        const target = list.value.find((x) => x.docId === d.duplicateDocId) || { docId: d.duplicateDocId }
        if (target.docId) {
          isEditing.value = false
          openDoc(target)
        }
      }).catch(() => {})
      return
    }
    form.fileName = d.fileName || form.fileName
    form.fileUrl = d.fileUrl || ''
    form.fileHash = d.fileHash || ''
    if (d.content && !form.content) {
      form.content = d.content
    }
    if (!form.title && d.fileName) {
      form.title = d.fileName.replace(/\.[^.]+$/, '')
    }
    ElMessage.success('上传成功，哈希已自动计算')
  } catch (e) {
    // 错误提示由 request 统一处理
  } finally {
    uploading.value = false
  }
}

const cancelEdit = () => {
  isEditing.value = false
  Object.assign(form, emptyForm())
}

const handleSubmit = () => {
  formRef.value.validate(async (valid) => {
    if (!valid) return
    saving.value = true
    try {
      const res = await saveKbDocument(form)
      ElMessage.success('保存成功')
      const savedId = form.docId || (res.data != null ? res.data : null)
      isEditing.value = false
      await loadList()
      await loadStats()
      if (savedId) {
        const target = list.value.find((x) => x.docId === savedId) || { docId: savedId }
        await openDoc(target)
      }
    } finally {
      saving.value = false
    }
  })
}

const handleDelete = (d) => {
  ElMessageBox.confirm('确定删除知识文档「' + d.title + '」吗？', '提示', { type: 'warning' })
    .then(async () => {
      await delKbDocument(d.docId)
      ElMessage.success('删除成功')
      if (current.value && current.value.docId === d.docId) {
        current.value = null
      }
      await loadList()
      await loadStats()
    })
}

onMounted(() => {
  loadList()
  loadStats()
})
</script>

<style scoped>
.kb-page {
  height: calc(100vh - 100px);
}
.kb-layout {
  display: flex;
  height: 100%;
  background: var(--bg-panel);
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--line);
  box-shadow: 0 16px 44px rgba(0, 0, 0, 0.4);
}
.kb-side {
  width: 344px;
  flex-shrink: 0;
  border-right: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  height: 100%;
  background: rgba(6, 12, 24, 0.28);
}
.side-head {
  padding: 12px;
  border-bottom: 1px solid var(--line);
}
.side-filter {
  display: flex;
  gap: 8px;
  padding: 0 12px 10px;
}
.side-filter .el-select {
  flex: 1;
}
.side-stat {
  display: flex;
  justify-content: space-between;
  padding: 9px 12px;
  background: rgba(64, 158, 255, 0.05);
  font-size: 12px;
  color: var(--t-sub);
  border-bottom: 1px solid var(--line);
}
.doc-list {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
.doc-item {
  padding: 12px 14px;
  border-bottom: 1px solid rgba(64, 158, 255, 0.08);
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: background 0.18s, border-color 0.18s;
}
.doc-item:hover {
  background: rgba(64, 158, 255, 0.06);
}
.doc-item.active {
  background: linear-gradient(90deg, rgba(64, 158, 255, 0.16), rgba(64, 158, 255, 0.02));
  border-left-color: #409eff;
  box-shadow: inset 0 0 22px rgba(64, 158, 255, 0.12);
}
.doc-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--t-main);
  line-height: 1.45;
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.doc-item.active .doc-title {
  color: #303133;
}
.doc-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  margin-bottom: 6px;
}
.doc-summary {
  font-size: 12px;
  color: var(--t-dim);
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.doc-foot {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-top: 6px;
}
.side-pager {
  border-top: 1px solid var(--line);
  padding: 8px 0;
  text-align: center;
}
.kb-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
}
.main-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
  background: #f5f7fa;
}
.reader,
.editor {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px 60px;
  min-height: 0;
}
.reader-title {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: var(--t-main);
  margin: 0 0 14px;
  line-height: 1.4;
}
.reader-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 13px;
  color: var(--t-sub);
  margin-bottom: 20px;
}
.reader-desc {
  margin-bottom: 20px;
}
.hash {
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
  word-break: break-all;
}
.reader-summary {
  background: rgba(64, 158, 255, 0.07);
  border-left: 3px solid #409eff;
  padding: 13px 16px;
  color: #606266;
  font-size: 13px;
  line-height: 1.75;
  border-radius: 0 10px 10px 0;
  margin-bottom: 22px;
  box-shadow: inset 0 0 26px rgba(64, 158, 255, 0.08);
}
.reader-content {
  font-size: 15px;
  line-height: 1.95;
  color: #606266;
  white-space: pre-wrap;
  word-break: break-word;
}
.reader-tags {
  margin-top: 28px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.muted {
  color: var(--t-dim);
}
.upload-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.upload-tip {
  color: var(--t-dim);
  font-size: 12px;
}
.auto-tag {
  color: #67c23a;
  font-size: 12px;
}
.hash-tag {
  margin-left: 8px;
}
.kb-preview {
  margin-top: 34px;
  padding-top: 22px;
  border-top: 1px dashed var(--line);
}
.kb-preview-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--t-main);
}
.kb-preview-head .muted {
  font-weight: 400;
  font-size: 12px;
}
.kb-preview-form {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}
.kb-preview-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.kb-preview-item {
  background: rgba(64, 158, 255, 0.05);
  border: 1px solid rgba(64, 158, 255, 0.16);
  border-radius: 10px;
  padding: 12px 14px;
}
.kb-preview-item-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.kb-preview-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  flex: 1;
}
.kb-preview-score {
  font-size: 12px;
  color: var(--t-dim);
}
.kb-preview-body {
  font-size: 13px;
  line-height: 1.8;
  color: #606266;
  white-space: pre-wrap;
}
.kb-preview-src {
  margin-top: 8px;
  font-size: 12px;
  color: var(--t-dim);
}
</style>
