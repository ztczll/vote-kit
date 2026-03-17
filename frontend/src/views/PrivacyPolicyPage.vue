<template>
  <div class="legal-page">
    <div class="legal-card">
      <h1 class="title">隐私政策</h1>
      <p class="updated-at">最近更新日期：2026-03-09</p>

      <section>
        <h2>一、引言与适用范围</h2>
        <p>
          本《隐私政策》适用于您使用 Vote-Kit 平台提供的全部产品和服务。请在使用前仔细阅读并理解本政策，以便您了解我们如何收集、使用和保护您的个人信息。
        </p>
      </section>

      <section>
        <h2>二、我们收集的信息</h2>
        <ul>
          <li>账户信息：如您的邮箱地址、用户名等用于注册和登录的信息。</li>
          <li>使用数据：如访问时间、IP 地址、浏览器类型、操作记录等，用于安全审计和服务改进。</li>
          <li>内容数据：您在平台中提交的需求描述、提示词、生成的原型和代码等，用于向您提供相应功能。</li>
        </ul>
      </section>

      <section>
        <h2>三、我们如何使用信息</h2>
        <ul>
          <li>用于创建和维护您的账户，提供登录、权限校验等基础功能。</li>
          <li>用于向您发送与服务相关的通知，例如邮箱验证、安全提醒等。</li>
          <li>用于分析和改进产品功能和用户体验，例如统计使用情况、排查故障等。</li>
          <li>用于履行法律法规要求或配合监管机构的合规义务。</li>
        </ul>
      </section>

      <section>
        <h2>四、我们如何共享、转让和公开披露信息</h2>
        <ul>
          <li>我们不会向无关第三方出售您的个人信息。</li>
          <li>在为实现服务目的所必需时，可能会与云服务提供商、邮件服务商等合作方共享必要的信息，并要求其承担相应的保密义务。</li>
          <li>在法律法规要求或行政、司法机关依法提出请求时，我们可能会向相关机构披露您的信息。</li>
        </ul>
      </section>

      <section>
        <h2>五、Cookie 及类似技术</h2>
        <p>
          我们可能使用 Cookie 或类似技术用于会话保持、偏好设置和统计分析。您可以通过浏览器设置管理或删除 Cookie，但这可能影响部分功能的正常使用。
        </p>
      </section>

      <section>
        <h2>六、信息安全与存储</h2>
        <ul>
          <li>我们采用合理的安全措施（例如 HTTPS 传输、访问控制等）保护您的信息免遭未经授权的访问、使用或泄露。</li>
          <li>我们会在实现本政策所述目的所必需的期限内保存您的个人信息，超出期限后会根据法律要求删除或匿名化处理。</li>
        </ul>
      </section>

      <section>
        <h2>七、您的权利</h2>
        <ul>
          <li>您有权查阅、更正或更新您的注册信息。</li>
          <li>在满足法律法规条件时，您可以申请删除相关个人信息或注销账号。</li>
          <li>如您对个人信息处理有任何疑问或投诉，可通过页面底部公示的联系方式与我们取得联系。</li>
        </ul>
      </section>

      <section>
        <h2>八、未成年人保护</h2>
        <p>
          我们的服务主要面向具有完全民事行为能力的用户。如您为未成年人，应在监护人监护、指导下使用本平台，并由监护人负责同意信息处理等事宜。
        </p>
      </section>

      <section>
        <h2>九、本政策的更新</h2>
        <p>
          我们可能适时对本政策进行修订，并在平台显著位置发布更新版本。重大变更时，我们可能通过站内消息或其他合理方式另行通知。
        </p>
      </section>

      <section>
        <h2>十、联系我们</h2>
        <p>
          如您对本政策或个人信息保护有任何问题、建议或投诉，可通过平台公示的联系方式与我们取得联系，我们将尽快予以答复。
        </p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.legal-page {
  display: flex;
  justify-content: center;
  padding: var(--space-8) var(--space-4);
}

.legal-card {
  max-width: 900px;
  width: 100%;
  background: var(--color-surface-light);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  box-shadow: var(--shadow-md);
}

.title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: var(--space-2);
}

.updated-at {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-4);
}

section {
  margin-bottom: var(--space-5);
}

section h2 {
  font-size: 18px;
  margin-bottom: var(--space-2);
}

section p,
section li {
  font-size: 14px;
  line-height: 1.7;
  color: var(--color-text-secondary);
}

ul {
  padding-left: 1.2rem;
}
</style>

