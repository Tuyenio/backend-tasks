import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { EmailService } from './email.service';
import { SendEmailDto } from './dto/send-email.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('email')
@UseGuards(JwtAuthGuard)
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send')
  async sendEmail(@Body() dto: SendEmailDto) {
    return this.emailService.sendEmail(dto);
  }

  @Get('stats')
  async getEmailStats() {
    return this.emailService.getEmailStats();
  }
}
