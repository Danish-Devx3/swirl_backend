import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PreferencesService } from './preferences.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('preferences')
@Controller('preferences')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Post()
  @ApiOperation({ summary: 'Set user preference' })
  async setPreference(
    @Request() req,
    @Body() body: { preferenceType: string; preferenceValue: unknown },
  ) {
    return this.preferencesService.setPreference(
      req.user.id,
      body.preferenceType,
      body.preferenceValue,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all user preferences' })
  async getAllPreferences(@Request() req) {
    return this.preferencesService.getAllPreferences(req.user.id);
  }

  @Get(':type')
  @ApiOperation({ summary: 'Get specific preference' })
  async getPreference(@Request() req, @Param('type') type: string) {
    return this.preferencesService.getPreference(req.user.id, type);
  }

  @Delete(':type')
  @ApiOperation({ summary: 'Delete preference' })
  async deletePreference(@Request() req, @Param('type') type: string) {
    return this.preferencesService.deletePreference(req.user.id, type);
  }
}

