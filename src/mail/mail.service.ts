import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendResetPasswordEmail(email: string, token: string) {
    const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await this.mailerService.sendMail({
      to: email,
      subject: 'Reset Password',
      html: `
        <h2>Reset Password</h2>

        <p>Click button below:</p>

        <a href="${url}">
            Reset Password
        </a>

        <p>Link expires in 15 minutes.</p>
      `,
    });
  }
}
