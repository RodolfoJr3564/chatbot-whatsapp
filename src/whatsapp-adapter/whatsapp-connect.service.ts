import { Injectable, Logger } from "@nestjs/common"
import makeWASocket, {
  DisconnectReason,
  WASocket,
  useMultiFileAuthState,
  ConnectionState,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys"
import * as fs from "fs"
import * as path from "path"
import * as QRCode from "qrcode"

@Injectable()
export class WhatsappConnectService {
  private readonly logger = new Logger(WhatsappConnectService.name)
  public sock: WASocket
  public qrCode: string

  constructor() {}

  async connectToWhatsApp(retryCount = 5) {
    const authInfoPath = path.resolve("auth_info_baileys")
    if (!fs.existsSync(authInfoPath)) {
      fs.mkdirSync(authInfoPath, { recursive: true })
    }

    const { state, saveCreds } = await useMultiFileAuthState(authInfoPath)

    const { version } = await fetchLatestBaileysVersion()
    this.sock = makeWASocket({
      printQRInTerminal: false,
      auth: state,
      emitOwnEvents: true,
      markOnlineOnConnect: true,
      syncFullHistory: true,
      fireInitQueries: true,
      generateHighQualityLinkPreview: true,
      version,
    })

    this.sock.ev.on("creds.update", saveCreds)

    this.sock.ev.on(
      "connection.update",
      async (update: Partial<ConnectionState>) => {
        const { connection, lastDisconnect, qr } = update

        if (qr) {
          this.logger.log(`QRcode on route: http://localhost:3000/qrcode`)
          this.displayQRCode(qr)
          return
        }

        if (connection === "close") {
          if (lastDisconnect.error.message.includes("(restart required)")) {
            this.logger.log("Restart required, restarting...")
            this.connectToWhatsApp()
            return
          }
          this.logger.error(
            `Connection closed due to ${lastDisconnect?.error ? lastDisconnect.error.message : "unknown error"}, retries left: ${retryCount}`,
          )

          const shouldReconnect =
            (lastDisconnect?.error as any)?.output?.statusCode !==
            DisconnectReason.loggedOut

          if (shouldReconnect && retryCount > 0) {
            setTimeout(() => this.connectToWhatsApp(retryCount - 1), 10000)
          } else if (
            (lastDisconnect?.error as any)?.output?.statusCode ===
            DisconnectReason.loggedOut
          ) {
            this.deleteAuthInfo(authInfoPath)
            this.logger.error(
              "Thats seems to be a logout, deleting auth info. Please reconnect QR code.",
            )
            this.connectToWhatsApp()
          } else if (retryCount === 0) {
            this.logger.error("Max retries reached, exiting...")
            process.exit(1)
          }
        } else if (connection === "open") {
          this.logger.log("Connection opened successfully")
        } else {
          this.logger.log(`Connection update: ${JSON.stringify(update)}`)
        }
      },
    )
  }

  private displayQRCode(qr: string) {
    QRCode.toString(qr, { type: "terminal", small: true }, (err, newQrCode) => {
      if (err) {
        this.logger.error("Failed to generate QR Code")
        return
      }
      console.log(newQrCode)
    })
  }
  private deleteAuthInfo(authInfoPath: string) {
    this.logger.log("Deleting auth info to generate new QR code")
    if (fs.existsSync(authInfoPath)) {
      fs.rmdirSync(authInfoPath, { recursive: true })
    }
  }

  public getQRCode(): string {
    return this.qrCode
  }
}
