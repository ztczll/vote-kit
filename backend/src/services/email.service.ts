import { EmailVerificationHandler } from './auth.service';
import { User } from '../types/models';

function buildVerificationUrl(token: string): string {
  const frontendBase = process.env.FRONTEND_BASE_URL || 'https://your-domain.com';
  const trimmedBase = frontendBase.replace(/\/+$/, '');
  const isHttpUrl = /^https?:\/\//i.test(trimmedBase);
  const base = isHttpUrl ? trimmedBase : `https://${trimmedBase}`;
  return `${base}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
}

export class EmailService implements EmailVerificationHandler {
  async sendVerificationEmail(params: {
    user: Omit<User, 'password_hash'>;
    token: string;
  }): Promise<void> {
    const { user, token } = params;
    const verificationUrl = buildVerificationUrl(token);

    const subject = '[Vote-Kit] 请验证您的邮箱';
    const text = [
      `您好，${user.username}：`,
      '',
      '感谢注册 Vote-Kit。请在 24 小时内点击下面的链接完成邮箱验证：',
      verificationUrl,
      '',
      '如果这不是您本人的操作，请忽略本邮件。',
      '',
      '—— Vote-Kit 团队',
    ].join('\n');

    const html = `
      <p>您好，${user.username}：</p>
      <p>感谢注册 <strong>Vote-Kit</strong>。请在 <strong>24 小时</strong> 内点击下方按钮完成邮箱验证：</p>
      <p>
        <a href="${verificationUrl}" style="
          display:inline-block;
          padding:10px 20px;
          background-color:#1890ff;
          color:#ffffff;
          text-decoration:none;
          border-radius:4px;
        ">一键验证邮箱</a>
      </p>
      <p>如果按钮无法点击，请将以下链接复制到浏览器中打开：</p>
      <p><a href="${verificationUrl}">${verificationUrl}</a></p>
      <hr />
      <p style="font-size:12px;color:#888;">
        如果这不是您本人的操作，请忽略本邮件。<br />
        登录后，您可以在“账号设置”页面查看和管理您的邮箱信息。<br />
      </p>
    `;

    // 预留实际发送实现：可在此集成 SMTP / SendGrid / 阿里云邮件等服务
    // 目前默认打印到日志，避免因未配置邮件服务导致注册失败
    // eslint-disable-next-line no-console
    console.log('[EmailService] sendVerificationEmail', {
      to: user.email,
      subject,
      textPreview: text.slice(0, 120),
      verificationUrl,
    });

    // TODO: 在此处集成实际邮件发送实现，例如：
    // await someMailer.send({ to: user.email, subject, text, html });
  }
}

