# Email Editor Documentation

A block-based email editor library for Vue 2.7. Build beautiful, responsive emails with a visual editor that supports both built-in and custom block types.

## Table of Contents

- [Getting Started](./getting-started.md)
- [API Reference](./api-reference.md)
- [Block Types](./block-types.md)
- [Custom Blocks](./custom-blocks.md)

## Overview

Email Editor is a fully-featured, extensible email composition tool that enables developers to build and edit emails through a visual interface. It provides:

- **Visual Editing**: Drag-and-drop block reordering with a responsive canvas
- **Built-in Blocks**: Text, Button, Image, HTML, and Table blocks ready to use
- **Custom Blocks**: Extend the editor with your own block types
- **Export Options**: Export to JSON for storage or HTML for sending
- **Mobile/Desktop Preview**: Toggle between preview modes to see how emails will appear on different devices
- **Text Formatting**: Bold, color, and alignment support for text content
- **Image Upload**: Customizable image upload handling with status tracking
- **Validation**: Comprehensive document and schema validation

## Quick Start

### Installation

```bash
npm install email-editor
```

### Basic Usage

```vue
<template>
  <EmailEditor
    :json="documentJson"
    :on-image-upload="handleImageUpload"
    @update:json="onJsonUpdate"
    @error="onError"
  />
</template>

<script setup>
import EmailEditor from 'email-editor'
import { ref } from 'vue'

const documentJson = ref('')

const onJsonUpdate = (json) => {
  documentJson.value = json
  // Persist to your backend
}

const onError = (error) => {
  console.error('Editor error:', error)
}

const handleImageUpload = async (file) => {
  // Upload file to your server and return the URL
  const formData = new FormData()
  formData.append('image', file)
  const response = await fetch('/api/upload', { method: 'POST', body: formData })
  const { url } = await response.json()
  return url
}
</script>
```

## Requirements

- Vue 2.7.x or Vue 3.x

## License

MIT
