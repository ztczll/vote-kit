<template>
  <div class="figma-prototype-generator">
    <div class="header">
      <h1>🎨 AI 原型图生成器</h1>
      <p>基于需求自动生成 Figma 原型图</p>
    </div>

    <div class="content">
      <!-- 需求输入 -->
      <div class="requirement-section">
        <h2>1. 输入需求描述</h2>
        <textarea
          v-model="requirement"
          placeholder="描述你的应用需求，例如：&#10;&#10;一个登录页面，包含：&#10;- 用户名输入框&#10;- 密码输入框&#10;- 记住我复选框&#10;- 登录按钮&#10;- 忘记密码链接"
          rows="10"
        ></textarea>
        <button @click="generatePrototype" :disabled="generating || !requirement">
          {{ generating ? '生成中...' : '生成原型图' }}
        </button>
      </div>

      <!-- 生成结果 -->
      <div v-if="designResult" class="result-section">
        <h2>2. 设计建议</h2>
        <div class="design-suggestion">
          <p>{{ designResult.design.suggestion }}</p>
        </div>

        <!-- Figma 文件链接 -->
        <div class="figma-link-section">
          <h3>关联 Figma 文件</h3>
          <input
            v-model="figmaFileId"
            placeholder="输入 Figma 文件 ID"
            @blur="loadFigmaFile"
          />
          <button @click="loadFigmaFile" :disabled="!figmaFileId">
            加载文件
          </button>
        </div>

        <!-- Figma 预览 -->
        <div v-if="figmaFile" class="figma-preview">
          <h3>Figma 文件: {{ figmaFile.name }}</h3>
          <div class="figma-embed">
            <iframe
              :src="`https://www.figma.com/embed?embed_host=share&url=https://www.figma.com/file/${figmaFileId}`"
              allowfullscreen
            ></iframe>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FigmaPrototypeGenerator',
  data() {
    return {
      requirement: '',
      generating: false,
      designResult: null,
      figmaFileId: '',
      figmaFile: null
    };
  },
  methods: {
    async generatePrototype() {
      if (!this.requirement) return;

      this.generating = true;
      try {
        const res = await fetch('/api/figma/generate-prototype', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requirement: this.requirement,
            fileId: this.figmaFileId || undefined
          })
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || '生成失败');
        }

        this.designResult = await res.json();
      } catch (err) {
        alert('生成失败: ' + err.message);
      } finally {
        this.generating = false;
      }
    },

    async loadFigmaFile() {
      if (!this.figmaFileId) return;

      try {
        const res = await fetch(`/api/figma/file/${this.figmaFileId}`);
        if (!res.ok) {
          throw new Error('加载文件失败');
        }
        this.figmaFile = await res.json();
      } catch (err) {
        alert('加载 Figma 文件失败: ' + err.message);
      }
    }
  }
};
</script>

<style scoped>
.figma-prototype-generator {
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

.requirement-section {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 30px;
}

.requirement-section h2 {
  margin-top: 0;
  color: #333;
}

.requirement-section textarea {
  width: 100%;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  font-family: inherit;
  resize: vertical;
}

.requirement-section button {
  margin-top: 15px;
  padding: 12px 30px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
}

.requirement-section button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.result-section {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.design-suggestion {
  background: #f0f9ff;
  padding: 20px;
  border-radius: 4px;
  border-left: 4px solid #3b82f6;
  margin-bottom: 20px;
}

.figma-link-section {
  margin: 20px 0;
}

.figma-link-section input {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 300px;
  margin-right: 10px;
}

.figma-link-section button {
  padding: 10px 20px;
  background: #18a0fb;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.figma-preview {
  margin-top: 30px;
}

.figma-embed {
  width: 100%;
  height: 600px;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}

.figma-embed iframe {
  width: 100%;
  height: 100%;
  border: none;
}
</style>
