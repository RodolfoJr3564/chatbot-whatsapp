import { Controller, Get, Res } from "@nestjs/common"

import * as QRCode from "qrcode"
import { OnEvent } from "@nestjs/event-emitter"
import { Response } from "express-serve-static-core"
import { WhatsappConnectService } from "./whatsapp-connect.service"

@Controller("whatsapp-adapter")
export class WhatsappAdapterController {
  private qrCode: string

  constructor(
    private readonly whatsappConnectService: WhatsappConnectService,
  ) {}

  @OnEvent("qrcode.created")
  handleQrcodeCreatedEvent(qrCode: string) {
    this.qrCode = qrCode
  }

  @Get("qrcode")
  async getQrCode(@Res() response: Response) {
    if (!this.qrCode) {
      return response.status(404).send("QR code not found")
    }

    response.setHeader("Content-Type", "image/png")
    QRCode.toFileStream(response, this.qrCode)
  }
}
