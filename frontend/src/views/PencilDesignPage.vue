<template>
  <div class="pencil-design-page">
    <div class="header">
      <h1>📐 Pencil 设计管理</h1>
      <p>上传和管理你的 .pen 设计文件</p>
    </div>

    <div class="content">
      <PencilUpload @uploaded="handleUploaded" />

      <div v-if="designs.length > 0" class="designs-list">
        <h2>我的设计</h2>
        <div class="designs-grid">
          <div v-for="design in designs" :key="design.id" class="design-card" @click="viewFullImage(design)">
            <img :src="design.previewImagePath" :alt="design.name" />
            <div class="design-info">
              <h3>{{ design.name }}</h3>
              <p class="hint">点击查看大图</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 大图预览模态框 -->
      <div v-if="fullImageUrl" class="modal" @click="closeFullImage">
        <div class="modal-content">
          <span class="close">&times;</span>
          <img :src="fullImageUrl" alt="Full preview" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import PencilUpload from '@/components/PencilUpload.vue';

export default {
  name: 'PencilDesignPage',
  components: {
    PencilUpload
  },
  data() {
    return {
      designs: [],
      fullImageUrl: null
    };
  },
  mounted() {
    this.loadDesigns();
  },
  methods: {
    async loadDesigns() {
      try {
        const res = await fetch('/api/pencil/designs');
        if (res.ok) {
          this.designs = await res.json();
        }
      } catch (err) {
        console.error('加载设计失败:', err);
      }
    },
    handleUploaded(design) {
      this.designs.unshift(design);
    },
    viewFullImage(design) {
      this.fullImageUrl = design.previewImagePath;
    },
    closeFullImage() {
      this.fullImageUrl = null;
    }
  }
};
</script>

<style scoped>
.pencil-design-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  text-align: center;
  margin-bottom: 40px;
}

.header h1 {
  font-size: 2.5rem;
  color: #333;
  margin-bottom: 10px;
}

.header p {
  color: #666;
  font-size: 1.1rem;
}

.designs-list {
  margin-top: 40px;
}

.designs-list h2 {
  font-size: 1.8rem;
  margin-bottom: 20px;
  color: #333;
}

.designs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.design-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: transform 0.2s;
  cursor: pointer;
}

.design-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.design-card img {
  width: 100%;
  height: 200px;
  object-fit: contain;
  background: #f5f5f5;
  padding: 10px;
}

.design-info {
  padding: 15px;
}

.design-info h3 {
  margin: 0 0 5px 0;
  font-size: 1rem;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.design-info .hint {
  margin: 0;
  font-size: 0.85rem;
  color: #999;
}

/* 模态框样式 */
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
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
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
  margin: 0 auto;
}

.close {
  position: absolute;
  top: 15px;
  right: 35px;
  color: #f1f1f1;
  font-size: 40px;
  font-weight: bold;
  cursor: pointer;
  z-index: 1001;
}

.close:hover {
  color: #bbb;
}
</style>
