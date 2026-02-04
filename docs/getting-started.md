# Getting Started

This guide will help you integrate the Email Editor into your Vue 2.7 or Vue 3 application.

## Installation

Install the package via npm:

```bash
npm install email-editor
```

Or with yarn:

```bash
yarn add email-editor
```

## Basic Setup

### 1. Import the Component

```vue
<template>
  <div class="editor-container">
    <EmailEditor
      :json="documentJson"
      @update:json="handleUpdate"
    />
  </div>
</template>

<script setup>
import EmailEditor from 'email-editor'
import { ref } from 'vue'

const documentJson = ref('')

const handleUpdate = (json) => {
  documentJson.value = json
}
</script>

<style>
.editor-container {
  height: 100vh;
  width: 100%;
}
</style>
```

### 2. Handle Image Uploads

To enable image block functionality, provide an upload handler:

```vue
<template>
  <EmailEditor
    :json="documentJson"
    :on-image-upload="uploadImage"
    @update:json="handleUpdate"
  />
</template>

<script setup>
import EmailEditor from 'email-editor'
import { ref } from 'vue'

const documentJson = ref('')

const handleUpdate = (json) => {
  documentJson.value = json
}

const uploadImage = async (file) => {
  // Example: Upload to your server
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/images/upload', {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    throw new Error('Upload failed')
  }

  const { url } = await response.json()
  return url
}
</script>
```

### 3. Export HTML for Sending

Use the component's exposed methods to export the email as HTML:

```vue
<template>
  <div>
    <EmailEditor
      ref="editor"
      :json="documentJson"
      @update:json="handleUpdate"
    />
    <button @click="sendEmail">Send Email</button>
  </div>
</template>

<script setup>
import EmailEditor from 'email-editor'
import { ref } from 'vue'

const editor = ref(null)
const documentJson = ref('')

const handleUpdate = (json) => {
  documentJson.value = json
}

const sendEmail = async () => {
  const html = editor.value.exportHtml()

  await fetch('/api/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html })
  })
}
</script>
```

## Loading Existing Documents

### From JSON String

```vue
<script setup>
import EmailEditor from 'email-editor'
import { ref, onMounted } from 'vue'

const editor = ref(null)

onMounted(async () => {
  const response = await fetch('/api/email/draft/123')
  const { json } = await response.json()
  editor.value.loadJson(json)
})
</script>
```

### From Document Object

```vue
<script setup>
import EmailEditor from 'email-editor'
import { ref } from 'vue'

const editor = ref(null)

const loadDraft = (document) => {
  editor.value.loadDocument(document)
}
</script>
```

## Preview Modes

The editor supports mobile and desktop preview modes. Control this via props:

```vue
<template>
  <div>
    <div class="preview-controls">
      <button @click="previewMode = 'mobile'">Mobile</button>
      <button @click="previewMode = 'desktop'">Desktop</button>
    </div>
    <EmailEditor
      :json="documentJson"
      :preview-mode="previewMode"
      @update:json="handleUpdate"
    />
  </div>
</template>

<script setup>
import EmailEditor from 'email-editor'
import { ref } from 'vue'

const documentJson = ref('')
const previewMode = ref('desktop')

const handleUpdate = (json) => {
  documentJson.value = json
}
</script>
```

## Error Handling

Listen for errors to handle validation and loading issues:

```vue
<template>
  <div>
    <div v-if="error" class="error-banner">
      {{ error.message }}
    </div>
    <EmailEditor
      :json="documentJson"
      @update:json="handleUpdate"
      @error="handleError"
    />
  </div>
</template>

<script setup>
import EmailEditor from 'email-editor'
import { ref } from 'vue'

const documentJson = ref('')
const error = ref(null)

const handleUpdate = (json) => {
  documentJson.value = json
  error.value = null
}

const handleError = (err) => {
  error.value = err
  console.error('Editor error:', err)
}
</script>
```

## Next Steps

- Learn about [Block Types](./block-types.md) available in the editor
- Create [Custom Blocks](./custom-blocks.md) for your specific needs
- Explore the full [API Reference](./api-reference.md)
