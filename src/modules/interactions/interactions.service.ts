import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InteractionType } from '@prisma/client';

@Injectable()
export class InteractionsService {
  constructor(private prisma: PrismaService) {}

  async recordInteraction(
    userId: string,
    interactionType: InteractionType,
    itemId?: number,
    metadata?: Record<string, any>,
  ) {
    const interaction = await this.prisma.userInteraction.create({
      data: {
        userId,
        itemId: itemId || null,
        interactionType,
        metadata: metadata || {},
        syncedToAI: false, // Will be synced to AI service
      },
    });

    // TODO: Emit event to message queue for AI service
    // For now, we'll sync directly or via scheduled job

    return interaction;
  }

  async getUserInteractions(userId: string, limit: number = 100) {
    return this.prisma.userInteraction.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  async getUnsyncedInteractions(limit: number = 1000) {
    return this.prisma.userInteraction.findMany({
      where: { syncedToAI: false },
      take: limit,
      orderBy: { timestamp: 'asc' },
    });
  }

  async markAsSynced(interactionIds: string[]) {
    return this.prisma.userInteraction.updateMany({
      where: { id: { in: interactionIds } },
      data: {
        syncedToAI: true,
        syncedAt: new Date(),
      },
    });
  }
}

