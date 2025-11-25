import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getClientIp } from '@/lib/ip-utils';
import getDynamoDB, { TABLES } from '@/lib/dynamodb';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    const ip = getClientIp(request);
    
    let userId: string;
    if (user) {
      userId = user.sub;
    } else {
      userId = `ip-${ip}`;
    }

    const ipUserId = `ip-${ip}`;

    // Get current env vars
    const envMaxSearches = process.env.RATE_LIMIT_MAX_SEARCHES;
    const envWindowHours = process.env.RATE_LIMIT_WINDOW_HOURS;

    // Get what the code is actually using (parsed at module load)
    // We need to re-parse to show current state
    const currentMaxSearches = parseInt(envMaxSearches || '10', 10);
    const currentWindowHours = parseInt(envWindowHours || '12', 10);

    const db = await getDynamoDB();
    const now = new Date();
    const windowMs = currentWindowHours * 60 * 60 * 1000;

    // Get user rate limit data
    const userLimitResult = await db.send(
      new GetCommand({
        TableName: TABLES.RATE_LIMITS,
        Key: { userId },
      })
    );

    // Get IP rate limit data
    const ipLimitResult = await db.send(
      new GetCommand({
        TableName: TABLES.RATE_LIMITS,
        Key: { userId: ipUserId },
      })
    );

    const userItem = userLimitResult.Item as any;
    const ipItem = ipLimitResult.Item as any;

    let userLimitInfo: any = null;
    let ipLimitInfo: any = null;

    if (userItem) {
      const windowStartTime = new Date(userItem.windowStart);
      const elapsed = now.getTime() - windowStartTime.getTime();
      const isExpired = elapsed >= windowMs;

      userLimitInfo = {
        exists: true,
        rawItem: userItem,
        searchCount: userItem.searchCount || 0,
        windowStart: userItem.windowStart,
        resetAt: userItem.resetAt,
        elapsedMs: elapsed,
        elapsedHours: (elapsed / (60 * 60 * 1000)).toFixed(2),
        isExpired,
        wouldExceed: (userItem.searchCount || 0) + 1 > currentMaxSearches,
        remaining: Math.max(0, currentMaxSearches - (userItem.searchCount || 0)),
      };
    } else {
      userLimitInfo = {
        exists: false,
        searchCount: 0,
        wouldExceed: false,
        remaining: currentMaxSearches,
      };
    }

    if (ipItem) {
      const windowStartTime = new Date(ipItem.windowStart);
      const elapsed = now.getTime() - windowStartTime.getTime();
      const isExpired = elapsed >= windowMs;

      ipLimitInfo = {
        exists: true,
        rawItem: ipItem,
        searchCount: ipItem.searchCount || 0,
        windowStart: ipItem.windowStart,
        resetAt: ipItem.resetAt,
        elapsedMs: elapsed,
        elapsedHours: (elapsed / (60 * 60 * 1000)).toFixed(2),
        isExpired,
        wouldExceed: (ipItem.searchCount || 0) + 1 > currentMaxSearches,
        remaining: Math.max(0, currentMaxSearches - (ipItem.searchCount || 0)),
      };
    } else {
      ipLimitInfo = {
        exists: false,
        searchCount: 0,
        wouldExceed: false,
        remaining: currentMaxSearches,
      };
    }

    // Check what would actually block
    const userWouldBlock = userLimitInfo.wouldExceed;
    const ipWouldBlock = ipLimitInfo.wouldExceed && user && userId !== ipUserId;
    const wouldBlock = userWouldBlock || ipWouldBlock;

    return NextResponse.json({
      debug: {
        timestamp: now.toISOString(),
        userId,
        ip,
        ipUserId,
        isAuthenticated: !!user,
      },
      environment: {
        RATE_LIMIT_MAX_SEARCHES: envMaxSearches || '10 (default)',
        RATE_LIMIT_WINDOW_HOURS: envWindowHours || '12 (default)',
        currentMaxSearches,
        currentWindowHours,
        windowMs,
      },
      userLimit: userLimitInfo,
      ipLimit: ipLimitInfo,
      result: {
        userWouldBlock,
        ipWouldBlock,
        wouldBlock,
        blockedBy: userWouldBlock ? 'user' : ipWouldBlock ? 'ip' : null,
      },
    });
  } catch (error: any) {
    logger.error('[Debug Rate Limit] Error:', error);
    
    // Check if it's a table not found error
    if (error.name === 'ResourceNotFoundException') {
      return NextResponse.json(
        {
          error: 'DynamoDB table not found',
          details: error.message,
          tableName: TABLES.RATE_LIMITS,
          solution: 'Run: npm run create-tables',
          environment: {
            RATE_LIMIT_MAX_SEARCHES: process.env.RATE_LIMIT_MAX_SEARCHES || '10 (default)',
            RATE_LIMIT_WINDOW_HOURS: process.env.RATE_LIMIT_WINDOW_HOURS || '12 (default)',
            DYNAMODB_RATE_LIMITS_TABLE: process.env.DYNAMODB_RATE_LIMITS_TABLE || 'loca-rate-limits (default)',
          },
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      {
        error: 'Failed to debug rate limit',
        details: error.message || String(error),
        errorName: error.name,
        tableName: TABLES.RATE_LIMITS,
      },
      { status: 500 }
    );
  }
}

