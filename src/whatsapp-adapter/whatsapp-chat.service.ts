import { Injectable, Logger } from "@nestjs/common"
import { writeFile } from "fs/promises"
import { WAMessage, downloadMediaMessage } from "@whiskeysockets/baileys"
import pino from "pino"
import { WhatsappConnectService } from "./whatsapp-connect.service"

export enum MessageType {
  Conversation = "conversation",
  Image = "imageMessage",
  Video = "videoMessage",
  Audio = "audioMessage",
  Document = "documentMessage",
  Location = "locationMessage",
  Contact = "contactMessage",
  Reaction = "reactionMessage",
  ExtendedText = "extendedTextMessage",
  Unknown = "unknown",
}

export enum ChatStatus {
  REPLIED = "replied",
  AWAITING_REPLY = "awaiting_reply",
  IGNORED = "ignored",
  ARCHIVED = "archived",
}

export class Message {
  constructor(
    public type: MessageType,
    public content: string,
    public timestamp: Date,
    public data: WAMessage,
    public isFromMe: boolean = false,
    public isReplied: boolean = false,
    public transcription?: string,
  ) {}
}

export class Chat {
  public messages: Message[] = []

  constructor(
    public chatId: string,
    public status: ChatStatus = ChatStatus.AWAITING_REPLY,
  ) {}
}

@Injectable()
export class WhatsappChatService {
  private readonly logger = new Logger(WhatsappChatService.name)
  private chats: Map<string, Chat> = new Map()

  constructor(private readonly connectService: WhatsappConnectService) {}

  async syncMessageChat(
    messages: WAMessage[],
    callback: (message: Message, chat: Chat) => void = () => {},
  ) {
    const chats = messages.map(async message => {
      const chatId = message.key.remoteJid
      const messageTimestamp = message.messageTimestamp || new Date().getTime()

      let chat = this.chats.get(chatId)
      if (!chat) {
        chat = new Chat(chatId)
        this.chats.set(chatId, chat)
      }

      chat.status = ChatStatus.AWAITING_REPLY

      const messageType = this.identifyMessageType(message)
      this.logger.log(`Identified message type: ${messageType}`)
      const msg = new Message(
        messageType,
        "",
        new Date(Number(messageTimestamp)),
        message,
        message.key.fromMe ?? false,
      )

      if (messageType === MessageType.ExtendedText) {
        msg.content = message.message[MessageType.ExtendedText].text || ""
      } else if (messageType === MessageType.Conversation) {
        msg.content = message.message[MessageType.Conversation] || ""
      } else if (messageType === MessageType.Reaction) {
        msg.content = message.message[MessageType.Reaction].text || ""
      } else if (this.isMediaMessage(messageType)) {
        const filename = await this.handleMediaMessage(message, messageType)
        // TODO: Implement transcription
        this.logger.log(`Transcribing ${messageType} message`)
        this.logger.error(`Not implemented yet.`)
        msg.content = filename
      } else {
        this.logger.error(`Unknown message type: ${messageType}`)
        this.logger.error(`Message: ${JSON.stringify(message)}`)
      }

      chat.messages.push(msg)

      callback(msg, chat)
      return chat
    })

    const result = await Promise.allSettled(chats)

    const [fulfilledChats, errors] = result.reduce<
      [PromiseFulfilledResult<Chat>["value"][], PromiseRejectedResult[]]
    >(
      (acc, curr) => {
        if (curr.status === "fulfilled") {
          acc[0].push(curr.value)
        } else {
          acc[1].push(curr)
        }
        return acc
      },
      [[], []],
    )

    errors.forEach(error => {
      this.logger.error(`Error syncing chat: ${error.reason}`)
    })

    return fulfilledChats
  }

  private identifyMessageType(msg: WAMessage): MessageType {
    if (!msg.message) {
      return MessageType.Unknown
    }

    const mapMessageType: { [key: string]: MessageType } = {
      conversation: MessageType.Conversation,
      imageMessage: MessageType.Image,
      videoMessage: MessageType.Video,
      audioMessage: MessageType.Audio,
      documentMessage: MessageType.Document,
      locationMessage: MessageType.Location,
      contactMessage: MessageType.Contact,
      reactionMessage: MessageType.Reaction,
      extendedTextMessage: MessageType.ExtendedText,
    }

    const messageType = Object.keys(msg.message).find(
      key => key in mapMessageType,
    ) as keyof typeof mapMessageType

    return mapMessageType[messageType] || MessageType.Unknown
  }

  private isMediaMessage(messageType: MessageType): boolean {
    return [
      MessageType.Image,
      MessageType.Video,
      MessageType.Audio,
      MessageType.Document,
    ].includes(messageType)
  }

  private async handleMediaMessage(
    message: WAMessage,
    messageType: MessageType,
  ) {
    try {
      const buffer = await downloadMediaMessage(
        message,
        "buffer",
        {},
        {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          logger: pino(),
          reuploadRequest: this.connectService.sock.updateMediaMessage,
        },
      )
      const filename = this.getMediaFilename(message, messageType)
      await writeFile(filename, buffer)
      this.logger.log(`${messageType} saved to ${filename}`)
      return filename
    } catch (error) {
      this.logger.error(
        `Failed to download ${messageType} message: ${error.message}`,
      )
    }
  }

  private getMediaFilename(
    message: WAMessage,
    messageType: MessageType,
  ): string {
    const extension = this.getMediaExtension(messageType)
    return `./medias/${message.key.id}.${extension}`
  }

  private getMediaExtension(messageType: MessageType): string {
    switch (messageType) {
      case MessageType.Image:
        return "jpeg"
      case MessageType.Video:
        return "mp4"
      case MessageType.Audio:
        return "mp3"
      case MessageType.Document:
        return "pdf"
      default:
        return "bin"
    }
  }
}
