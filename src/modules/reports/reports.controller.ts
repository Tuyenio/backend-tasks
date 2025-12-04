import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { GenerateReportDto } from './dto/generate-report.dto';
import { GetChartDataDto } from './dto/get-chart-data.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('generate')
  @RequirePermissions('reports.export')
  async generateReport(@Body() dto: GenerateReportDto, @Res() res: Response) {
    const report = await this.reportsService.generateReport(dto);

    if (dto.format === 'csv' && 'content' in report && report.content) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${report.filename}"`,
      );
      return res.send(report.content);
    }

    return res.json(report);
  }

  @Get('charts')
  @RequirePermissions('reports.view')
  async getChartData(@Query() dto: GetChartDataDto) {
    return this.reportsService.getChartData(dto);
  }

  @Get('statistics')
  @RequirePermissions('reports.view')
  async getOverallStatistics() {
    return this.reportsService.getOverallStatistics();
  }

  @Get('team-performance')
  @RequirePermissions('reports.view')
  async getTeamPerformance() {
    return this.reportsService.getTeamPerformance();
  }

  @Get('projects-statistics')
  @RequirePermissions('reports.view')
  async getProjectsStatistics() {
    return this.reportsService.getProjectsStatistics();
  }
}
