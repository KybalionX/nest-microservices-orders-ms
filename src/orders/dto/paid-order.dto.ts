import { IsNumber, IsString, IsUrl } from 'class-validator';

export class PaidOrderDto {
  @IsString()
  stripePaymentId: string;

  @IsNumber()
  orderId: number;

  @IsString()
  @IsUrl()
  receiptUrl: string;
}
