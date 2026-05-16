/**
 * Identify upcoming expenses that could be put on a 0% purchase credit card
 * to spread the cost interest-free.
 */
import { differenceInCalendarMonths } from "date-fns";

export interface SpreadableExpense {
  id: string;
  name: string;
  date: Date;
  amount: number; // pence, positive
}

export interface PurchaseOffer {
  offerId: string;
  accountId: string;
  cardName: string;
  availableHeadroom: number; // pence
  promoEndDate: Date;
  feePercent: number; // typically 0 for purchase offers
}

export interface SpreadSuggestion {
  expenseId: string;
  expenseName: string;
  expenseDate: Date;
  amount: number;
  offerId: string;
  cardName: string;
  monthsToPayoff: number;
  monthlyPaymentRequired: number; // pence
  feePaid: number;
}

/**
 * For each expense, recommend the best offer (longest payoff window, lowest fee)
 * given the user's max monthly payment they're willing to commit.
 */
export function suggestSpread(
  expenses: SpreadableExpense[],
  offers: PurchaseOffer[],
  maxMonthlyPayment: number, // pence; the most user wants to commit per month per item
): SpreadSuggestion[] {
  const suggestions: SpreadSuggestion[] = [];

  for (const expense of expenses) {
    let best: SpreadSuggestion | null = null;
    for (const offer of offers) {
      if (offer.availableHeadroom < expense.amount) continue;
      const monthsAvailable = Math.max(
        1,
        differenceInCalendarMonths(offer.promoEndDate, expense.date),
      );
      if (monthsAvailable <= 0) continue;
      const monthlyRequired = Math.ceil(expense.amount / monthsAvailable);
      if (monthlyRequired > maxMonthlyPayment) continue;
      const feePaid = Math.round((expense.amount * offer.feePercent) / 100);

      const candidate: SpreadSuggestion = {
        expenseId: expense.id,
        expenseName: expense.name,
        expenseDate: expense.date,
        amount: expense.amount,
        offerId: offer.offerId,
        cardName: offer.cardName,
        monthsToPayoff: monthsAvailable,
        monthlyPaymentRequired: monthlyRequired,
        feePaid,
      };

      // Best = longest payoff window with lowest required monthly + lowest fee.
      if (
        !best ||
        candidate.monthlyPaymentRequired < best.monthlyPaymentRequired ||
        (candidate.monthlyPaymentRequired === best.monthlyPaymentRequired &&
          candidate.feePaid < best.feePaid)
      ) {
        best = candidate;
      }
    }
    if (best) suggestions.push(best);
  }

  return suggestions;
}
