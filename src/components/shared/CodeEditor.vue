<script setup lang="ts">
import { ref, onMounted, watch, shallowRef } from 'vue'
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { EditorState, StateEffect } from '@codemirror/state'
import { json } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'
import { defaultKeymap } from '@codemirror/commands'
import { useThemeStore } from '@/stores/theme'

const props = withDefaults(defineProps<{
  modelValue: string
  language?: 'json' | 'xml' | 'text'
  readonly?: boolean
  minHeight?: string
}>(), { language: 'text', readonly: false, minHeight: '200px' })

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

const editorRef = ref<HTMLDivElement>()
const view = shallowRef<EditorView>()
const themeStore = useThemeStore()

function createExtensions(): any[] {
  const c = themeStore.colorPreset
  const dark = themeStore.isDark
  const tokens = dark ? c.dark : c.light

  const exts: any[] = [
    lineNumbers(),
    highlightActiveLine(),
    keymap.of(defaultKeymap),
    EditorView.updateListener.of(update => {
      if (update.docChanged) emit('update:modelValue', update.state.doc.toString())
    }),
    EditorState.readOnly.of(props.readonly)
  ]

  if (dark) {
    exts.push(oneDark)
    exts.push(EditorView.theme({
      '&': { backgroundColor: 'transparent' },
      '.cm-gutters': {
        backgroundColor: 'transparent',
        borderRight: `1px solid ${tokens.borderSubtle}`,
        color: tokens.textDisabled
      },
      '.cm-activeLine': { backgroundColor: tokens.hoverOverlay },
      '.cm-cursor': { borderLeftColor: tokens.primary },
      '.cm-selectionBackground': { backgroundColor: tokens.activeOverlay },
      '.cm-matchingBracket': {
        backgroundColor: tokens.hoverOverlay,
        outline: `1px solid ${tokens.borderDefault}`
      },
      '.ͼb': { color: tokens.jsonKey },
      '.ͼd': { color: tokens.jsonString },
      '.ͼc': { color: tokens.jsonNumber },
      '.ͼe': { color: tokens.jsonBoolean },
      '.ͼf': { color: tokens.jsonNull },
      '.ͼ8': { color: tokens.jsonBracket }
    }))
  } else {
    exts.push(EditorView.theme({
      '&': { backgroundColor: 'transparent', color: tokens.textPrimary },
      '.cm-gutters': {
        backgroundColor: 'transparent',
        borderRight: `1px solid ${tokens.borderSubtle}`,
        color: tokens.textDisabled
      },
      '.cm-activeLine': { backgroundColor: tokens.hoverOverlay },
      '.cm-activeLineGutter': { backgroundColor: 'transparent' },
      '.cm-cursor': { borderLeftColor: tokens.textPrimary },
      '.cm-selectionBackground': { backgroundColor: tokens.activeOverlay },
      '.cm-matchingBracket': {
        backgroundColor: tokens.hoverOverlay,
        outline: `1px solid ${tokens.borderDefault}`
      },
      '.ͼb': { color: tokens.jsonKey },
      '.ͼd': { color: tokens.jsonString },
      '.ͼc': { color: tokens.jsonNumber },
      '.ͼe': { color: tokens.jsonBoolean },
      '.ͼf': { color: tokens.jsonNull },
      '.ͼ8': { color: tokens.jsonBracket }
    }, { dark: false }))
  }

  if (props.language === 'json') exts.push(json())

  return exts
}

function recreateEditor() {
  if (!editorRef.value) return
  view.value?.destroy()
  view.value = new EditorView({
    doc: props.modelValue,
    extensions: createExtensions(),
    parent: editorRef.value
  })
}

onMounted(() => recreateEditor())

// Recreate editor when theme changes
watch(
  () => [themeStore.isDark, themeStore.colorPresetName, themeStore.stylePresetName],
  () => recreateEditor()
)

// Update content when modelValue changes externally
watch(() => props.modelValue, (val) => {
  if (view.value && val !== view.value.state.doc.toString()) {
    view.value.dispatch({ changes: { from: 0, to: view.value.state.doc.length, insert: val } })
  }
})

watch(() => props.readonly, (val) => {
  if (view.value) {
    view.value.dispatch({ effects: StateEffect.appendConfig.of(EditorState.readOnly.of(val)) })
  }
})
</script>

<template>
  <div ref="editorRef" :style="{ minHeight: minHeight, overflow: 'hidden' }" />
</template>
