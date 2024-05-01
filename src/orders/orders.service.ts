import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, PrismaClient } from '@prisma/client';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { Services } from 'src/config/services';
import { firstValueFrom } from 'rxjs';
import { ProductsMsCmd } from 'src/constants/microservices/products-ms/cmds';
import { OrderWithProducts } from './interfaces/order-with-products.interface';
import { PaidOrderDto } from './dto/paid-order.dto';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {
  private readonly loggerr = new Logger(OrdersService.name);

  constructor(
    @Inject(Services.NATS_SERVICE)
    private readonly natsClient: ClientProxy,
  ) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    this.loggerr.log('Database connected');
  }

  async create(createOrderDto: CreateOrderDto) {
    try {
      const productIds = createOrderDto.items.map((item) => item.productId);

      const products: any[] = await firstValueFrom(
        this.natsClient.send(
          { cmd: ProductsMsCmd.VALIDATE_PRODUCTS },
          productIds,
        ),
      );

      const totalAmountFromDto = createOrderDto.items.reduce((_, orderItem) => {
        const price = products.find(
          (product) => product.id === orderItem.productId,
        ).price;

        return price * orderItem.quantity;
      }, 0);

      const totalItems = createOrderDto.items.reduce(
        (acc, orderItem) => acc + orderItem.quantity,
        0,
      );

      const order = await this.order.create({
        data: {
          totalAmount: totalAmountFromDto,
          totalItems,
          status: 'PENDING',
          OrderItem: {
            createMany: {
              data: createOrderDto.items.map((orderItem) => ({
                price: products.find(
                  (product) => product.id === orderItem.productId,
                ).price,
                productId: orderItem.productId,
                quantity: orderItem.quantity,
              })),
            },
          },
        },
        include: {
          OrderItem: {
            select: {
              price: true,
              quantity: true,
              productId: true,
            },
          },
        },
      });

      return {
        ...order,
        OrderItem: order.OrderItem.map((orderItem) => ({
          ...orderItem,
          name: products.find((product) => product.id === orderItem.productId)
            .name,
        })),
      };
    } catch (error) {
      console.log(error);
      throw new RpcException({
        status: error.status,
        message: error.message,
      });
    }
    /* return await this.order.create({
      data: createOrderDto,
    }); */
  }

  async createPaymentSession(orderWithProducts: OrderWithProducts) {
    const paymentSession = await firstValueFrom(
      this.natsClient.send('create.payment.session', {
        orderId: orderWithProducts.id,
        currency: 'usd',
        items: orderWithProducts.OrderItem.map((orderItem) => ({
          name: orderItem.name,
          price: orderItem.price,
          quantity: orderItem.quantity,
        })),
      }),
    );
    return paymentSession;
  }

  async findAll(orderPagination: OrderPaginationDto) {
    const totalPages = await this.order.count({
      where: {
        status: orderPagination.status,
      },
    });

    const currentPage = orderPagination.page;
    const perPage = orderPagination.limit;

    return {
      data: await this.order.findMany({
        skip: (currentPage - 1) * perPage,
        take: perPage,
        where: {
          status: orderPagination.status,
        },
      }),
      meta: {
        total: totalPages,
        page: currentPage,
        lastPage: Math.ceil(totalPages / perPage),
      },
    };
  }

  async findOne(id: number) {
    const order = await this.order.findUnique({
      where: { id },
      include: {
        OrderItem: true,
      },
    });

    if (!order) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Order with id #${id} doesn't exist`,
      });
    }

    const productsIdsFromOrder = order.OrderItem.map(
      (orderItem) => orderItem.productId,
    );

    const productsWithDetails = await firstValueFrom(
      this.natsClient.send(
        { cmd: ProductsMsCmd.VALIDATE_PRODUCTS },
        productsIdsFromOrder,
      ),
    );

    return {
      ...order,
      OrderItem: order.OrderItem.map((orderItem) => ({
        ...orderItem,
        name: productsWithDetails.find(
          (productWithDetail) => productWithDetail.id === orderItem.productId,
        ).name,
      })),
    };
  }

  async updateStatus(id: number, status: OrderStatus) {
    await this.findOne(id);

    return await this.order.update({
      where: { id },
      data: { status: status },
    });
  }

  async paidOrder(paidOrderDto: PaidOrderDto) {
    this.loggerr.log('Paid Order', paidOrderDto);

    const updatedOrder = await this.order.update({
      where: {
        id: paidOrderDto.orderId,
      },
      data: {
        status: OrderStatus.PENDING,
        paid: true,
        paidAt: new Date(),
        stripeChargeId: paidOrderDto.stripePaymentId,
        OrderReceipt: {
          create: {
            receiptUrl: paidOrderDto.receiptUrl,
          },
        },
      },
    });

    return updatedOrder;
  }
}
