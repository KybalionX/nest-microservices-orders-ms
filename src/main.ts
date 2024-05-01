import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { envs } from './config/envs';
import { Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const logger = new Logger('Orders MS');

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      logger: logger,
      transport: Transport.NATS,
      options: {
        servers: envs.natsServers,
      },
    },
  );

  await app.listen();
  logger.log(`ORDERS-MS RUNNING ON PORT ${envs.port}`);
}
bootstrap();
