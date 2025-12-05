import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, insert, execute } from '@/lib/db';
import { checkApiRoutePermission } from '@/lib/checkApiRoutePermission';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/blogs/auto-generate/costs/budget - Get budget info
export async function GET(req: NextRequest) {
  try {
    const permission = await checkApiRoutePermission(req);
    if (!permission.allowed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get budget settings
    const dailyBudget = await queryOne<{ settingValue: string }>(
      `SELECT settingValue FROM GenerationSettings WHERE settingKey = 'daily_budget'`
    );
    const monthlyBudget = await queryOne<{ settingValue: string }>(
      `SELECT settingValue FROM GenerationSettings WHERE settingKey = 'monthly_budget'`
    );

    // Get today's spending
    const todaySpent = await queryOne<{ totalCost: number }>(
      `SELECT COALESCE(SUM(totalCost), 0) as totalCost 
       FROM GenerationCost 
       WHERE date = CURDATE()`
    );

    // Get this month's spending
    const monthSpent = await queryOne<{ totalCost: number }>(
      `SELECT COALESCE(SUM(totalCost), 0) as totalCost 
       FROM GenerationCost 
       WHERE YEAR(date) = YEAR(CURDATE()) 
       AND MONTH(date) = MONTH(CURDATE())`
    );

    const dailyBudgetValue = Number(dailyBudget?.settingValue || 100);
    const monthlyBudgetValue = Number(monthlyBudget?.settingValue || 3000);
    const todaySpentValue = Number(todaySpent?.totalCost || 0);
    const monthSpentValue = Number(monthSpent?.totalCost || 0);

    return NextResponse.json({
      dailyBudget: dailyBudgetValue,
      monthlyBudget: monthlyBudgetValue,
      dailySpent: todaySpentValue,
      monthlySpent: monthSpentValue,
      remainingDaily: Math.max(0, dailyBudgetValue - todaySpentValue),
      remainingMonthly: Math.max(0, monthlyBudgetValue - monthSpentValue),
      dailyPercentage: (todaySpentValue / dailyBudgetValue) * 100,
      monthlyPercentage: (monthSpentValue / monthlyBudgetValue) * 100,
    });
  } catch (error: any) {
    console.error('Error fetching budget:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch budget' },
      { status: 500 }
    );
  }
}

// PUT /api/blogs/auto-generate/costs/budget - Update budget
export async function PUT(req: NextRequest) {
  try {
    const permission = await checkApiRoutePermission(req);
    if (!permission.allowed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await auth();
    const adminUserId = (session?.user as any)?.id;

    const body = await req.json();
    const { dailyBudget, monthlyBudget } = body;

    if (dailyBudget !== undefined) {
      await execute(
        `UPDATE GenerationSettings 
         SET settingValue = ?, updatedBy = ?, updatedAt = NOW()
         WHERE settingKey = 'daily_budget'`,
        [String(dailyBudget), adminUserId]
      );
    }

    if (monthlyBudget !== undefined) {
      await execute(
        `UPDATE GenerationSettings 
         SET settingValue = ?, updatedBy = ?, updatedAt = NOW()
         WHERE settingKey = 'monthly_budget'`,
        [String(monthlyBudget), adminUserId]
      );
    }

    // Log audit
    await insert(
      `INSERT INTO SettingsAuditLog (adminUserId, actionType, settingCategory, settingKey, newValue)
       VALUES (?, 'update', 'cost', 'budget', ?)`,
      [adminUserId, JSON.stringify({ dailyBudget, monthlyBudget })]
    );

    return NextResponse.json({
      success: true,
      message: 'Budget updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating budget:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update budget' },
      { status: 500 }
    );
  }
}

