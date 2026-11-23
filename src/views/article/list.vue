<template>
  <div class="page-container">
    <div class="search-bar">
      <el-form :model="query" inline>
        <el-form-item label="标题"><el-input v-model="query.keyword" clearable style="width:180px" /></el-form-item>
        <el-form-item label="分类">
          <el-select v-model="query.categoryId" placeholder="全部" clearable style="width:150px">
            <el-option v-for="c in categories" :key="c.categoryId" :label="c.categoryName" :value="c.categoryId" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.publishStatus" placeholder="全部" clearable style="width:120px">
            <el-option label="草稿" value="0" />
            <el-option label="已发布" value="1" />
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
        <el-button v-permission="['chronic:article:edit']" type="primary" :icon="Plus" @click="openAdd">新增文章</el-button>
      </div>
      <el-table ref="tableRef" v-loading="loading" :data="list" border stripe row-key="articleId">
        <el-table-column type="expand" width="44">
          <template #default="{ row }">
            <div class="article-expand">
              <div class="article-expand-head">
                <span class="article-expand-title">{{ row.title }}</span>
                <span class="article-expand-meta">
                  {{ row.categoryName || '-' }} · {{ diseaseName(row.diseaseCode) }}
                  <template v-if="row.author"> · {{ row.author }}</template>
                  <template v-if="row.publishTime"> · {{ row.publishTime }}</template>
                </span>
              </div>
              <div v-if="row.summary" class="article-expand-summary">摘要：{{ row.summary }}</div>
              <div v-if="hasHtml(row.content)" class="article-expand-body" v-html="row.content"></div>
              <pre v-else-if="row.content" class="article-expand-body article-expand-text">{{ row.content }}</pre>
              <el-empty v-else description="暂无正文内容" :image-size="60" />
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
        <el-table-column prop="categoryName" label="分类" width="120" />
        <el-table-column label="病种" width="100">
          <template #default="{ row }">{{ diseaseName(row.diseaseCode) }}</template>
        </el-table-column>
        <el-table-column prop="author" label="作者" width="100" />
        <el-table-column prop="viewCount" label="浏览量" width="90" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.publishStatus === '1' ? 'success' : 'info'" size="small">
              {{ row.publishStatus === '1' ? '已发布' : '草稿' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="publishTime" label="发布时间" width="170" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button v-permission="['chronic:article:edit']" type="primary" link size="small" @click="openEdit(row)">编辑</el-button>
            <el-button v-permission="['chronic:article:edit']" type="success" link size="small" @click="togglePublish(row)">
              {{ row.publishStatus === '1' ? '下架' : '发布' }}
            </el-button>
            <el-button v-permission="['chronic:article:remove']" type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap">
        <el-pagination v-model:current-page="query.pageNum" v-model:page-size="query.pageSize"
          :page-sizes="[10, 20, 50]" :total="total" layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadList" @current-change="loadList" />
      </div>
    </div>

    <el-dialog v-model="dialogVisible" :title="form.articleId ? '编辑文章' : '新增文章'" width="720px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="标题" prop="title"><el-input v-model="form.title" /></el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="分类">
              <el-select v-model="form.categoryId" style="width:100%" @change="onCategoryChange">
                <el-option v-for="c in categories" :key="c.categoryId" :label="c.categoryName" :value="c.categoryId" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="病种">
              <el-select v-model="form.diseaseCode" style="width:100%">
                <el-option label="高血压" value="1" />
                <el-option label="糖尿病" value="2" />
                <el-option label="冠心病" value="3" />
                <el-option label="慢阻肺" value="4" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="作者"><el-input v-model="form.author" /></el-form-item>
        <el-form-item label="摘要"><el-input v-model="form.summary" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="正文"><el-input v-model="form.content" type="textarea" :rows="8" /></el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.publishStatus">
            <el-radio value="0">草稿</el-radio>
            <el-radio value="1">发布</el-radio>
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
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus } from '@element-plus/icons-vue'
import { listArticle, saveArticle, publishArticle, delArticle, listCategory } from '@/api/article'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const categories = ref([])
const dialogVisible = ref(false)
const formRef = ref()
const tableRef = ref()

const query = reactive({ pageNum: 1, pageSize: 10, keyword: '', categoryId: null, publishStatus: '' })
const form = reactive({
  articleId: null, title: '', categoryId: null, categoryName: '', diseaseCode: '1',
  summary: '', content: '', author: '', publishStatus: '0'
})
const rules = { title: [{ required: true, message: '请输入标题', trigger: 'blur' }] }

const diseaseName = (c) => ({ 1: '高血压', 2: '糖尿病', 3: '冠心病', 4: '慢阻肺' }[c] || '-')
const hasHtml = (text) => typeof text === 'string' && /<\/?[a-z][\s\S]*>/i.test(text)

const loadList = async () => {
  loading.value = true
  try {
    const res = await listArticle(query)
    list.value = res.data.rows
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

const handleQuery = () => { query.pageNum = 1; loadList() }
const resetQuery = () => {
  Object.assign(query, { pageNum: 1, pageSize: 10, keyword: '', categoryId: null, publishStatus: '' })
  loadList()
}

const onCategoryChange = (id) => {
  const c = categories.value.find((x) => x.categoryId === id)
  form.categoryName = c ? c.categoryName : ''
}

const openAdd = () => {
  Object.assign(form, {
    articleId: null, title: '', categoryId: null, categoryName: '', diseaseCode: '1',
    summary: '', content: '', author: '医生', publishStatus: '0'
  })
  dialogVisible.value = true
}

const openEdit = (row) => {
  Object.assign(form, row)
  dialogVisible.value = true
}

const handleSubmit = () => {
  formRef.value.validate(async (valid) => {
    if (!valid) return
    await saveArticle(form)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadList()
  })
}

const togglePublish = async (row) => {
  await publishArticle(row.articleId, row.publishStatus === '1' ? '0' : '1')
  ElMessage.success('操作成功')
  loadList()
}

const handleDelete = (row) => {
  ElMessageBox.confirm('确定删除该文章吗？', '提示', { type: 'warning' }).then(async () => {
    await delArticle(row.articleId)
    ElMessage.success('删除成功')
    loadList()
  })
}

onMounted(async () => {
  loadList()
  try {
    const res = await listCategory()
    categories.value = res.data || []
  } catch (e) {}
})
</script>

<style scoped>
.article-expand {
  padding: 4px 16px 12px 44px;
  text-align: left;
}

.article-expand-head {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 10px;
}

.article-expand-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.article-expand-meta {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.article-expand-summary {
  margin-bottom: 10px;
  padding: 8px 12px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-light);
  border-radius: 6px;
}

.article-expand-body {
  font-size: 14px;
  line-height: 1.8;
  color: var(--el-text-color-regular);
  max-width: 960px;
}

.article-expand-body :deep(h1),
.article-expand-body :deep(h2),
.article-expand-body :deep(h3) {
  margin: 12px 0 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.article-expand-body :deep(p) {
  margin: 8px 0;
}

.article-expand-body :deep(ul),
.article-expand-body :deep(ol) {
  margin: 8px 0;
  padding-left: 22px;
}

.article-expand-body :deep(img) {
  max-width: 100%;
  height: auto;
}

.article-expand-text {
  margin: 0;
  font-family: inherit;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>