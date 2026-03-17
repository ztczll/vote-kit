<template>
  <div class="legal-page">
    <div class="legal-card">
      <h1 class="title">用户协议</h1>
      <p class="updated-at">最近更新日期：2026-03-09</p>

      <section>
        <h2>一、总则</h2>
        <p>
          本《用户协议》（以下简称“本协议”）是您与 Vote-Kit 平台之间关于使用平台提供的
          AI 原型生成、代码生成及相关服务所订立的有效约定。请在注册成为用户前仔细阅读并充分理解本协议。
        </p>
      </section>

      <section>
        <h2>二、用户注册与账户管理</h2>
        <ul>
          <li>您应具备完全民事行为能力，方可注册并使用本平台服务。</li>
          <li>您承诺向平台提供的注册信息（包括但不限于邮箱）真实、准确、完整并保持及时更新。</li>
          <li>您应妥善保管账号和密码，不得出租、出借或分享给他人使用，否则因此产生的责任由您自行承担。</li>
        </ul>
      </section>

      <section>
        <h2>三、服务内容与使用规则</h2>
        <p>
          平台向您提供包括但不限于：需求收集与投票、AI 应用原型生成、代码生成、以及可选的代码托管与部署等功能。平台有权根据业务需要对服务内容进行调整和优化，并在平台内进行公告。
        </p>
      </section>

      <section>
        <h2>四、用户行为规范</h2>
        <ul>
          <li>您不得利用平台生成、上传或传播任何违法违规、侵权、恶意或不当内容。</li>
          <li>您不得通过批量注册、攻击接口等方式恶意占用平台资源或影响平台正常运营。</li>
          <li>平台有权对涉嫌违规的账号采取包括但不限于限制使用、冻结账号、删除内容等措施。</li>
        </ul>
      </section>

      <section>
        <h2>五、用户生成内容与知识产权</h2>
        <ul>
          <li>除法律法规另有规定外，您对基于本平台生成的原型、代码等成果享有合法权益。</li>
          <li>
            您授权平台在为实现服务目的的必要范围内对上述内容进行存储、展示、备份及技术处理，但不改变其原有含义。
          </li>
          <li>平台对自身提供的模型、算法、界面设计、文档资料等享有知识产权，未经书面许可您不得进行商业性使用。</li>
        </ul>
      </section>

      <section>
        <h2>六、责任限制与免责</h2>
        <ul>
          <li>平台以“现状”和“可用”状态向您提供服务，不保证生成代码完全无误或适用于所有特定目的。</li>
          <li>您应在使用前自行进行充分测试与评审，因未充分测试造成的损失由您自行承担。</li>
          <li>因不可抗力或第三方原因导致服务中断、数据丢失等情形的，平台将在合理范围内协助恢复，但在法律允许范围内不承担额外责任。</li>
        </ul>
      </section>

      <section>
        <h2>七、隐私保护</h2>
        <p>
          平台高度重视对用户个人信息和隐私的保护，将依据单独公示的《隐私政策》对您的信息进行收集、使用和保护。本协议中关于个人信息保护的约定与《隐私政策》不一致的，以《隐私政策》的约定为准。
        </p>
      </section>

      <section>
        <h2>八、协议变更与终止</h2>
        <ul>
          <li>平台有权根据业务发展对本协议进行修订，并通过站内公告、弹窗或其他合理方式进行通知。</li>
          <li>如您不同意修订内容，应立即停止使用平台服务；如您继续使用，即视为同意修订后的协议。</li>
          <li>您可以通过平台提供的方式申请注销账号，平台将在法律法规规定期限内处理与您的数据相关事宜。</li>
        </ul>
      </section>

      <section>
        <h2>九、法律适用与争议解决</h2>
        <p>
          本协议的订立、履行和解释及争议的解决，暂以中国法律为参考。如您有任何异议或争议，双方应首先友好协商解决；协商不成的，您可向平台所在地有管辖权的人民法院提起诉讼。
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

