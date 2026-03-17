<template>
  <div class="pencil-upload">
    <div 
      class="upload-area"
      :class="{ dragover: isDragging }"
      @click="$refs.fileInput.click()"
      @dragover.prevent="isDragging = true"
      @dragleave="isDragging = false"
      @drop.prevent="handleDrop"
    >
      <input 
        ref="fileInput"
        type="file" 
        accept=".pen"
        style="display: none"
        @change="handleFileSelect"
      />
      <div v-if="!uploading">
        <p>📁 点击或拖拽 .pen 文件到这里</p>
      </div>
      <div v-else>
        <p>⏳ 上传中...</p>
      </div>
    </div>

    <div v-if="uploadedDesign" class="preview-section">
      <h3>{{ uploadedDesign.name }}</h3>
      <img 
        :src="`/api/pencil/preview/${uploadedDesign.id}`" 
        alt="Preview"
        class="preview-image"
        @click="viewFullImage"
      />
      <p class="hint">点击图片查看大图</p>
      <div class="actions">
        <button @click="exportCode('react')">导出 React</button>
        <button @click="exportCode('vue')">导出 Vue</button>
      </div>
    </div>

    <div v-if="exportedCode" class="code-section">
      <h3>导出的代码</h3>
      <pre><code>{{ exportedCode }}</code></pre>
    </div>

    <!-- 大图预览 -->
    <div v-if="showFullImage" class="modal" @click="showFullImage = false">
      <div class="modal-content">
        <span class="close">&times;</span>
        <img :src="`/api/pencil/preview/${uploadedDesign.id}`" alt="Full preview" />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PencilUpload',
  emits: ['uploaded'],
  data() {
    return {
      isDragging: false,
      uploading: false,
      uploadedDesign: null,
      exportedCode: null,
      showFullImage: false
    };
  },
  methods: {
    handleDrop(e) {
      this.isDragging = false;
      const file = e.dataTransfer.files[0];
      if (file) this.uploadFile(file);
    },
    handleFileSelect(e) {
      const file = e.target.files[0];
      if (file) this.uploadFile(file);
    },
    async uploadFile(file) {
      if (!file.name.endsWith('.pen')) {
        alert('请选择 .pen 文件');
        return;
      }

      this.uploading = true;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name);

      try {
        const res = await fetch('/api/pencil/upload', {
          method: 'POST',
          body: formData
        });
        
        if (!res.ok) throw new Error('上传失败');
        
        this.uploadedDesign = await res.json();
        this.$emit('uploaded', this.uploadedDesign);
      } catch (err) {
        alert('上传失败: ' + err.message);
      } finally {
        this.uploading = false;
      }
    },
    async exportCode(format) {
      try {
        const res = await fetch(`/api/pencil/export/${this.uploadedDesign.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ format })
        });
        
        if (!res.ok) throw new Error('导出失败');
        
        const data = await res.json();
        this.exportedCode = data.code;
      } catch (err) {
        alert('导出失败: ' + err.message);
      }
    },
    viewFullImage() {
      this.showFullImage = true;
    }
  }
};
</script>

<style scoped>
.upload-area {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}
.upload-area:hover, .upload-area.dragover {
  border-color: #3b82f6;
  background: #f0f9ff;
}
.preview-section {
  margin-top: 20px;
}
.preview-image {
  max-width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.2s;
}
.preview-image:hover {
  transform: scale(1.02);
}
.hint {
  color: #999;
  font-size: 0.9rem;
  margin: 5px 0;
}
.actions {
  margin-top: 10px;
}
.actions button {
  margin-right: 10px;
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.code-section {
  margin-top: 20px;
}
.code-section pre {
  background: #f9fafb;
  padding: 15px;
  border-radius: 4px;
  overflow-x: auto;
}

/* 模态框 */
.modal {
  position: fixed;
  z-index: 1000;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0,0,0,0.9);
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-content {
  position: relative;
  max-width: 95%;
  max-height: 95%;
  overflow: auto;
}
.modal-content img {
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 90vh;
  display: block;
}
.close {
  position: absolute;
  top: 15px;
  right: 35px;
  color: #f1f1f1;
  font-size: 40px;
  font-weight: bold;
  cursor: pointer;
}
</style>
