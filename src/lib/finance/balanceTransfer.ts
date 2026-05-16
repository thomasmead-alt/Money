/**
 * Greedy balance-transfer optimiser. For a single user with <10 cards a
 * proper LP/ILP is overkill — rank source debts by APR descending and
 * destination offers by effective APR ascending, then allocate greedily
 * up to each card's headroom.
 */

export interface DebtSource {
  accountId: string;
  name: string;
  balance: number; // pence, positive number representing debt
  apr: number; // current APR for the unpaid portion (post any current promo)
}

export interface DestinationOffer {
  offerId: string;
  accountId: string;
  name: string; // e.g. "Barclaycard 0% BT (Aug 2027)"
  availableHeadroom: number; // pence (creditLimit − balance − buffer)
  feePercent: number; // e.g. 3.5
  promoApr: number; // typically 0
  promoMonths: number;
}

export interface TransferMove {
  fromAccountId: string;
  fromName: string;
  toAccountId: string;
  toOfferId: string;
  toName: string;
  amount: number; // pence transferred
  fee: number; // pence
  monthlySaving: number; // pence saved per month vs leaving in place
  totalSaving: number; // over promo period, net of fee
}

export interface OptimiserResult {
  moves: TransferMove[];
  totalSaving: number; // pence
  totalFees: number;
  unmovedDebt: number;
  warnings: string[];
}

const BUFFER_FRACTION = 0.05;

export function optimiseBalanceTransfers(
  sources: DebtSource[],
  offers: DestinationOffer[],
): OptimiserResult {
  // Effective monthly cost of using an offer per £1 transferred:
  //    feeCost = feePercent/100 amortised over promoMonths
  //    interestCost = promoApr/100/12 (usually 0)
  // We rank offers ascending by feeCost+interestCost.
  const rankedOffers = offers
    .slice()
    .filter((o) => o.availableHeadroom > 0 && o.promoMonths > 0)
    .map((o) => ({
      ...o,
      headroomLeft: Math.floor(o.availableHeadroom * (1 - BUFFER_FRACTION)),
      effectiveAnnualRate:
        o.promoApr + (o.feePercent * 12) / o.promoMonths,
    }))
    .sort((a, b) => a.effectiveAnnualRate - b.effectiveAnnualRate);

  // Sources ranked by APR descending so the most expensive debt is moved first.
  const rankedSources = sources
    .slice()
    .filter((s) => s.balance > 0 && s.apr > 0)
    .map((s) => ({ ...s, remaining: s.balance }))
    .sort((a, b) => b.apr - a.apr);

  const moves: TransferMove[] = [];
  let totalFees = 0;
  let totalSaving = 0;
  const warnings: string[] = [];

  for (const offer of rankedOffers) {
    if (offer.headroomLeft <= 0) continue;
    for (const source of rankedSources) {
      if (source.remaining <= 0) continue;
      if (source.accountId === offer.accountId) continue; // can't move to itself

      const move = Math.min(source.remaining, offer.headroomLeft);
      if (move <= 0) continue;

      const fee = Math.round((move * offer.feePercent) / 100);
      // Monthly interest at current APR on `move` if left in place.
      const monthlyInterestSaved = Math.round(
        (move * source.apr) / 100 / 12,
      );
      // Less the promo APR (usually 0) on the new card.
      const monthlyInterestNew = Math.round(
        (move * offer.promoApr) / 100 / 12,
      );
      const monthlySaving = Math.max(
        0,
        monthlyInterestSaved - monthlyInterestNew,
      );
      const totalForMove =
        monthlySaving * offer.promoMonths - fee;

      moves.push({
        fromAccountId: source.accountId,
        fromName: source.name,
        toAccountId: offer.accountId,
        toOfferId: offer.offerId,
        toName: offer.name,
        amount: move,
        fee,
        monthlySaving,
        totalSaving: totalForMove,
      });

      totalFees += fee;
      totalSaving += totalForMove;

      source.remaining -= move;
      offer.headroomLeft -= move;
      if (offer.headroomLeft <= 0) break;
    }
  }

  const unmovedDebt = rankedSources.reduce((s, x) => s + x.remaining, 0);
  if (unmovedDebt > 0) {
    warnings.push(
      "Not enough offer headroom to cover all debt — consider applying for additional BT cards.",
    );
  }

  return { moves, totalSaving, totalFees, unmovedDebt, warnings };
}
