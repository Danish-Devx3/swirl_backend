/**
 * Script to sync user interactions from User Service to AI Service
 * This can be run as a scheduled job (cron) or via message queue
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const prisma = new PrismaClient();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY || '';

async function syncInteractionsToAI() {
  console.log('🔄 Starting interaction sync to AI service...');

  // Get unsynced interactions (batch of 1000)
  const unsyncedInteractions = await prisma.userInteraction.findMany({
    where: { syncedToAI: false },
    take: 1000,
    orderBy: { timestamp: 'asc' },
  });

  if (unsyncedInteractions.length === 0) {
    console.log('✅ No interactions to sync');
    return;
  }

  console.log(`📊 Found ${unsyncedInteractions.length} interactions to sync`);

  // Group by user for batch processing
  const interactionsByUser = new Map<string, typeof unsyncedInteractions>();
  for (const interaction of unsyncedInteractions) {
    if (!interactionsByUser.has(interaction.userId)) {
      interactionsByUser.set(interaction.userId, []);
    }
    interactionsByUser.get(interaction.userId)!.push(interaction);
  }

  let syncedCount = 0;
  let failedCount = 0;

  // Sync each user's interactions
  for (const [userId, interactions] of interactionsByUser) {
    try {
      // Send to AI service
      const response = await axios.post(
        `${AI_SERVICE_URL}/interactions/batch`,
        {
          userId,
          interactions: interactions.map((i) => ({
            itemId: i.itemId,
            interactionType: i.interactionType,
            timestamp: i.timestamp,
            metadata: i.metadata,
          })),
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(AI_SERVICE_API_KEY && { 'X-API-Key': AI_SERVICE_API_KEY }),
          },
          timeout: 30000,
        },
      );

      if (response.status === 200) {
        // Mark as synced
        const interactionIds = interactions.map((i) => i.id);
        await prisma.userInteraction.updateMany({
          where: { id: { in: interactionIds } },
          data: {
            syncedToAI: true,
            syncedAt: new Date(),
          },
        });

        syncedCount += interactions.length;
        console.log(`✅ Synced ${interactions.length} interactions for user ${userId}`);
      }
    } catch (error: any) {
      failedCount += interactions.length;
      console.error(
        `❌ Failed to sync interactions for user ${userId}:`,
        error.message,
      );
    }
  }

  console.log(`\n📊 Sync Summary:`);
  console.log(`   ✅ Synced: ${syncedCount}`);
  console.log(`   ❌ Failed: ${failedCount}`);
  console.log(`   📦 Total: ${unsyncedInteractions.length}`);
}

// Run sync
syncInteractionsToAI()
  .catch((error) => {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

