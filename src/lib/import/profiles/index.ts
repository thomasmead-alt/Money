import type { BankCsvProfile } from "../types";

export const monzoProfile: BankCsvProfile = {
  id: "monzo",
  label: "Monzo",
  hasHeader: true,
  delimiter: ",",
  dateColumn: "Date",
  dateFormat: "dd/MM/yyyy",
  descriptionColumn: "Name",
  amountColumn: "Amount",
  merchantColumn: "Name",
};

export const starlingProfile: BankCsvProfile = {
  id: "starling",
  label: "Starling Bank",
  hasHeader: true,
  delimiter: ",",
  dateColumn: "Date",
  dateFormat: "dd/MM/yyyy",
  descriptionColumn: "Reference",
  amountColumn: "Amount (GBP)",
  merchantColumn: "Counter Party",
};

export const barclaysProfile: BankCsvProfile = {
  id: "barclays",
  label: "Barclays",
  hasHeader: true,
  delimiter: ",",
  dateColumn: "Date",
  dateFormat: "dd/MM/yyyy",
  descriptionColumn: "Memo",
  amountColumn: "Amount",
};

export const hsbcProfile: BankCsvProfile = {
  id: "hsbc",
  label: "HSBC",
  hasHeader: false,
  delimiter: ",",
  dateColumn: "0",
  dateFormat: "dd/MM/yyyy",
  descriptionColumn: "1",
  amountColumn: "2",
  columnIndices: { date: 0, description: 1, amount: 2 },
};

export const amexProfile: BankCsvProfile = {
  id: "amex",
  label: "American Express",
  hasHeader: true,
  delimiter: ",",
  dateColumn: "Date",
  dateFormat: "dd/MM/yyyy",
  descriptionColumn: "Description",
  amountColumn: "Amount",
};

export const PROFILES: BankCsvProfile[] = [
  monzoProfile,
  starlingProfile,
  barclaysProfile,
  hsbcProfile,
  amexProfile,
];

export function findProfile(id: string): BankCsvProfile | undefined {
  return PROFILES.find((p) => p.id === id);
}
