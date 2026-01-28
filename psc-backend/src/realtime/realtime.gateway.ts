import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'realtime',
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('RealtimeGateway');

  afterInit(server: Server) {
    this.logger.log('Init');
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  @SubscribeMessage('subscribe_payment')
  handleSubscribePayment(client: Socket, voucherId: string) {
    client.join(`payment_${voucherId}`);
    this.logger.log(`Client ${client.id} subscribed to payment_${voucherId}`);
  }

  emitPaymentUpdate(
    voucherId: string | number,
    status: string,
    additionalData: any = {},
  ) {
    this.server.to(`payment_${voucherId}`).emit('payment_status', {
      voucherId,
      status,
      ...additionalData,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(
      `Emitted payment status '${status}' for voucher ${voucherId}`,
    );
  }
}
