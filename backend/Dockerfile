# 多阶段构建
FROM node:18-alpine AS builder

WORKDIR /app

# 设置 apk 源为阿里云，安装构建依赖
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories \
    && apk update \
    && apk add --no-cache python3 make g++

# 设置 npm 镜像源为阿里云
RUN npm config set registry https://registry.npmmirror.com

# 复制 package 文件
COPY package*.json ./

# 构建阶段不需要浏览器，跳过下载
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm install --registry=https://registry.npmmirror.com

# 复制源代码
COPY . .

# 构建
RUN npm run build

# ------------------- 生产镜像 -------------------
FROM node:18-alpine

WORKDIR /app

# 设置 apk 源为阿里云，安装运行时依赖：
# - chromium: 提供 Chromium 二进制及其所有 musl 兼容的依赖
# - 其他工具（curl, docker-cli 等）按需保留
# - 字体包：保证中文等字符正常渲染
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories \
    && apk update \
    && apk add --no-cache \
        curl \
        docker-cli \
        python3 \
        make \
        g++ \
        udev \
        ttf-freefont \
        font-noto \
        font-noto-cjk \
        chromium

# 设置 npm 镜像源
RUN npm config set registry https://registry.npmmirror.com

# 复制 package 文件
COPY package*.json ./

# 复制预编译的 bcrypt 二进制文件（你已下载到 resource/ 目录）
COPY resource/bcrypt_lib-v5.1.1-napi-v3-linux-x64-musl.tar.gz /tmp/bcrypt.tar.gz

# 创建 node-pre-gyp 缓存目录，将文件放入其中，避免从 GitHub 下载
RUN mkdir -p /root/.node-pre-gyp/bcrypt/5.1.1/Release/linux-x64-musl/ \
    && cp /tmp/bcrypt.tar.gz /root/.node-pre-gyp/bcrypt/5.1.1/Release/linux-x64-musl/ \
    && rm /tmp/bcrypt.tar.gz

# 关键配置：告诉 Puppeteer 使用系统 Chromium，跳过下载
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# 安装生产依赖（此时不会下载 Chrome，bcrypt 会从缓存安装）
RUN npm install --production --registry=https://registry.npmmirror.com

# 复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/database ./database

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "dist/index.js"]
