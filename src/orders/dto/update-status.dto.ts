import { OrderStatus } from '@prisma/client';
import { IsEnum, IsNumber, IsPositive } from 'class-validator';
import { OrderStatusList } from '../enums/order.enum';

export class UpdateStatusDto {
  @IsNumber()
  @IsPositive()
  id: number;

  @IsEnum(OrderStatusList, {
    message: `Possible status values are ${OrderStatusList}`,
  })
  status: OrderStatus = OrderStatus.PENDING;
}
