import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { Services, envs } from 'src/config';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: Services.NATS_SERVICE,
        transport: Transport.NATS,
        options: {
          servers: envs.natsServers,
        },
      },
    ]),
  ],
  exports: [
    ClientsModule.register([
      {
        name: Services.NATS_SERVICE,
        transport: Transport.NATS,
        options: {
          servers: envs.natsServers,
        },
      },
    ]),
  ],
})
export class NatsModule {}
