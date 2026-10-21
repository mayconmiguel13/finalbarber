export interface SplitInput {
  servicePrice: number;
  onlineDiscountActive: boolean;
  onlineDiscountType: 'PERCENTAGE' | 'FIXED';
  onlineDiscountValue: number;
  barberCommissionRate: number; // e.g. 50 (for 50%)
  platformFee?: number; // e.g. 1.49
  gatewayCost?: number; // e.g. 0.99
}

export interface SplitResult {
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  salonShare: number;
  barberShare: number;
  platformFee: number;
  gatewayFee: number;
}

/**
 * Calculates the exact split under the Lei do Salão-Parceiro (Lei 13.352/2016).
 * Handles online pre-payment discount incentives and SaaS platform take-rate retention.
 */
export function calculateSplit(input: SplitInput): SplitResult {
  const {
    servicePrice,
    onlineDiscountActive,
    onlineDiscountType,
    onlineDiscountValue,
    barberCommissionRate,
    platformFee = 1.49,
    gatewayCost = 0.99,
  } = input;

  // 1. Calculate Discount
  let discountAmount = 0;
  if (onlineDiscountActive) {
    if (onlineDiscountType === 'PERCENTAGE') {
      discountAmount = (servicePrice * onlineDiscountValue) / 100;
    } else {
      discountAmount = Math.min(servicePrice, onlineDiscountValue);
    }
  }

  // 2. Final price charged to customer
  const finalPrice = Math.max(0, servicePrice - discountAmount);

  // 3. Split calculation (calculated on final received value)
  // Barber share = commissionRate% of finalPrice
  const barberRateDecimal = barberCommissionRate / 100;
  const barberShare = Number((finalPrice * barberRateDecimal).toFixed(2));

  // Salon share = remaining after barber share and platform fee
  const salonShare = Number((finalPrice - barberShare).toFixed(2));

  return {
    originalPrice: Number(servicePrice.toFixed(2)),
    discountAmount: Number(discountAmount.toFixed(2)),
    finalPrice: Number(finalPrice.toFixed(2)),
    salonShare,
    barberShare,
    platformFee,
    gatewayFee: gatewayCost,
  };
}
