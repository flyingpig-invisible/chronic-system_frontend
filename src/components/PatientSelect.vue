<template>
  <el-select
    v-model="innerValue"
    filterable
    remote
    clearable
    reserve-keyword
    :remote-method="remoteSearch"
    :loading="loading"
    :placeholder="placeholder"
    :style="{ width: width }"
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
        {{ p.phone || '-' }} · {{ p.patientNo || '' }}
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
  autoLoad: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue', 'select'])

const innerValue = ref(props.modelValue)
const options = ref([])
const loading = ref(false)

watch(
  () => props.modelValue,
  (v) => {
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

async function remoteSearch(keyword) {
  if (!keyword) {
    if (props.autoLoad) {
      await doSearch('')
    } else {
      options.value = []
    }
    return
  }
  await doSearch(keyword)
}

async function doSearch(keyword) {
  loading.value = true
  try {
    const res = await listPatient({
      pageNum: 1,
      pageSize: 20,
      keyword: keyword || undefined
    })
    options.value = res.data.rows || []
  } finally {
    loading.value = false
  }
}

async function loadById(id) {
  try {
    const res = await getPatient(id)
    const found = res.data
    if (found) {
      options.value = [found, ...options.value.filter((o) => o.patientId !== id)]
    }
  } catch (e) {
    // 忽略
  }
}

function handleChange(val) {
  emit('update:modelValue', val)
  const found = options.value.find((o) => o.patientId === val)
  emit('select', found || null)
}

if (props.autoLoad || props.modelValue) {
  doSearch('')
}
</script>
