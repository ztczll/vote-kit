# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 设置 npm 镜像源为阿里云
RUN npm config set registry https://registry.npmmirror.com

# 复制前端代码
COPY frontend/package*.json ./frontend/
COPY frontend/ ./frontend/

# 复制资源目录
COPY resource /app/resource

# 安装依赖
RUN cd frontend && npm install --registry=https://registry.npmmirror.com

# 构建参数
ARG VITE_API_BASE_URL=http://localhost:3000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# 复制资源图片到 public 目录
RUN if [ -d "/app/resource/images" ]; then \
      cd frontend && \
      mkdir -p public/images && \
      cp -r /app/resource/images/* public/images/ && \
      echo "Copied resource/images to frontend/public/images"; \
    else \
      echo "Warning: resource/images directory not found"; \
    fi

# 构建前端
RUN cd frontend && npm run build

# 生产镜像
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# 复制 nginx 配置
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
