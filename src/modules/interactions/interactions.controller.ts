import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InteractionsService } from './interactions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InteractionType } from '@prisma/client';

@ApiTags('interactions')
@Controller('interactions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class InteractionsController {
  constructor(private readonly interactionsService: InteractionsService) {}

  @Post()
  @ApiOperation({ summary: 'Record user interaction for ML training' })
  async recordInteraction(
    @Request() req,
    @Body()
    body: {
      interactionType: InteractionType;
      itemId?: number;
      metadata?: Record<string, any>;
    },
  ) {
    return this.interactionsService.recordInteraction(
      req.user.id,
      body.interactionType,
      body.itemId,
      body.metadata,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get user interactions' })
  async getUserInteractions(@Request() req) {
    return this.interactionsService.getUserInteractions(req.user.id);
  }
}

