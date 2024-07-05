import { Injectable, Logger } from "@nestjs/common"
import { WASocket, WAMessage, MessageUpsertType } from "@whiskeysockets/baileys"
import {
  Chat,
  ChatStatus,
  Message,
  MessageType,
  WhatsappChatService,
} from "./whatsapp-chat.service"
import { LangflowService } from "./langflow.service"
import { WhatsappMessageService } from "./whatsapp-message.service"

@Injectable()
export class WhatsappMessageHandlerService {
  private readonly logger = new Logger(WhatsappMessageHandlerService.name)
  readonly supportedMessageTypes = new Set([
    MessageType.ExtendedText,
    MessageType.Conversation,
  ])
  private readonly emojiMap: { [key: string]: string } = {
    ":like:": "👍",
    ":cool:": "😎",
    ":check:": "✔️",
    ":eyes:": "👀",
    ":thanks": "🙏",
    ":smile:": "😊",
    ":love:": "❤️",
    ":clap:": "👏",
    ":fire:": "🔥",
    ":rocket:": "🚀",
    ":star:": "⭐",
    ":trophy:": "🏆",
    ":wave:": "👋",
    ":party:": "🎉",
    ":cry:": "😢",
    ":laugh:": "😂",
    ":wink:": "😉",
    ":angry:": "😠",
    ":surprise:": "😲",
    ":sweat:": "😅",
    ":music:": "🎵",
    ":cake:": "🎂",
    ":coffee:": "☕",
    ":starstruck:": "🤩",
    ":hug:": "🤗",
    ":facepalm:": "🤦",
    ":shrug:": "🤷",
  }

  constructor(
    private readonly chatService: WhatsappChatService,
    private readonly langflowService: LangflowService,
    private readonly messageService: WhatsappMessageService,
  ) {}

  async handleIncomingMessage(
    sock: WASocket,
    message: { messages: WAMessage[]; type: MessageUpsertType },
  ) {
    const chats = await this.chatService.syncMessageChat(
      message.messages,
      (msg, chat) => {
        this.logger.log(`Chat with id ${chat.chatId} synced.`)
        this.logger.log(`Message: ${msg.content} `)

        if (chat.chatId.endsWith("@g.us")) {
          this.logger.log(`Ignoring group message from chatId: ${chat.chatId}`)
          chat.status = ChatStatus.IGNORED
        }

        if (msg.isFromMe) {
          this.logger.log(`"${msg.content}" from ${chat.chatId}`)
          this.logger.log(`Ignoring message from me ${chat.chatId}.`)
          chat.status = ChatStatus.IGNORED
        }

        if (!this.supportedMessageTypes.has(msg.type)) {
          this.logger.log(`Ignoring message: ${msg.type} unsupported type.`)
          chat.status = ChatStatus.IGNORED
        }
      },
    )

    this.messageService.setMessagesRead(
      sock,
      message.messages.map(msg => msg.key),
    )

    chats.forEach(chat => {
      this.logger.log(`Handling chat: ${chat.chatId}`)
      this.handleChat(sock, chat)
    })
  }

  private async handleChat(sock: WASocket, chat: Chat) {
    if (chat.status !== ChatStatus.AWAITING_REPLY) {
      this.logger.log(`Ignoring message: ${chat.chatId} is ${chat.status}`)
      return
    }
    this.messageService.setPresence(sock, "available", chat.chatId)

    const { question, awaitingReply } = this.mapQuestionToContext(chat)

    if (awaitingReply.length === 0) {
      this.logger.log(
        `Ignoring message: ${chat.chatId} has no awaiting reply messages`,
      )
      return
    }

    this.messageService.setPresence(sock, "composing", chat.chatId)

    const langflowResponse = await (
      await this.langflowService.runMainFlow(question)
    )?.outputs.results.message.text

    this.logger.log(`Langflow response: ${JSON.stringify(langflowResponse)}`)

    const { response, type } = this.parseResponse(langflowResponse)
    this.logger.log(`Response type: ${type}`)

    if (type.trim() === "reaction") {
      const emoji = this.emojiMap[response] || "🤔"
      this.messageService.sendReactionMessage(
        sock,
        chat.chatId,
        emoji,
        chat.messages[chat.messages.length - 1].data.key,
      )
    } else if (type.trim() === "text") {
      this.messageService.sendReplyMessage(
        sock,
        chat.chatId,
        response,
        chat.messages[chat.messages.length - 1].data,
      )
    } else {
      this.logger.error(`Unsupported response type from API: ${type}`)
      this.messageService.sendReplyMessage(
        sock,
        chat.chatId,
        "Parece que algo deu errado ao processar sua mensagem. Por favor, tente novamente. 🤔",
        chat.messages[chat.messages.length - 1].data,
      )
    }
    chat.status = ChatStatus.REPLIED
    awaitingReply.forEach(msg => (msg.isReplied = true))
  }

  private parseResponse(response: string) {
    const regex = /- type:\s*(\w+)\s*- response:\s*([\s\S]*)/
    const match = response?.match(regex)
    this.logger.log(`Match: ${match}`)

    if (match && match[1] && match[2]) {
      return { type: match[1].trim(), response: match[2].trim() }
    } else {
      return { type: "fallback", response: "" }
    }
  }

  private mapQuestionToContext(chat: Chat) {
    const formatMessage = msg =>
      "[" +
      msg.timestamp.toUTCString() +
      "]" +
      "[" +
      (msg.isFromMe ? "me" : msg.data.pushName) +
      "]" +
      " " +
      msg.content

    const [history, awaitingReply] = chat.messages.slice(-15).reduce(
      (acc, msg) => {
        if (msg.isFromMe || msg.isReplied) {
          acc[0].push(msg)
        } else if (this.supportedMessageTypes.has(msg.type)) {
          acc[1].push(msg)
        }
        return acc
      },
      [[], []] as [Message[], Message[]],
    )

    const question =
      "last_teen_messages_history: " +
      "\n" +
      history.map(formatMessage).join("\n") +
      "\n" +
      "messages_awaiting_reply: " +
      "\n" +
      awaitingReply.map(formatMessage).join("\n")

    this.logger.log(`Question to reply: \n${question}`)
    return {
      question,
      awaitingReply,
    }
  }
}
