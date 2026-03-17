pipeline {
  agent any

  options {
    timestamps()
  }

  parameters {
    string(name: 'APP_ID', defaultValue: '', description: '生成应用的数据库 ID，用于容器名、镜像 tag 等')
    string(name: 'APP_NAME', defaultValue: '', description: 'Forge 生成目录名前缀，如 app-1772612121388，用于匹配 /tmp/forge-repos/<APP_NAME>-* 或 /tmp/generated-apps/<APP_NAME>-*')
    string(name: 'DOMAIN', defaultValue: '', description: '应用访问域名（留空则使用 <subdomain>.apps.example.com）')
    choice(name: 'DEPLOY_MODE', choices: ['local', 'registry'], description: '部署模式：local=仅本机 Docker，registry=构建后推送到镜像仓库')
    string(name: 'REGISTRY_IMAGE', defaultValue: '', description: 'Registry 模式下的完整镜像名，local 模式可留空')
    string(name: 'CALLBACK_BASE_URL', defaultValue: '', description: 'Vote-Kit 后端地址，用于构建结束时回调更新状态（如 http://votekit-backend:3000）')
  }

  environment {
    LOCAL_IMAGE = "local/generated-app-${APP_ID}"
    DOCKER_NETWORK = "vote-kit_votekit-network"
    CONTAINER_NAME = "gen-${APP_ID}"
    APP_PORT = "3000"
  }

  stages {
    stage('Preparation') {
      steps {
        script {
          if (!params.APP_ID?.trim()) {
            error "APP_ID 不能为空"
          }

          // 设置 DOMAIN
          if (!params.DOMAIN?.trim()) {
            env.DOMAIN = "${params.APP_ID}.apps.example.com"
          } else {
            env.DOMAIN = params.DOMAIN.trim()
          }

          echo "Using APP_ID=${params.APP_ID}, APP_NAME=${params.APP_NAME}, DOMAIN=${env.DOMAIN}, DEPLOY_MODE=${params.DEPLOY_MODE}"

          // 解析应用目录：优先精确 APP_ID，再按 APP_NAME 前缀匹配 Forge 带时间戳的目录（取最新）
          def appDir = sh(script: """
            set -e
            PREFIX="${params.APP_NAME ?: params.APP_ID}"
            if [ -d "/tmp/forge-repos/${params.APP_ID}" ]; then
              echo "/tmp/forge-repos/${params.APP_ID}"
            elif [ -n "\$PREFIX" ] && ls -d /tmp/forge-repos/\${PREFIX}* > /dev/null 2>&1; then
              ls -td /tmp/forge-repos/\${PREFIX}* 2>/dev/null | head -1
            elif [ -d "/tmp/generated-apps/${params.APP_ID}" ]; then
              echo "/tmp/generated-apps/${params.APP_ID}"
            elif [ -n "\$PREFIX" ] && ls -d /tmp/generated-apps/\${PREFIX}* > /dev/null 2>&1; then
              ls -td /tmp/generated-apps/\${PREFIX}* 2>/dev/null | head -1
            else
              echo "=== 当前目录内容（便于排查）===" >&2
              echo "/tmp/forge-repos:" >&2
              ls -la /tmp/forge-repos 2>/dev/null || echo "(不存在或不可读)" >&2
              echo "/tmp/generated-apps:" >&2
              ls -la /tmp/generated-apps 2>/dev/null || echo "(不存在或不可读)" >&2
              echo "ERROR: 未找到应用目录 /tmp/forge-repos 或 /tmp/generated-apps 下匹配 APP_ID=${params.APP_ID} 或 APP_NAME=${params.APP_NAME} 的目录" >&2
              exit 1
            fi
          """, returnStdout: true).trim()

          env.APP_DIR = appDir
          echo "Resolved APP_DIR=${env.APP_DIR}"

          // 校验 Dockerfile
          sh """
            if [ ! -f "${env.APP_DIR}/Dockerfile" ]; then
              echo "ERROR: 应用目录 ${env.APP_DIR} 下未找到 Dockerfile"
              exit 1
            fi
          """
        }
      }
    }

    stage('Build Image') {
      steps {
        dir("${env.APP_DIR}") {
          sh """
            set -e
            echo "Building local image ${LOCAL_IMAGE}:${BUILD_NUMBER} from \$(pwd)"
            docker build -t ${LOCAL_IMAGE}:${BUILD_NUMBER} .
          """
        }
      }
    }

    stage('Push Image (optional)') {
      when {
        expression { params.DEPLOY_MODE == 'registry' && params.REGISTRY_IMAGE?.trim() }
      }
      steps {
        script {
          echo "DEPLOY_MODE=registry，准备推送镜像到 ${params.REGISTRY_IMAGE}"
        }
        sh """
          set -e
          echo "Tagging image ${LOCAL_IMAGE}:${BUILD_NUMBER} -> ${REGISTRY_IMAGE}:${BUILD_NUMBER}"
          docker tag ${LOCAL_IMAGE}:${BUILD_NUMBER} ${REGISTRY_IMAGE}:${BUILD_NUMBER}
          echo "Pushing image ${REGISTRY_IMAGE}:${BUILD_NUMBER}"
          docker push ${REGISTRY_IMAGE}:${BUILD_NUMBER}
        """
      }
    }

    stage('Deploy Container') {
      steps {
        script {
          // 根据部署模式选择镜像名
          if (params.DEPLOY_MODE == 'registry' && params.REGISTRY_IMAGE?.trim()) {
            env.RUN_IMAGE = "${params.REGISTRY_IMAGE}:${BUILD_NUMBER}"
          } else {
            env.RUN_IMAGE = "${env.LOCAL_IMAGE}:${BUILD_NUMBER}"
          }

          echo "Deploying container ${env.CONTAINER_NAME} with image ${env.RUN_IMAGE}"
        }

        // Registry 模式先拉取镜像
        sh """
          set -e
          if [ "${DEPLOY_MODE}" = "registry" ] && [ -n "${REGISTRY_IMAGE}" ]; then
            echo "Pulling image ${RUN_IMAGE}"
            docker pull ${RUN_IMAGE}
          fi
        """

        // 停止并删除旧容器
        sh """
          set +e
          echo "Stopping old container ${CONTAINER_NAME} if exists..."
          docker rm -f ${CONTAINER_NAME} >/dev/null 2>&1 || true
          set -e
        """

        // 运行新容器
        sh """
          set -e
          echo "Running new container ${CONTAINER_NAME} on network ${DOCKER_NETWORK}"
          docker run -d \\
            --name ${CONTAINER_NAME} \\
            --network ${DOCKER_NETWORK} \\
            -e PORT=${APP_PORT} \\
            -l "caddy=${DOMAIN}" \\
            -l "caddy.reverse_proxy={{upstreams ${APP_PORT}}}" \\
            ${RUN_IMAGE}
        """
      }
    }
  
  
  stage('Add Route to Caddy') {
    steps {
        script {
            def domain = env.DOMAIN
            def containerName = env.CONTAINER_NAME
            def port = env.APP_PORT
            def caddyApiUrl = "http://caddy:2019/config/apps/http/servers/srv0/routes"

            // 构造要添加的路由配置
            def routeConfig = """
            {
                "@id": "${containerName}",
                "match": [{"host": ["${domain}"]}],
                "handle": [{
                    "handler": "reverse_proxy",
                    "upstreams": [{"dial": "${containerName}:${port}"}]
                }],
                "terminal": true
            }
            """

            sh """
                curl -X POST "${caddyApiUrl}" \\
                  -H "Content-Type: application/json" \\
                  -d '${routeConfig}'
            """
            echo "Route added for ${domain} -> ${containerName}:${port}"
            }
        }
    }
}

  post {
    success {
      echo "部署成功，可访问：http://${DOMAIN}"
      script {
        notifyCallback('success')
      }
    }
    failure {
      echo "部署失败，请检查 Jenkins 构建日志。"
      script {
        notifyCallback('failure')
      }
    }
  }
}

def notifyCallback(String buildResult) {
  if (!params.CALLBACK_BASE_URL?.trim()) {
    echo "CALLBACK_BASE_URL 未设置，跳过通知 Vote-Kit 后端（界面将依赖超时机制更新状态）。请在 Jenkins 任务参数或后端环境变量中配置 JENKINS_CALLBACK_BASE_URL。"
    return
  }
  def url = "${params.CALLBACK_BASE_URL.trim().replaceAll(/\/$/, '')}/api/app-generation/jenkins-callback"
  echo "通知 Vote-Kit 后端构建结果: ${buildResult}, URL=${url}"
  def httpCode = sh(script: "curl -sS -o /tmp/jenkins_callback_out -w '%{http_code}' -X POST '${url}' -H 'Content-Type: application/json' -d '{\"app_id\":\"${params.APP_ID}\",\"build_result\":\"${buildResult}\"}'", returnStdout: true).trim()
  def body = sh(script: "cat /tmp/jenkins_callback_out 2>/dev/null || echo ''", returnStdout: true).trim()
  echo "回调响应 HTTP=${httpCode}, body=${body}"
  if (httpCode != '200') {
    echo "警告: 回调未返回 200，请检查 Jenkins 是否能访问 Vote-Kit 后端（如网络、CALLBACK_BASE_URL 是否指向 votekit-backend:3000）。"
  }
}