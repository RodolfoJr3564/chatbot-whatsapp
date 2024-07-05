import { Injectable, Logger, OnModuleInit } from "@nestjs/common"
import { WhatsappConnectService } from "./whatsapp-connect.service"
import { WhatsappMessageHandlerService } from "./whatsapp-message-handler.service"
import { WhatsappMemoryService } from "./whatsapp-memory-stream.service"

@Injectable()
export class WhatsappAdapterService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappAdapterService.name)

  constructor(
    private readonly connectService: WhatsappConnectService,
    private readonly messageHandlerService: WhatsappMessageHandlerService,
    private readonly memoryService: WhatsappMemoryService,
  ) {}

  async onModuleInit() {
    await this.connectService.connectToWhatsApp()

    /* this.memoryService.init(this.connectService.sock) */

    this.connectService.sock.ev.on("messages.upsert", message => {
      this.messageHandlerService.handleIncomingMessage(
        this.connectService.sock,
        message,
      )
    })
  }
}
