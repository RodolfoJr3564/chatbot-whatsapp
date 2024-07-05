import { Injectable, Logger } from "@nestjs/common"
import { WASocket, proto, WAMessage, WAPresence } from "@whiskeysockets/baileys"

@Injectable()
export class WhatsappMessageService {
  private readonly logger = new Logger(WhatsappMessageService.name)

  setPresence(sock: WASocket, presence: WAPresence, toId: string) {
    this.logger.log(`Set ${presence} presence to ${toId}`)
    sock.sendPresenceUpdate(presence, toId)
  }

  setMessagesRead(sock: WASocket, keys: proto.IMessageKey[]) {
    this.logger.log(`Set read to ${keys.map(key => key.id).join(", ")}`)
    sock.readMessages(keys)
  }

  async sendReplyMessage(
    sock: WASocket,
    jid: string,
    message: string,
    quotedMessage: WAMessage,
  ) {
    const options = quotedMessage
      ? {
          quoted: quotedMessage,
        }
      : {}

    if (typeof message === "string") {
      await sock.sendMessage(jid, { text: message }, options)
    } else {
      this.logger.error("Message is not a string.")
    }
  }

  async sendReactionMessage(
    sock: WASocket,
    jid: string,
    text: string,
    messageKey: any,
  ) {
    await sock.sendMessage(jid, { react: { text, key: messageKey } })
  }
}
