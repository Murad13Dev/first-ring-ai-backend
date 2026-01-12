/**
 * Billing Utilities
 * Handles overage calculations and billing logic for subscription plans
 */

export interface OverageCalculation {
  usedMinutes: number;
  planLimit: number;
  overageMinutes: number;
  overageRate: number;
  overageCharges: number;
  isOverLimit: boolean;
}

/**
 * Calculate overage charges for call minutes exceeding plan limit
 *
 * @param usedMinutes - Total minutes used in billing period
 * @param planLimit - Minutes included in plan
 * @param overageRate - Cost per minute for overage ($0.50-$0.75)
 * @returns Overage calculation details
 */
export function calculateOverageCharges(
  usedMinutes: number,
  planLimit: number,
  overageRate: number
): OverageCalculation {
  const overageMinutes = Math.max(0, usedMinutes - planLimit);
  const overageCharges = Number((overageMinutes * overageRate).toFixed(2));

  return {
    usedMinutes,
    planLimit,
    overageMinutes,
    overageRate,
    overageCharges,
    isOverLimit: overageMinutes > 0,
  };
}

/**
 * Calculate total monthly bill including plan price and overage charges
 *
 * @param planPrice - Monthly subscription price
 * @param overageCharges - Overage charges for the period
 * @returns Total amount due
 */
export function calculateTotalBill(
  planPrice: number,
  overageCharges: number
): number {
  return Number((planPrice + overageCharges).toFixed(2));
}

/**
 * Format overage rate for display
 *
 * @param rate - Rate per minute
 * @returns Formatted string (e.g., "$0.75/min")
 */
export function formatOverageRate(rate: number): string {
  return `$${rate.toFixed(2)}/min`;
}

/**
 * Calculate percentage of plan usage
 *
 * @param usedMinutes - Minutes used
 * @param planLimit - Plan limit
 * @returns Percentage (0-100+)
 */
export function calculateUsagePercentage(
  usedMinutes: number,
  planLimit: number
): number {
  if (planLimit === 0) return 0;
  return Number(((usedMinutes / planLimit) * 100).toFixed(1));
}

/**
 * Check if usage is approaching limit (80%+)
 *
 * @param usedMinutes - Minutes used
 * @param planLimit - Plan limit
 * @returns True if usage is at or above 80%
 */
export function isApproachingLimit(
  usedMinutes: number,
  planLimit: number
): boolean {
  const percentage = calculateUsagePercentage(usedMinutes, planLimit);
  return percentage >= 80;
}

/**
 * Get usage status for display
 *
 * @param usedMinutes - Minutes used
 * @param planLimit - Plan limit
 * @returns Status object with color and message
 */
export function getUsageStatus(
  usedMinutes: number,
  planLimit: number
): { status: 'safe' | 'warning' | 'exceeded'; color: string; message: string } {
  const percentage = calculateUsagePercentage(usedMinutes, planLimit);

  if (percentage >= 100) {
    return {
      status: 'exceeded',
      color: 'red',
      message: `Usage limit exceeded by ${usedMinutes - planLimit} minutes`,
    };
  }

  if (percentage >= 80) {
    return {
      status: 'warning',
      color: 'orange',
      message: `Approaching usage limit (${percentage}%)`,
    };
  }

  return {
    status: 'safe',
    color: 'green',
    message: `Within usage limit (${percentage}%)`,
  };
}

/**
 * Generate invoice line items for billing period
 *
 * @param planName - Plan name
 * @param planPrice - Monthly price
 * @param overageCalculation - Overage calculation details
 * @returns Array of line items
 */
export function generateInvoiceLineItems(
  planName: string,
  planPrice: number,
  overageCalculation: OverageCalculation
): Array<{ description: string; amount: number }> {
  const lineItems = [
    {
      description: `${planName} - Monthly Subscription`,
      amount: planPrice,
    },
  ];

  if (overageCalculation.isOverLimit) {
    lineItems.push({
      description: `Overage Usage - ${overageCalculation.overageMinutes} minutes @ ${formatOverageRate(overageCalculation.overageRate)}`,
      amount: overageCalculation.overageCharges,
    });
  }

  return lineItems;
}
