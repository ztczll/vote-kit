<template>
  <div class="admin-page">
    <h2>📊 管理后台</h2>

    <el-row :gutter="20" style="margin-bottom: 30px">
      <el-col :span="6">
        <el-card>
          <div class="stat-card">
            <div class="stat-value">{{ dashboard.totalUsers }}</div>
            <div class="stat-label">总用户数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div class="stat-card">
            <div class="stat-value">{{ dashboard.totalRequirements }}</div>
            <div class="stat-label">总需求数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div class="stat-card">
            <div class="stat-value">{{ dashboard.totalVotes }}</div>
            <div class="stat-label">总投票数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div class="stat-card">
            <div class="stat-value">{{ dashboard.dailyActiveUsers }}</div>
            <div class="stat-label">日活跃用户</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-bottom: 30px">
      <el-col :span="12">
        <el-card>
          <template #header><span>任务队列</span><el-button link type="primary" size="small" @click="loadQueueStatus" style="float: right">刷新</el-button></template>
          <div v-if="queueStatus">
            <div class="stat-label">Redis 队列长度</div>
            <div style="margin-bottom: 8px">
              dedicated: <strong>{{ queueStatus.queue?.dedicated ?? 0 }}</strong> ·
              priority: <strong>{{ queueStatus.queue?.priority ?? 0 }}</strong> ·
              normal: <strong>{{ queueStatus.queue?.normal ?? 0 }}</strong>
            </div>
            <div class="stat-label">gen_tasks 按状态</div>
            <div>
              <span v-for="(cnt, status) in queueStatus.genTasks" :key="status" style="margin-right: 12px">
                {{ status }}: {{ cnt }}
              </span>
              <span v-if="!queueStatus.genTasks || !Object.keys(queueStatus.genTasks).length">-</span>
            </div>
          </div>
          <div v-else class="text-muted">加载中…</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <template #header><span>健康度</span><el-button link type="primary" size="small" @click="loadHealth" style="float: right">刷新</el-button></template>
          <div v-if="healthStatus">
            <div>DB: <el-tag :type="healthStatus.db ? 'success' : 'danger'" size="small">{{ healthStatus.db ? '正常' : '异常' }}</el-tag></div>
            <div style="margin-top: 6px">Redis: <el-tag :type="healthStatus.redis ? 'success' : 'danger'" size="small">{{ healthStatus.redis ? '正常' : '异常' }}</el-tag></div>
          </div>
          <div v-else class="text-muted">加载中…</div>
        </el-card>
      </el-col>
      <el-col v-if="dashboard.usersByPlan" :span="6">
        <el-card>
          <div class="stat-card">
            <div class="stat-label">套餐分布</div>
            <div class="stat-value" style="font-size: 14px">
              <span v-for="(cnt, plan) in dashboard.usersByPlan" :key="plan" style="margin-right: 12px">
                {{ plan }}: {{ cnt }}
              </span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    <el-row v-if="dashboard.subscriptionRevenue != null || dashboard.genTasksByStatus" :gutter="20" style="margin-bottom: 30px">
      <el-col v-if="dashboard.subscriptionRevenue != null" :span="6">
        <el-card>
          <div class="stat-card">
            <div class="stat-value">¥{{ ((dashboard.subscriptionRevenue || 0) / 100).toFixed(2) }}</div>
            <div class="stat-label">订阅收入 (分→元)</div>
          </div>
        </el-card>
      </el-col>
      <el-col v-if="dashboard.genTasksByStatus" :span="6">
        <el-card>
          <div class="stat-card">
            <div class="stat-label">生成任务 (dashboard)</div>
            <div class="stat-value" style="font-size: 14px">
              pending: {{ dashboard.genTasksByStatus.pending || 0 }} ·
              completed: {{ dashboard.genTasksByStatus.completed || 0 }} ·
              failed: {{ dashboard.genTasksByStatus.failed || 0 }}
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="待审核需求" name="pending">
        <el-table :data="pendingRequirements" style="width: 100%">
          <el-table-column prop="title" label="标题" />
          <el-table-column prop="category" label="分类" width="100" />
          <el-table-column prop="vote_count" label="票数" width="80" />
          <el-table-column prop="created_at" label="提交时间" width="180">
            <template #default="{ row }">
              {{ new Date(row.created_at).toLocaleString() }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="260">
            <template #default="{ row }">
              <el-button type="success" size="small" @click="handleApprove(row.id)">通过</el-button>
              <el-button type="danger" size="small" @click="handleReject(row.id)">拒绝</el-button>
              <el-button type="danger" size="small" plain @click="handleDeleteRequirement(row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="AI未通过" name="aiRejected">
        <p class="tab-hint">以下为 AI 内容审核未通过的需求，不会在投票广场与动态中展示。可人工通过或删除。</p>
        <el-table :data="aiRejectedRequirements" style="width: 100%">
          <el-table-column prop="title" label="标题" min-width="160" />
          <el-table-column prop="category" label="分类" width="100" />
          <el-table-column prop="moderation_reject_reason" label="拒绝原因" min-width="180" show-overflow-tooltip />
          <el-table-column prop="created_at" label="提交时间" width="180">
            <template #default="{ row }">
              {{ new Date(row.created_at).toLocaleString() }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="260">
            <template #default="{ row }">
              <el-button type="success" size="small" @click="handleApprove(row.id)">通过</el-button>
              <el-button type="danger" size="small" plain @click="handleDeleteRequirement(row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="需求管理" name="active">
        <el-table :data="activeRequirements" style="width: 100%">
          <el-table-column prop="title" label="标题" />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="vote_count" label="票数" width="80" />
          <el-table-column prop="assigned_username" label="负责人" width="120">
            <template #default="{ row }">
              <el-tag v-if="row.assigned_username" type="info" size="small">
                {{ row.assigned_username }}
              </el-tag>
              <span v-else style="color: #999">未分配</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="260">
            <template #default="{ row }">
              <el-button size="small" @click="showManageDialog(row)">管理</el-button>
              <el-button type="danger" size="small" plain @click="handleDeleteRequirement(row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="用户与额度" name="usersQuota">
        <div class="tab-actions">
          <el-select v-model="supportUsersPlanFilter" placeholder="按套餐筛选" clearable style="width: 140px; margin-right: 12px" @change="loadSupportUsers">
            <el-option label="free" value="free" />
            <el-option label="basic" value="basic" />
            <el-option label="pro" value="pro" />
            <el-option label="enterprise" value="enterprise" />
          </el-select>
          <el-button @click="loadSupportUsers" :loading="supportUsersLoading">刷新</el-button>
        </div>
        <el-table :data="supportUsers" v-loading="supportUsersLoading" style="width: 100%">
          <el-table-column prop="username" label="用户名" width="120" />
          <el-table-column prop="email" label="邮箱" min-width="160" show-overflow-tooltip />
          <el-table-column prop="plan" label="套餐" width="100" />
          <el-table-column prop="credits_balance" label="当前 Credits" width="130" align="right" />
          <el-table-column prop="plan_expires_at" label="套餐到期" width="120">
            <template #default="{ row }">
              {{ row.plan_expires_at ? new Date(row.plan_expires_at).toLocaleDateString() : '-' }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button size="small" @click="showQuotaDialog(row)">调整额度</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-if="supportUsersTotal > 0"
          style="margin-top: 16px"
          :current-page="supportUsersPage"
          :page-size="supportUsersPageSize"
          :total="supportUsersTotal"
          layout="total, prev, pager, next"
          @current-change="(p: number) => { supportUsersPage = p; loadSupportUsers(); }"
        />
        <el-dialog v-model="quotaDialogVisible" title="发放加油包 / 调整 Credits" width="420px">
          <div v-if="quotaDialogUser">
            <p><strong>{{ quotaDialogUser.username }}</strong> ({{ quotaDialogUser.email }})</p>
            <el-form label-width="140px" style="margin-top: 16px">
              <el-form-item label="Credits 变动">
                <el-input-number
                  v-model="quotaForm.creditsDelta"
                  :min="-999999"
                  :max="999999"
                  :step="100"
                  placeholder="正数发放，负数扣减"
                />
              </el-form-item>
            </el-form>
          </div>
          <template #footer>
            <el-button @click="quotaDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="saveQuota" :loading="quotaSaving">保存</el-button>
          </template>
        </el-dialog>
      </el-tab-pane>

      <el-tab-pane label="应用模板" name="appTemplates">
        <div class="tab-actions">
          <el-button type="primary" @click="showAppTemplateEdit()">新增模板</el-button>
        </div>
        <el-table :data="appTemplates" style="width: 100%">
          <el-table-column prop="name" label="名称" width="120" />
          <el-table-column prop="type_key" label="类型" width="100" />
          <el-table-column prop="example_requirement_id" label="示例需求ID" width="220" />
          <el-table-column prop="sort_order" label="排序" width="80" />
          <el-table-column prop="is_active" label="启用" width="80">
            <template #default="{ row }">
              <el-tag :type="row.is_active ? 'success' : 'info'">{{ row.is_active ? '是' : '否' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="160">
            <template #default="{ row }">
              <el-button size="small" @click="showAppTemplateEdit(row)">编辑</el-button>
              <el-button size="small" type="danger" @click="deleteAppTemplate(row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-dialog v-model="appTemplateDialogVisible" :title="editingAppTemplate?.id ? '编辑应用模板' : '新增应用模板'" width="720px">
          <el-form v-if="appTemplateForm" :model="appTemplateForm" label-width="140px">
            <el-form-item label="名称" required>
              <el-input v-model="appTemplateForm.name" placeholder="如：博客、待办、API工具" />
            </el-form-item>
            <el-form-item label="类型标识" required>
              <el-input v-model="appTemplateForm.type_key" placeholder="如：blog、todo、api_tool" />
            </el-form-item>
            <el-form-item label="示例需求ID">
              <el-input
                v-model="appTemplateForm.example_requirement_id"
                placeholder="用于模板页跳转需求详情和展示原型封面，可填写已存在的需求 ID"
              />
            </el-form-item>
            <el-form-item label="第一层：产品战略层">
              <el-input v-model="appTemplateForm.layer1_product_vision" type="textarea" :rows="3" placeholder="核心价值、用户画像、竞品差异化" />
            </el-form-item>
            <el-form-item label="第二层：功能定义层">
              <el-input v-model="appTemplateForm.layer2_functional_spec" type="textarea" :rows="3" placeholder="用户故事、功能模块、数据模型" />
            </el-form-item>
            <el-form-item label="第三层：实现指导层">
              <el-input v-model="appTemplateForm.layer3_impl_guidance" type="textarea" :rows="3" placeholder="技术栈、架构、API规范" />
            </el-form-item>
            <el-form-item label="第四层：部署配置层">
              <el-input v-model="appTemplateForm.layer4_deployment_spec" type="textarea" :rows="3" placeholder="环境、基础设施、监控运维" />
            </el-form-item>
            <el-form-item label="排序">
              <el-input-number v-model="appTemplateForm.sort_order" :min="0" />
            </el-form-item>
            <el-form-item label="启用">
              <el-switch v-model="appTemplateForm.is_active" />
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="appTemplateDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="saveAppTemplate">保存</el-button>
          </template>
        </el-dialog>
      </el-tab-pane>

      <el-tab-pane label="模板提示词" name="promptTemplates">
        <div class="tab-actions">
          <el-select v-model="promptDimFilter" placeholder="按维度筛选" clearable style="width: 160px; margin-right: 12px" @change="loadPromptTemplates">
            <el-option label="业务逻辑" value="business_logic" />
            <el-option label="UI/UX" value="ui_ux" />
            <el-option label="技术架构" value="tech_arch" />
            <el-option label="数据模型" value="data_model" />
            <el-option label="测试策略" value="test_strategy" />
            <el-option label="部署配置" value="deployment" />
            <el-option label="安全合规" value="security_compliance" />
          </el-select>
          <el-button type="primary" @click="showPromptTemplateEdit()">新增提示词</el-button>
        </div>
        <el-table :data="promptTemplates" style="width: 100%">
          <el-table-column prop="dimension" label="维度" width="120" />
          <el-table-column prop="title" label="标题" width="140" />
          <el-table-column prop="sort_order" label="排序" width="80" />
          <el-table-column prop="is_active" label="启用" width="80">
            <template #default="{ row }">
              <el-tag :type="row.is_active ? 'success' : 'info'">{{ row.is_active ? '是' : '否' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="content" label="内容摘要" show-overflow-tooltip />
          <el-table-column label="操作" width="160">
            <template #default="{ row }">
              <el-button size="small" @click="showPromptTemplateEdit(row)">编辑</el-button>
              <el-button size="small" type="danger" @click="deletePromptTemplate(row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-dialog v-model="promptTemplateDialogVisible" :title="editingPromptTemplate?.id ? '编辑模板提示词' : '新增模板提示词'" width="640px">
          <el-form v-if="promptTemplateForm" :model="promptTemplateForm" label-width="100px">
            <el-form-item label="维度" required>
              <el-select v-model="promptTemplateForm.dimension" placeholder="选择维度" style="width: 100%">
                <el-option label="业务逻辑" value="business_logic" />
                <el-option label="UI/UX" value="ui_ux" />
                <el-option label="技术架构" value="tech_arch" />
                <el-option label="数据模型" value="data_model" />
                <el-option label="测试策略" value="test_strategy" />
                <el-option label="部署配置" value="deployment" />
                <el-option label="安全合规" value="security_compliance" />
              </el-select>
            </el-form-item>
            <el-form-item label="标题" required>
              <el-input v-model="promptTemplateForm.title" placeholder="如：极简白、深色仪表盘" />
            </el-form-item>
            <el-form-item label="内容" required>
              <el-input v-model="promptTemplateForm.content" type="textarea" :rows="6" placeholder="该维度下拼进最终 prompt 的正文" />
            </el-form-item>
            <el-form-item label="排序">
              <el-input-number v-model="promptTemplateForm.sort_order" :min="0" />
            </el-form-item>
            <el-form-item label="启用">
              <el-switch v-model="promptTemplateForm.is_active" />
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="promptTemplateDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="savePromptTemplate">保存</el-button>
          </template>
        </el-dialog>
      </el-tab-pane>

      <el-tab-pane label="AI 账单" name="aiBilling">
        <div class="tab-actions">
          <el-button @click="loadAiBilling" :loading="aiBillingLoading">刷新</el-button>
        </div>
        <el-row :gutter="16" style="margin-bottom: 16px" v-if="aiBillingSummary">
          <el-col :span="6">
            <el-card shadow="hover">
              <div class="stat-card">
                <div class="stat-value">{{ aiBillingSummary.totalTasks }}</div>
                <div class="stat-label">总任务数</div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="hover">
              <div class="stat-card">
                <div class="stat-value">{{ (aiBillingSummary.totalTokens || 0).toLocaleString() }}</div>
                <div class="stat-label">总 Tokens</div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="hover">
              <div class="stat-card">
                <div class="stat-value">¥{{ ((aiBillingSummary.totalCostCents || 0) / 100).toFixed(2) }}</div>
                <div class="stat-label">总费用</div>
              </div>
            </el-card>
          </el-col>
        </el-row>
        <el-table :data="aiBillingList" v-loading="aiBillingLoading" stripe style="width: 100%">
          <el-table-column label="需求标题" min-width="160">
            <template #default="{ row }">
              <router-link v-if="row.requirement_id" :to="`/requirement/${row.requirement_id}`" class="requirement-link">
                {{ row.requirement_title || '-' }}
              </router-link>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="requirement_id" label="需求 ID" width="280" show-overflow-tooltip />
          <el-table-column prop="name" label="应用名称" min-width="120" show-overflow-tooltip />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getAppStatusType(row.status)" size="small">
                {{ getAppStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="tokens_used" label="Tokens 消耗" width="120" align="right">
            <template #default="{ row }">
              <span v-if="row.tokens_used">{{ Number(row.tokens_used).toLocaleString() }}</span>
              <span v-else class="text-muted">-</span>
            </template>
          </el-table-column>
          <el-table-column prop="cost_cents" label="费用" width="100" align="right">
            <template #default="{ row }">
              <span v-if="row.cost_cents">¥{{ (Number(row.cost_cents) / 100).toFixed(2) }}</span>
              <span v-else class="text-muted">-</span>
            </template>
          </el-table-column>
          <el-table-column prop="billing_status" label="计费状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getBillingStatusType(row.billing_status)" size="small">
                {{ getBillingStatusText(row.billing_status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="creator_username" label="创建人" width="120" />
          <el-table-column prop="created_at" label="创建时间" width="170">
            <template #default="{ row }">
              {{ row.created_at ? new Date(row.created_at).toLocaleString() : '-' }}
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="用户反馈" name="userFeedback">
        <div class="tab-actions">
          <el-select v-model="feedbackTypeFilter" placeholder="按类型" clearable style="width: 120px; margin-right: 8px" @change="loadFeedbackList">
            <el-option label="功能建议" value="feature" />
            <el-option label="使用问题" value="usage" />
            <el-option label="Bug 反馈" value="bug" />
            <el-option label="其他" value="other" />
          </el-select>
          <el-select v-model="feedbackStatusFilter" placeholder="按状态" clearable style="width: 110px; margin-right: 8px" @change="loadFeedbackList">
            <el-option label="待处理" value="pending" />
            <el-option label="处理中" value="processing" />
            <el-option label="已处理" value="resolved" />
          </el-select>
          <el-button @click="loadFeedbackList" :loading="feedbackListLoading">刷新</el-button>
        </div>
        <el-table :data="feedbackList" v-loading="feedbackListLoading" stripe style="width: 100%">
          <el-table-column prop="type" label="类型" width="100">
            <template #default="{ row }">
              {{ feedbackTypeLabel(row.type) }}
            </template>
          </el-table-column>
          <el-table-column prop="content" label="内容" min-width="220" show-overflow-tooltip />
          <el-table-column prop="contact" label="联系方式" width="140" show-overflow-tooltip />
          <el-table-column prop="status" label="状态" width="90">
            <template #default="{ row }">
              <el-tag size="small" :type="row.status === 'resolved' ? 'success' : row.status === 'processing' ? 'warning' : 'info'">
                {{ feedbackStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="提交时间" width="170">
            <template #default="{ row }">
              {{ row.created_at ? new Date(row.created_at).toLocaleString() : '-' }}
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-if="feedbackListTotal > 0"
          style="margin-top: 16px"
          :current-page="feedbackListPage"
          :page-size="feedbackListPageSize"
          :total="feedbackListTotal"
          layout="total, prev, pager, next"
          @current-change="(p: number) => { feedbackListPage = p; loadFeedbackList(); }"
        />
      </el-tab-pane>

      <el-tab-pane label="反馈与联系配置" name="feedbackContact">
        <el-card shadow="hover">
          <template #header>微信入群二维码</template>
          <p class="tab-hint">用于首页/帮助「联系我们」区块展示。微信二维码 7 日有效，请定期更换。建议尺寸约 430×430，格式 PNG 或 JPG。</p>
          <div v-if="contactConfig.wechat_group_qr_updated_at" class="wechat-qr-admin">
            <div class="qr-preview-wrap">
              <img :src="wechatQrPreviewUrl" alt="当前二维码" class="qr-preview-img" @error="qrImageError = true" />
              <div v-if="qrImageError" class="qr-preview-placeholder">图片加载失败</div>
            </div>
            <p class="qr-updated">上次更新：{{ formatContactDate(contactConfig.wechat_group_qr_updated_at) }}</p>
          </div>
          <div v-else class="wechat-qr-admin">
            <p class="text-muted">尚未上传二维码，上传后将在前台「联系我们」区块显示。</p>
          </div>
          <div style="margin-top: 16px">
            <el-upload
              :show-file-list="false"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              :before-upload="handleWechatQrUpload"
            >
              <el-button type="primary" :loading="wechatQrUploading">上传新二维码</el-button>
            </el-upload>
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="manageDialogVisible" title="需求管理" width="500px">
      <div v-if="selectedRequirement">
        <el-form label-width="80px">
          <el-form-item label="标题">
            <span>{{ selectedRequirement.title }}</span>
          </el-form-item>
          <el-form-item label="当前状态">
            <el-tag :type="getStatusType(selectedRequirement.status)">
              {{ selectedRequirement.status }}
            </el-tag>
          </el-form-item>
          <el-form-item label="更新状态">
            <el-select v-model="newStatus" placeholder="选择新状态">
              <el-option v-if="selectedRequirement.status === '投票中'" label="已采纳(开发中)" value="已采纳" />
              <el-option v-if="selectedRequirement.status === '已采纳'" label="已上线" value="已上线" />
            </el-select>
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="manageDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleUpdateStatus" :disabled="!newStatus">
          更新
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '@/api/client';
import { requirementApi } from '@/api/requirement';
import type { Requirement } from '@/types';

const activeTab = ref('pending');
const dashboard = ref({
  totalUsers: 0,
  totalRequirements: 0,
  totalVotes: 0,
  dailyActiveUsers: 0,
  requirementsByStatus: {},
});

const pendingRequirements = ref<Requirement[]>([]);
const aiRejectedRequirements = ref<any[]>([]);
const activeRequirements = ref<any[]>([]);
const manageDialogVisible = ref(false);
const selectedRequirement = ref<any>(null);
const newStatus = ref('');

const appTemplates = ref<any[]>([]);
const appTemplateDialogVisible = ref(false);
const editingAppTemplate = ref<any>(null);
const appTemplateForm = ref<{
  name: string;
  type_key: string;
  example_requirement_id: string;
  layer1_product_vision: string;
  layer2_functional_spec: string;
  layer3_impl_guidance: string;
  layer4_deployment_spec: string;
  sort_order: number;
  is_active: boolean;
} | null>(null);

const promptTemplates = ref<any[]>([]);
const promptDimFilter = ref('');
const promptTemplateDialogVisible = ref(false);
const editingPromptTemplate = ref<any>(null);
const promptTemplateForm = ref<{
  dimension: string;
  title: string;
  content: string;
  sort_order: number;
  is_active: boolean;
} | null>(null);

const aiBillingList = ref<any[]>([]);
const aiBillingSummary = ref<{ totalTasks: number; totalTokens: number; totalCostCents: number } | null>(null);
const aiBillingLoading = ref(false);

const feedbackList = ref<any[]>([]);
const feedbackListLoading = ref(false);
const feedbackListTotal = ref(0);
const feedbackListPage = ref(1);
const feedbackListPageSize = ref(20);
const feedbackTypeFilter = ref('');
const feedbackStatusFilter = ref('');

const contactConfig = ref<{ wechat_group_qr_url: string | null; wechat_group_qr_updated_at: string | null }>({
  wechat_group_qr_url: null,
  wechat_group_qr_updated_at: null,
});
const wechatQrUploading = ref(false);
const wechatQrPreviewTs = ref(0);
const qrImageError = ref(false);
const wechatQrPreviewUrl = computed(() =>
  contactConfig.value.wechat_group_qr_updated_at
    ? `/api/settings/wechat-qr-image?t=${wechatQrPreviewTs.value || contactConfig.value.wechat_group_qr_updated_at}`
    : ''
);
function formatContactDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('zh-CN');
  } catch {
    return iso;
  }
}

const queueStatus = ref<{ queue: { dedicated: number; priority: number; normal: number }; genTasks: Record<string, number> } | null>(null);
const healthStatus = ref<{ db: boolean; redis: boolean } | null>(null);
const supportUsers = ref<any[]>([]);
const supportUsersTotal = ref(0);
const supportUsersPage = ref(1);
const supportUsersPageSize = ref(20);
const supportUsersPlanFilter = ref('');
const supportUsersLoading = ref(false);
const quotaDialogVisible = ref(false);
const quotaDialogUser = ref<any>(null);
const quotaForm = ref({ creditsDelta: 0 as number | null });
const quotaSaving = ref(false);

onMounted(() => {
  loadDashboard();
  loadPendingRequirements();
  loadAiRejectedRequirements();
  loadActiveRequirements();
  loadQueueStatus();
  loadHealth();
});

watch(activeTab, (tab) => {
  if (tab === 'appTemplates') loadAppTemplates();
  if (tab === 'promptTemplates') loadPromptTemplates();
  if (tab === 'aiBilling') loadAiBilling();
  if (tab === 'usersQuota') loadSupportUsers();
  if (tab === 'feedbackContact') loadContactConfig();
  if (tab === 'userFeedback') loadFeedbackList();
});

function feedbackTypeLabel(type: string) {
  const map: Record<string, string> = { feature: '功能建议', usage: '使用问题', bug: 'Bug 反馈', other: '其他' };
  return map[type] || type;
}
function feedbackStatusLabel(status: string) {
  const map: Record<string, string> = { pending: '待处理', processing: '处理中', resolved: '已处理' };
  return map[status] || status;
}
async function loadFeedbackList() {
  feedbackListLoading.value = true;
  try {
    const { data } = await api.get('/admin/feedback', {
      params: {
        page: feedbackListPage.value,
        pageSize: feedbackListPageSize.value,
        type: feedbackTypeFilter.value || undefined,
        status: feedbackStatusFilter.value || undefined,
      },
    });
    feedbackList.value = (data as any)?.data ?? [];
    feedbackListTotal.value = (data as any)?.total ?? 0;
  } catch {
    ElMessage.error('加载用户反馈失败');
    feedbackList.value = [];
  } finally {
    feedbackListLoading.value = false;
  }
}

async function loadContactConfig() {
  try {
    const { data } = await api.get('/admin/settings/contact');
    const d = (data as any)?.data;
    if (d) {
      contactConfig.value = {
        wechat_group_qr_url: d.wechat_group_qr_url ?? null,
        wechat_group_qr_updated_at: d.wechat_group_qr_updated_at ?? null,
      };
    }
    qrImageError.value = false;
  } catch {
    contactConfig.value = { wechat_group_qr_url: null, wechat_group_qr_updated_at: null };
  }
}

async function handleWechatQrUpload(file: File) {
  wechatQrUploading.value = true;
  qrImageError.value = false;
  try {
    const formData = new FormData();
    formData.append('file', file);
    await api.post('/admin/settings/wechat-qr', formData);
    ElMessage.success('已更新，请刷新前台页面查看生效情况');
    wechatQrPreviewTs.value = Date.now();
    await loadContactConfig();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '上传失败');
  } finally {
    wechatQrUploading.value = false;
  }
  return false;
}

async function loadAiBilling() {
  aiBillingLoading.value = true;
  try {
    const { data } = await api.get('/admin/ai-billing');
    aiBillingList.value = data.data ?? [];
    aiBillingSummary.value = data.summary ?? null;
  } catch (e) {
    ElMessage.error('加载 AI 账单失败');
    aiBillingList.value = [];
    aiBillingSummary.value = null;
  } finally {
    aiBillingLoading.value = false;
  }
}

function getAppStatusType(status: string) {
  const types: Record<string, string> = {
    generating: 'warning',
    ready: 'success',
    error: 'danger',
    deploying: 'info',
    stopped: 'info',
  };
  return types[status || ''] || 'info';
}

function getAppStatusText(status: string) {
  const texts: Record<string, string> = {
    generating: '生成中',
    ready: '就绪',
    error: '错误',
    deploying: '部署中',
    stopped: '已停止',
  };
  return texts[status || ''] || status || '-';
}

function getBillingStatusType(status: string) {
  const types: Record<string, string> = {
    pending: 'info',
    calculated: 'success',
    paid: 'success',
    free: 'info',
  };
  return types[status || ''] || 'info';
}

function getBillingStatusText(status: string) {
  const texts: Record<string, string> = {
    pending: '待计费',
    calculated: '已计费',
    paid: '已支付',
    free: '免费',
  };
  return texts[status || ''] || status || '-';
}

async function loadDashboard() {
  try {
    const { data } = await api.get('/admin/dashboard');
    dashboard.value = data;
  } catch (error) {
    ElMessage.error('加载数据失败');
  }
}

async function loadPendingRequirements() {
  try {
    const { data } = await api.get('/admin/requirements/pending');
    pendingRequirements.value = data.requirements;
  } catch (error) {
    ElMessage.error('加载待审核需求失败');
  }
}

async function loadAiRejectedRequirements() {
  try {
    const { data } = await api.get('/admin/requirements/ai-rejected');
    aiRejectedRequirements.value = data.requirements ?? [];
  } catch (error) {
    ElMessage.error('加载 AI 未通过列表失败');
    aiRejectedRequirements.value = [];
  }
}

async function loadActiveRequirements() {
  try {
    const { data } = await api.get('/admin/requirements/active');
    activeRequirements.value = data.requirements;
  } catch (error) {
    ElMessage.error('加载需求失败');
  }
}

async function loadQueueStatus() {
  try {
    const { data } = await api.get('/admin/queue-status');
    queueStatus.value = data.data ?? null;
  } catch {
    queueStatus.value = null;
  }
}

async function loadHealth() {
  try {
    const { data } = await api.get('/admin/health');
    healthStatus.value = data.data ?? null;
  } catch {
    healthStatus.value = null;
  }
}

async function loadSupportUsers() {
  supportUsersLoading.value = true;
  try {
    const { data } = await api.get('/admin/users', {
      params: {
        plan: supportUsersPlanFilter.value || undefined,
        page: supportUsersPage.value,
        pageSize: supportUsersPageSize.value,
      },
    });
    supportUsers.value = data.users ?? [];
    supportUsersTotal.value = data.total ?? 0;
  } catch {
    ElMessage.error('加载用户列表失败');
    supportUsers.value = [];
  } finally {
    supportUsersLoading.value = false;
  }
}

function showQuotaDialog(user: any) {
  quotaDialogUser.value = user;
  quotaForm.value = {
    creditsDelta: 0,
  };
  quotaDialogVisible.value = true;
}

async function saveQuota() {
  if (!quotaDialogUser.value?.id) return;
  quotaSaving.value = true;
  try {
    const body: any = {};
    if (quotaForm.value.creditsDelta != null && quotaForm.value.creditsDelta !== 0) {
      body.creditsDelta = quotaForm.value.creditsDelta;
    } else {
      ElMessage.warning('请输入需要发放或扣减的 Credits 数量');
      quotaSaving.value = false;
      return;
    }
    await api.put(`/admin/users/${quotaDialogUser.value.id}/quota`, body);
    ElMessage.success('已发放 Credits');
    quotaDialogVisible.value = false;
    loadSupportUsers();
    loadDashboard();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '更新失败');
  } finally {
    quotaSaving.value = false;
  }
}

async function handleApprove(id: string) {
  try {
    await requirementApi.approve(id);
    ElMessage.success('审核通过');
    loadPendingRequirements();
    loadAiRejectedRequirements();
    loadActiveRequirements();
    loadDashboard();
  } catch (error) {
    ElMessage.error('操作失败');
  }
}

async function handleReject(id: string) {
  try {
    await requirementApi.reject(id);
    ElMessage.success('已拒绝');
    loadPendingRequirements();
    loadDashboard();
  } catch (error) {
    ElMessage.error('操作失败');
  }
}

async function handleDeleteRequirement(id: string) {
  try {
    await ElMessageBox.confirm('确定要删除该需求吗？删除后无法恢复。', '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await requirementApi.deleteForAdmin(id);
    ElMessage.success('已删除');
    loadPendingRequirements();
    loadAiRejectedRequirements();
    loadActiveRequirements();
    loadDashboard();
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e?.response?.data?.message || '删除失败');
    }
  }
}

function showManageDialog(requirement: any) {
  selectedRequirement.value = requirement;
  newStatus.value = '';
  manageDialogVisible.value = true;
}

async function handleUpdateStatus() {
  if (!selectedRequirement.value || !newStatus.value) return;
  try {
    await requirementApi.updateStatus(selectedRequirement.value.id, newStatus.value as any);
    ElMessage.success('更新成功');
    manageDialogVisible.value = false;
    loadActiveRequirements();
    loadDashboard();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '更新失败');
  }
}

function getStatusType(status: string) {
  const types: Record<string, any> = {
    '待审核': 'info',
    '投票中': 'primary',
    '已采纳': 'warning',
    '已上线': 'success',
    '已拒绝': 'danger',
  };
  return types[status] || 'info';
}

async function loadAppTemplates() {
  try {
    const { data } = await api.get('/admin/app-templates');
    appTemplates.value = (data as any)?.data ?? [];
  } catch (e) {
    ElMessage.error('加载应用模板失败');
    appTemplates.value = [];
  }
}

function showAppTemplateEdit(row?: any) {
  editingAppTemplate.value = row ?? null;
  appTemplateForm.value = {
    name: row?.name ?? '',
    type_key: row?.type_key ?? '',
    example_requirement_id: row?.example_requirement_id ?? '',
    layer1_product_vision: row?.layer1_product_vision ?? '',
    layer2_functional_spec: row?.layer2_functional_spec ?? '',
    layer3_impl_guidance: row?.layer3_impl_guidance ?? '',
    layer4_deployment_spec: row?.layer4_deployment_spec ?? '',
    sort_order: row?.sort_order ?? 0,
    is_active: row?.is_active ?? true,
  };
  appTemplateDialogVisible.value = true;
}

async function saveAppTemplate() {
  if (!appTemplateForm.value || !appTemplateForm.value.name || !appTemplateForm.value.type_key) {
    ElMessage.warning('请填写名称和类型标识');
    return;
  }
  const payload = {
    ...appTemplateForm.value,
    example_requirement_id: appTemplateForm.value.example_requirement_id?.trim() || null,
  };
  try {
    if (editingAppTemplate.value?.id) {
      await api.put(`/admin/app-templates/${editingAppTemplate.value.id}`, payload);
      ElMessage.success('更新成功');
    } else {
      await api.post('/admin/app-templates', payload);
      ElMessage.success('新增成功');
    }
    appTemplateDialogVisible.value = false;
    loadAppTemplates();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '保存失败');
  }
}

async function deleteAppTemplate(id: string) {
  try {
    await api.delete(`/admin/app-templates/${id}`);
    ElMessage.success('已删除');
    loadAppTemplates();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '删除失败');
  }
}

async function loadPromptTemplates() {
  try {
    const params: any = {};
    if (promptDimFilter.value) params.dimension = promptDimFilter.value;
    const { data } = await api.get('/admin/prompt-templates', { params });
    promptTemplates.value = (data as any)?.data ?? [];
  } catch (e) {
    ElMessage.error('加载模板提示词失败');
    promptTemplates.value = [];
  }
}

function showPromptTemplateEdit(row?: any) {
  editingPromptTemplate.value = row ?? null;
  promptTemplateForm.value = {
    dimension: row?.dimension ?? 'ui_ux',
    title: row?.title ?? '',
    content: row?.content ?? '',
    sort_order: row?.sort_order ?? 0,
    is_active: row?.is_active ?? true,
  };
  promptTemplateDialogVisible.value = true;
}

async function savePromptTemplate() {
  if (!promptTemplateForm.value || !promptTemplateForm.value.dimension || !promptTemplateForm.value.title || !promptTemplateForm.value.content) {
    ElMessage.warning('请填写维度、标题和内容');
    return;
  }
  try {
    if (editingPromptTemplate.value?.id) {
      await api.put(`/admin/prompt-templates/${editingPromptTemplate.value.id}`, promptTemplateForm.value);
      ElMessage.success('更新成功');
    } else {
      await api.post('/admin/prompt-templates', promptTemplateForm.value);
      ElMessage.success('新增成功');
    }
    promptTemplateDialogVisible.value = false;
    loadPromptTemplates();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '保存失败');
  }
}

async function deletePromptTemplate(id: string) {
  try {
    await api.delete(`/admin/prompt-templates/${id}`);
    ElMessage.success('已删除');
    loadPromptTemplates();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '删除失败');
  }
}
</script>

<style scoped>
.stat-card {
  text-align: center;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #409eff;
}

.stat-label {
  margin-top: 10px;
  color: #666;
}

.tab-actions {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.requirement-link {
  color: var(--el-color-primary);
  text-decoration: none;
}
.requirement-link:hover {
  text-decoration: underline;
}

.text-muted {
  color: #999;
}

.wechat-qr-admin {
  margin-bottom: 8px;
}
.qr-preview-wrap {
  position: relative;
  display: inline-block;
  margin-bottom: 8px;
}
.qr-preview-img {
  width: 200px;
  height: 200px;
  object-fit: contain;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
}
.qr-preview-placeholder {
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}
.qr-updated {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
</style>
