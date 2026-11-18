<template>
  <el-select
    v-model="innerValue"
    filterable
    clearable
    :filter-method="onFilter"
    :remote-method="remoteSearch"
    remote
    :reserve-keyword="false"
    :loading="loading"
    :placeholder="placeholder"
    :style="{ width: width }"
    :multiple="multiple"
    :collapse-tags="multiple"
    :collapse-tags-tooltip="multiple"
    no-data-text="暂无患者"
    @visible-change="onVisibleChange"
    @change="handleChange"
  >
    <el-option
      v-for="p in options"
      :key="p.patientId"
      :label="formatLabel(p)"
      :value="p.patientId"
    >
      <span style="float:left">{{ p.name }}</span>
      <span style="float:right;color:#8492a6;font-size:12px">
        {{ p.phone || '-' }}<template v-if="p.patientNo"> · {{ p.patientNo }}</template>
      </span>
    </el-option>
  </el-select>
</template>

<script setup>
import { ref, watch } from 'vue'
import { listPatient, getPatient } from '@/api/patient'

const props = defineProps({
  modelValue: { type: [Number, String], default: null },
  placeholder: { type: String, default: '输入姓名或手机号搜索' },
  width: { type: String, default: '100%' },
  autoLoad: { type: Boolean, default: true },
  multiple: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue', 'select'])

const innerValue = ref(props.multiple ? (Array.isArray(props.modelValue) ? props.modelValue : []) : props.modelValue)
const options = ref([])
const allOptions = ref([])
const loading = ref(false)
let loaded = false
let searchSeq = 0
let filterTimer = null

watch(
  () => props.modelValue,
  (v) => {
    if (props.multiple) {
      innerValue.value = Array.isArray(v) ? v : []
      return
    }
    innerValue.value = v
    if (v && !options.value.some((o) => o.patientId === v)) {
      loadById(v)
    }
  }
)

const formatLabel = (p) => {
  const parts = [p.name]
  if (p.phone) parts.push(p.phone)
  return parts.join('  ')
}

const localMatch = (p, kw) => {
  const name = (p.name || '').toLowerCase()
  const phone = (p.phone || '').toLowerCase()
  const no = (p.patientNo || '').toLowerCase()
  return name.includes(kw) || phone.includes(kw) || no.includes(kw)
}

/** 输入时先在已加载的全部患者中即时筛选；本地无匹配时回退到后端全库搜索 */
function onFilter(keyword) {
  const kw = (keyword || '').trim().toLowerCase()
  if (!kw) {
    options.value = allOptions.value.slice()
    return
  }
  const matched = allOptions.value.filter((p) => localMatch(p, kw))
  if (matched.length) {
    options.value = matched
    return
  }
  options.value = []
  clearTimeout(filterTimer)
  filterTimer = setTimeout(() => doSearch(keyword, true), 300)
}

/** 下拉展开时确保已加载全部患者 */
async function onVisibleChange(visible) {
  if (!visible) return
  if (loaded) {
    options.value = allOptions.value.slice()
    return
  }
  await doSearch()
}

async function remoteSearch(keyword) {
  if (loaded) return
  await doSearch(keyword)
}

/** 拉取全部患者（一次拉取后在本地筛选，避免每次输入都请求后端） */
async function doSearch(keyword, keepKeyword) {
  const seq = ++searchSeq
  loading.value = true
  try {
    const res = await listPatient({ pageNum: 1, pageSize: 500, keyword: keyword || undefined })
    if (seq !== searchSeq) return
    const rows = res.data.rows || []
    if (keepKeyword) {
      options.value = rows
    } else {
      allOptions.value = rows
      options.value = rows.slice()
      loaded = true
    }
  } finally {
    loading.value = false
  }
}

async function loadById(id) {
  if (options.value.some((o) => o.patientId === id)) return
  try {
    const res = await getPatient(id)
    const found = res.data
    if (found) {
      allOptions.value = [found, ...allOptions.value.filter((o) => o.patientId !== id)]
      options.value = [found, ...options.value.filter((o) => o.patientId !== id)]
    }
  } catch (e) {
    // 忽略
  }
}

function handleChange(val) {
  emit('update:modelValue', val)
  if (props.multiple) {
    const ids = Array.isArray(val) ? val : []
    emit('select', ids.map((id) => options.value.find((o) => o.patientId === id)).filter(Boolean))
    return
  }
  const found = options.value.find((o) => o.patientId === val)
  emit('select', found || null)
}

if (props.autoLoad || props.modelValue) {
  doSearch()
}
</script>
