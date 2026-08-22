import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, reputation } from "@/db/schema";
import { eq } from "drizzle-orm";
// genlayer.ts is server-side GenLayer client
import * as genlayer from "@/lib/genlayer";

// Sync data from GenLayer contract to database
export async function POST() {
  try {
    const results = {
      stats: null as genlayer.ContractStats | null,
      config: null as genlayer.ContractConfig | null,
      tasksSynced: 0,
      profilesSynced: 0,
      errors: [] as string[],
    };

    // Get contract stats
    try {
      results.stats = await genlayer.getStats();
    } catch (e) {
      results.errors.push(`Stats: ${e instanceof Error ? e.message : "Unknown error"}`);
    }

    // Get contract config
    try {
      results.config = await genlayer.getConfig();
    } catch (e) {
      results.errors.push(`Config: ${e instanceof Error ? e.message : "Unknown error"}`);
    }

    // Get and sync tasks
    try {
      const taskIds = await genlayer.getTaskIds(0, 50);
      
      for (const taskId of taskIds) {
        try {
          const contractTask = await genlayer.getTask(taskId);
          
          // Check if task exists in DB
          const existing = await db.select().from(tasks).where(eq(tasks.taskId, taskId));
          
          if (existing.length === 0) {
            // Insert new task
            await db.insert(tasks).values({
              taskId: contractTask.task_id,
              client: contractTask.client,
              worker: contractTask.worker,
              title: contractTask.title,
              terms: contractTask.terms,
              reward: String(contractTask.reward),
              status: contractTask.status,
              deadline: contractTask.deadline,
              createdAt: contractTask.created_at,
              acceptedAt: contractTask.accepted_at,
              submittedAt: contractTask.submitted_at,
              reviewDeadline: contractTask.review_deadline,
              resolvedAt: contractTask.resolved_at,
              evidenceUrl: contractTask.evidence_url,
              evidenceNote: contractTask.evidence_note,
              decision: contractTask.decision,
              score: contractTask.score,
              reason: contractTask.reason,
              disputeBond: String(contractTask.dispute_bond),
              disputedAt: contractTask.disputed_at,
              aiVerdict: contractTask.ai_verdict || "",
              aiScore: contractTask.ai_score || 0,
              aiReason: contractTask.ai_reason || "",
              reviewedAt: contractTask.reviewed_at || 0,
            });
          } else {
            // Update existing task
            await db.update(tasks).set({
              worker: contractTask.worker,
              status: contractTask.status,
              acceptedAt: contractTask.accepted_at,
              submittedAt: contractTask.submitted_at,
              reviewDeadline: contractTask.review_deadline,
              resolvedAt: contractTask.resolved_at,
              evidenceUrl: contractTask.evidence_url,
              evidenceNote: contractTask.evidence_note,
              decision: contractTask.decision,
              score: contractTask.score,
              reason: contractTask.reason,
              disputeBond: String(contractTask.dispute_bond),
              disputedAt: contractTask.disputed_at,
            }).where(eq(tasks.taskId, taskId));
          }
          
          results.tasksSynced++;
        } catch (e) {
          results.errors.push(`Task ${taskId}: ${e instanceof Error ? e.message : "Unknown error"}`);
        }
      }
    } catch (e) {
      results.errors.push(`TaskIds: ${e instanceof Error ? e.message : "Unknown error"}`);
    }

    // Sync leaderboard profiles
    try {
      const profiles = await genlayer.getLeaderboard(0, 50);
      
      for (const profile of profiles) {
        try {
          const existing = await db.select().from(reputation).where(eq(reputation.address, profile.address));
          
          if (existing.length === 0) {
            await db.insert(reputation).values({
              address: profile.address,
              jobsCompleted: profile.jobs_completed,
              jobsFailed: profile.jobs_failed,
              disputesOpened: profile.disputes_opened,
              disputesWon: profile.disputes_won,
              disputesLost: profile.disputes_lost,
              totalEarned: String(profile.total_earned),
              totalSpent: String(profile.total_spent),
              reputation: profile.reputation,
            });
          } else {
            await db.update(reputation).set({
              jobsCompleted: profile.jobs_completed,
              jobsFailed: profile.jobs_failed,
              disputesOpened: profile.disputes_opened,
              disputesWon: profile.disputes_won,
              disputesLost: profile.disputes_lost,
              totalEarned: String(profile.total_earned),
              totalSpent: String(profile.total_spent),
              reputation: profile.reputation,
              lastActive: new Date(),
            }).where(eq(reputation.address, profile.address));
          }
          
          results.profilesSynced++;
        } catch (e) {
          results.errors.push(`Profile ${profile.address}: ${e instanceof Error ? e.message : "Unknown error"}`);
        }
      }
    } catch (e) {
      results.errors.push(`Leaderboard: ${e instanceof Error ? e.message : "Unknown error"}`);
    }

    return NextResponse.json({
      success: true,
      contractAddress: genlayer.CONTRACT_ADDRESS,
      results,
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Sync failed" 
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Just read contract stats without syncing
    const stats = await genlayer.getStats();
    const config = await genlayer.getConfig();
    
    return NextResponse.json({
      contractAddress: genlayer.CONTRACT_ADDRESS,
      stats: {
        taskCount: Number(stats.task_count),
        profileCount: Number(stats.profile_count),
        paused: stats.paused,
      },
      config: {
        owner: config.owner,
        paused: config.paused,
        minReward: config.min_reward.toString(),
        minDisputeBond: config.min_dispute_bond.toString(),
        reviewPeriod: Number(config.review_period),
      },
    });
  } catch (error) {
    console.error("Contract read error:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to read contract" 
    }, { status: 500 });
  }
}
