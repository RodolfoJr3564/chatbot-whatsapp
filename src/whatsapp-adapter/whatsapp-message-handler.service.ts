import { Injectable, Logger } from "@nestjs/common"
import {
  WASocket,
  proto,
  WAMessage,
  MessageUpsertType,
  WAPresence,
} from "@whiskeysockets/baileys"
import { HttpService } from "@nestjs/axios"
import { firstValueFrom } from "rxjs"
import {
  Chat,
  ChatStatus,
  MessageType,
  WhatsappChatService,
} from "./whatsapp-chat.service"
import { LangflowOutput } from "./langflow-output.interface"

@Injectable()
export class WhatsappMessageHandlerService {
  private readonly logger = new Logger(WhatsappMessageHandlerService.name)
  private readonly emojiMap: { [key: string]: string } = {
    ":like:": "👍",
    ":thinking:": "🤔",
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
    ":thumbsdown:": "👎",
    ":cry:": "😢",
    ":laugh:": "😂",
    ":wink:": "😉",
    ":sleep:": "😴",
    ":angry:": "😠",
    ":surprise:": "😲",
    ":sweat:": "😅",
    ":music:": "🎵",
    ":cake:": "🎂",
    ":coffee:": "☕",
    ":sun:": "☀️",
    ":moon:": "🌙",
    ":rain:": "🌧️",
    ":snow:": "❄️",
    ":starstruck:": "🤩",
    ":hug:": "🤗",
    ":facepalm:": "🤦",
    ":shrug:": "🤷",
    ":dizzy:": "💫",
    ":sick:": "🤢",
    ":nerd:": "🤓",
    ":robot:": "🤖",
    ":unicorn:": "🦄",
    ":palm_tree:": "🌴",
  }

  constructor(
    private readonly chatService: WhatsappChatService,
    private readonly httpService: HttpService,
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

        if (
          ![
            MessageType.ExtendedText,
            MessageType.Conversation,
            MessageType.Reaction,
          ].includes(msg.type)
        ) {
          this.logger.log(`Ignoring message: ${msg.type} unsupported type.`)
          chat.status = ChatStatus.IGNORED
        }
      },
    )

    this.setMessagesRead(
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
    this.setPresence(sock, "available", chat.chatId)

    const { question, awaitingReply } = this.mapQuestionToContext(chat)

    if (awaitingReply.length === 0) {
      this.logger.log(
        `Ignoring message: ${chat.chatId} has no awaiting reply messages`,
      )
      return
    }

    this.setPresence(sock, "composing", chat.chatId)

    const { outputs } = await this.generateResponse(question)
    const result = outputs.results.message.text

    this.logger.log(`Langflow response: ${JSON.stringify(outputs)}`)
    this.logger.log(`API response: ${result}`)

    const { response, type } = this.parseResponse(result)
    this.logger.log(`Response type: ${type}`)

    if (type.trim() === "reaction") {
      const emoji = this.emojiMap[response] || "🤔"
      this.sendReactionMessage(
        sock,
        chat.chatId,
        emoji,
        chat.messages[chat.messages.length - 1].data.key,
      )
    } else if (type.trim() === "text") {
      this.sendReplyMessage(
        sock,
        chat.chatId,
        response,
        chat.messages[chat.messages.length - 1].data,
      )
    } else {
      this.logger.error(`Unsupported response type from API: ${type}`)
      this.sendReplyMessage(
        sock,
        chat.chatId,
        "Desculpe, houve um erro ao processar sua resposta.",
        chat.messages[chat.messages.length - 1].data,
      )
    }
    chat.status = ChatStatus.REPLIED
    awaitingReply.forEach(msg => (msg.isReplied = true))
  }
  private parseResponse(response: any) {
    const regex = /- type:\s*(\w+)\s*- response:\s*([\s\S]*)/
    const match = response.match(regex)
    this.logger.log(`Match: ${match}`)

    if (match && match[1] && match[2]) {
      return { type: match[1].trim(), response: match[2].trim() }
    } else {
      return { type: "fallback", response: "" }
    }
  }

  private mapQuestionToContext(chat: Chat) {
    const awaitingReply = chat.messages.filter(msg => msg.isReplied === false)

    const lastTeenMessages = chat.messages.slice(-10)

    const question =
      "User last teen chats context: " +
      lastTeenMessages
        .map(
          msg =>
            "\n" +
            msg.timestamp.toUTCString() +
            " | " +
            (msg.isFromMe ? "me" : msg.data.pushName) +
            " | " +
            " > " +
            msg.content,
        )
        .join("\n") +
      "\nNot replied messages yet: " +
      "\n" +
      awaitingReply
        .filter(msg => !msg.isFromMe)
        .map(
          msg =>
            "\n" +
            msg.timestamp.toUTCString() +
            " | " +
            msg.data.pushName +
            " | " +
            "> " +
            msg.content,
        )
        .join("\n") +
      "\n" +
      this.generatePrompting()

    this.logger.log(`Question to reply: \n${question}`)
    return {
      question,
      awaitingReply,
    }
  }

  private generatePrompting() {
    const reactionsList = Object.keys(this.emojiMap).join(", ")
    const reactionEmojis = Object.keys(this.emojiMap)
      .map(name => `:${name}:`)
      .join(", ")

    const prompting = `
      Please respond only in the format identifiable by the following regex: / - type:\\s*(\\w+)\\s*- response:\\s*([\\s\\S]*)/.
      
      Expected Return Format:
      - type: {response_type}
      - response: {user_response}
      
      Supported Return Types: text, reaction
      
      Example return type text:
      - type: text
      - response: Hello!

      Example return type reaction:
      - type: reaction
      - response: :like:
      
      Supported Reactions: ${reactionsList}
      Supported Reaction Emojis: ${reactionEmojis}
      
      Please replace {response_type} with the appropriate response type ("text" or "reaction") and {user_response} with the appropriate response.
      
      Remember:
      - Always include the type and the response.
      - Ensure the response follows the correct format as shown in the examples.
      - Ensure the response is in Portuguese
      - For messages that do not require a meaningful response, send a reaction instead.
      - Use the reaction :thinking: only when you do not understand something
    `

    return prompting
  }

  private async generateResponse(question: string) {
    const apiUrl =
      "http://127.0.0.1:7860/api/v1/run/eb26738f-36d2-47cb-842a-3250247d8611?stream=false"
    const body = {
      input_value: question,
      output_type: "chat",
      input_type: "chat",
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.post<LangflowOutput>(apiUrl, body, {
          headers: {
            "Content-Type": "application/json",
          },
        }),
      )
      return {
        sessionId: data.session_id,
        outputs: data.outputs[0]?.outputs[0],
      }
    } catch (error) {
      this.logger.error(
        `Failed to generate response from API: ${error.response?.data || error.message}`,
      )
      throw new Error("An error occurred while generating response.")
    }
  }

  private setPresence(sock: WASocket, presence: WAPresence, toId: string) {
    this.logger.log(`Set ${presence} presence to ${toId}`)
    sock.sendPresenceUpdate(presence, toId)
  }

  private setMessagesRead(sock: WASocket, keys: proto.IMessageKey[]) {
    this.logger.log(`Set read to ${keys.map(key => key.id).join(", ")}`)
    sock.readMessages(keys)
  }

  private async sendReplyMessage(
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
