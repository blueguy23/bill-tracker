export interface PaymentRecord {
  _id: string;
  billId: string;
  billName: string;
  amount: number;
  paidAt: Date;
}

export interface PaymentResponse {
  _id: string;
  billId: string;
  billName: string;
  amount: number;
  paidAt: string; // ISO string
}

export interface CreatePaymentDto {
  billId: string;
  billName: string;
  amount: number;
}
