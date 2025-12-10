import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SearchService } from './search.service';
import { GlobalSearchDto } from './dto/global-search.dto';
import { SearchSuggestionsDto } from './dto/search-suggestions.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('search')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @RequirePermissions('search.use')
  async globalSearch(@Query() dto: GlobalSearchDto, @Request() req) {
    return this.searchService.globalSearch(dto, req.user.id);
  }

  @Get('suggestions')
  async getSearchSuggestions(
    @Query() dto: SearchSuggestionsDto,
    @Request() req,
  ) {
    return this.searchService.getSearchSuggestions(dto, req.user.id);
  }

  @Get('recent')
  async getRecentSearches(@Query('limit') limit: string = '10', @Request() req) {
    return this.searchService.getRecentSearches(req.user.id, parseInt(limit));
  }

  @Post('history')
  async saveSearchHistory(@Body() body: { query: string; type: string }, @Request() req) {
    return this.searchService.saveSearchHistory(
      req.user.id,
      body.query,
      body.type,
    );
  }

  @Delete('history')
  async clearSearchHistory(@Request() req) {
    return this.searchService.clearSearchHistory(req.user.id);
  }
}
