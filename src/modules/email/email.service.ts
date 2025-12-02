import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { SendEmailDto } from './dto/send-email.dto';

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // For development, use ethereal.email or configure SMTP
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST', 'smtp.ethereal.email'),
      port: this.configService.get('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: this.configService.get('SMTP_USER', ''),
        pass: this.configService.get('SMTP_PASS', ''),
      },
    });

    // Verify connection
    this.transporter.verify((error) => {
      if (error) {
        this.logger.error('SMTP connection failed:', error);
      } else {
        this.logger.log('SMTP server is ready to send emails');
      }
    });
  }

  async sendEmail(dto: SendEmailDto) {
    try {
      const info = await this.transporter.sendMail({
        from: this.configService.get('SMTP_FROM', 'noreply@tasks.app'),
        to: dto.to,
        subject: dto.subject,
        text: dto.text,
        html: dto.html,
      });

      this.logger.log(`Email sent: ${info.messageId}`);
      return {
        success: true,
        messageId: info.messageId,
        previewUrl: nodemailer.getTestMessageUrl(info),
      };
    } catch (error) {
      this.logger.error('Failed to send email:', error);
      throw error;
    }
  }

  async sendWelcomeEmail(email: string, name: string) {
    const template = this.getWelcomeTemplate(name);
    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendPasswordResetEmail(email: string, resetToken: string, name: string) {
    const template = this.getPasswordResetTemplate(resetToken, name);
    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendEmailVerificationEmail(email: string, verificationToken: string, name: string) {
    const template = this.getEmailVerificationTemplate(verificationToken, name);
    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendTaskAssignedEmail(email: string, taskTitle: string, projectName: string, assignerName: string) {
    const template = this.getTaskAssignedTemplate(taskTitle, projectName, assignerName);
    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendTaskDueReminderEmail(email: string, taskTitle: string, dueDate: Date) {
    const template = this.getTaskDueReminderTemplate(taskTitle, dueDate);
    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendProjectInviteEmail(email: string, projectName: string, inviterName: string) {
    const template = this.getProjectInviteTemplate(projectName, inviterName);
    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendUserInviteEmail(email: string, inviteToken: string, inviterName: string, roleName: string) {
    const template = this.getUserInviteTemplate(inviteToken, inviterName, roleName);
    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendAccountCreatedEmail(email: string, name: string, password: string) {
    const template = this.getAccountCreatedTemplate(email, name, password);
    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  // Email Templates
  private getWelcomeTemplate(name: string): EmailTemplate {
    return {
      subject: 'Welcome to Tasks App!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #3b82f6;">Welcome to Tasks App!</h1>
          <p>Hi ${name},</p>
          <p>Thank you for joining Tasks App. We're excited to have you on board!</p>
          <p>You can now start creating projects, managing tasks, and collaborating with your team.</p>
          <div style="margin: 30px 0;">
            <a href="${this.configService.get('APP_URL', 'http://localhost:3000')}" 
               style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Get Started
            </a>
          </div>
          <p>Best regards,<br>Tasks App Team</p>
        </div>
      `,
      text: `Welcome to Tasks App!\n\nHi ${name},\n\nThank you for joining Tasks App. We're excited to have you on board!`,
    };
  }

  private getPasswordResetTemplate(resetToken: string, name: string): EmailTemplate {
    const resetUrl = `${this.configService.get('APP_URL', 'http://localhost:3000')}/reset-password?token=${resetToken}`;
    return {
      subject: 'Reset Your Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #3b82f6;">Reset Your Password</h1>
          <p>Hi ${name},</p>
          <p>We received a request to reset your password. Click the button below to reset it:</p>
          <div style="margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <p>Best regards,<br>Tasks App Team</p>
        </div>
      `,
      text: `Reset Your Password\n\nHi ${name},\n\nClick this link to reset your password: ${resetUrl}`,
    };
  }

  private getEmailVerificationTemplate(verificationToken: string, name: string): EmailTemplate {
    const verifyUrl = `${this.configService.get('APP_URL', 'http://localhost:3000')}/verify-email?token=${verificationToken}`;
    return {
      subject: 'Verify Your Email Address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #3b82f6;">Verify Your Email</h1>
          <p>Hi ${name},</p>
          <p>Please verify your email address by clicking the button below:</p>
          <div style="margin: 30px 0;">
            <a href="${verifyUrl}" 
               style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Verify Email
            </a>
          </div>
          <p>Best regards,<br>Tasks App Team</p>
        </div>
      `,
      text: `Verify Your Email\n\nHi ${name},\n\nClick this link to verify your email: ${verifyUrl}`,
    };
  }

  private getTaskAssignedTemplate(taskTitle: string, projectName: string, assignerName: string): EmailTemplate {
    return {
      subject: `New Task Assigned: ${taskTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #3b82f6;">New Task Assigned</h1>
          <p>${assignerName} has assigned you a new task:</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin: 0 0 10px 0;">${taskTitle}</h2>
            <p style="margin: 0; color: #6b7280;">Project: ${projectName}</p>
          </div>
          <div style="margin: 30px 0;">
            <a href="${this.configService.get('APP_URL', 'http://localhost:3000')}/tasks" 
               style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              View Task
            </a>
          </div>
          <p>Best regards,<br>Tasks App Team</p>
        </div>
      `,
      text: `New Task Assigned: ${taskTitle}\n\n${assignerName} has assigned you a new task in project ${projectName}.`,
    };
  }

  private getTaskDueReminderTemplate(taskTitle: string, dueDate: Date): EmailTemplate {
    return {
      subject: `Task Due Soon: ${taskTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #f59e0b;">Task Due Soon</h1>
          <p>Reminder: The following task is due soon:</p>
          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin: 0 0 10px 0;">${taskTitle}</h2>
            <p style="margin: 0; color: #92400e;">Due: ${dueDate.toLocaleString()}</p>
          </div>
          <div style="margin: 30px 0;">
            <a href="${this.configService.get('APP_URL', 'http://localhost:3000')}/tasks" 
               style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              View Task
            </a>
          </div>
          <p>Best regards,<br>Tasks App Team</p>
        </div>
      `,
      text: `Task Due Soon: ${taskTitle}\n\nThis task is due on ${dueDate.toLocaleString()}.`,
    };
  }

  private getProjectInviteTemplate(projectName: string, inviterName: string): EmailTemplate {
    return {
      subject: `Project Invitation: ${projectName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #3b82f6;">Project Invitation</h1>
          <p>${inviterName} has invited you to join the project:</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin: 0;">${projectName}</h2>
          </div>
          <div style="margin: 30px 0;">
            <a href="${this.configService.get('APP_URL', 'http://localhost:3000')}/projects" 
               style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              View Project
            </a>
          </div>
          <p>Best regards,<br>Tasks App Team</p>
        </div>
      `,
      text: `Project Invitation: ${projectName}\n\n${inviterName} has invited you to join this project.`,
    };
  }

  private getUserInviteTemplate(inviteToken: string, inviterName: string, roleName: string): EmailTemplate {
    const acceptUrl = `${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/accept-invite?token=${inviteToken}`;
    return {
      subject: `Lời mời tham gia TaskMaster từ ${inviterName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #3b82f6;">Lời mời tham gia TaskMaster</h1>
          <p>Xin chào,</p>
          <p><strong>${inviterName}</strong> đã mời bạn tham gia hệ thống quản lý công việc TaskMaster với vai trò <strong>${roleName}</strong>.</p>
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <p style="margin: 0; color: #1e40af;">💼 Vai trò: <strong>${roleName}</strong></p>
            <p style="margin: 10px 0 0 0; color: #1e40af;">👤 Người mời: <strong>${inviterName}</strong></p>
          </div>
          <p>Nhấn vào nút bên dưới để kích hoạt tài khoản và thiết lập mật khẩu của bạn:</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${acceptUrl}" 
               style="background-color: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              🔐 Kích hoạt tài khoản
            </a>
          </div>
          <p style="color: #ef4444; font-size: 14px;">⚠️ Lời mời này sẽ hết hạn sau 7 ngày.</p>
          <p>Nếu bạn không yêu cầu lời mời này, vui lòng bỏ qua email.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            Trân trọng,<br>
            <strong>TaskMaster Team</strong>
          </p>
        </div>
      `,
      text: `Lời mời tham gia TaskMaster\n\n${inviterName} đã mời bạn tham gia với vai trò ${roleName}.\n\nKích hoạt tài khoản: ${acceptUrl}\n\nLời mời hết hạn sau 7 ngày.`,
    };
  }

  private getAccountCreatedTemplate(email: string, name: string, password: string): EmailTemplate {
    const loginUrl = `${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/login`;
    return {
      subject: `Tài khoản TaskMaster của bạn đã được tạo`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #10b981;">🎉 Tài khoản đã được tạo thành công!</h1>
          <p>Xin chào <strong>${name}</strong>,</p>
          <p>Quản trị viên đã tạo tài khoản TaskMaster cho bạn. Dưới đây là thông tin đăng nhập:</p>
          <div style="background-color: #f0fdf4; padding: 24px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #10b981;">
            <p style="margin: 0 0 12px 0; color: #065f46; font-size: 14px;">📧 <strong>Email đăng nhập:</strong></p>
            <p style="margin: 0 0 20px 0; padding: 12px; background: white; border-radius: 4px; font-family: monospace; font-size: 16px; color: #047857;">${email}</p>
            
            <p style="margin: 0 0 12px 0; color: #065f46; font-size: 14px;">🔑 <strong>Mật khẩu tạm thời:</strong></p>
            <p style="margin: 0; padding: 12px; background: white; border-radius: 4px; font-family: monospace; font-size: 16px; color: #047857; font-weight: 600;">${password}</p>
          </div>
          <div style="background-color: #fef3c7; padding: 16px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">⚠️ <strong>Lưu ý bảo mật:</strong></p>
            <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #92400e; font-size: 14px;">
              <li>Hãy đổi mật khẩu ngay sau khi đăng nhập lần đầu</li>
              <li>Không chia sẻ mật khẩu với bất kỳ ai</li>
              <li>Sử dụng mật khẩu mạnh (ít nhất 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt)</li>
            </ul>
          </div>
          <div style="margin: 32px 0; text-align: center;">
            <a href="${loginUrl}" 
               style="background-color: #10b981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
              🚀 Đăng nhập ngay
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
            Nếu bạn không yêu cầu tài khoản này, vui lòng liên hệ quản trị viên.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            Trân trọng,<br>
            <strong>TaskMaster Team</strong>
          </p>
        </div>
      `,
      text: `Tài khoản TaskMaster đã được tạo\n\nXin chào ${name},\n\nEmail: ${email}\nMật khẩu tạm thời: ${password}\n\nHãy đổi mật khẩu ngay sau khi đăng nhập.\n\nĐăng nhập tại: ${loginUrl}`,
    };
  }

  // Queue management (placeholder - would use Bull/Redis in production)
  async queueEmail(dto: SendEmailDto) {
    // In production, this would add to a Redis queue
    // For now, just send directly
    return this.sendEmail(dto);
  }

  async getEmailStats() {
    // Placeholder for email statistics
    return {
      sent: 0,
      failed: 0,
      queued: 0,
      message: 'Email queue statistics (placeholder)',
    };
  }
}
