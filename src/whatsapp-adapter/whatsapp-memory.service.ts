import { Injectable, Logger } from "@nestjs/common"
import { makeInMemoryStore, WASocket } from "@whiskeysockets/baileys"
import { InjectModel } from "@nestjs/mongoose"
import { Model } from "mongoose"
import { Chat as ChatModel, ChatDocument } from "./schemas/chat.schema"
import { Message, MessageDocument } from "./schemas/message.schema"
import {
  Contact as ContactModel,
  ContactDocument,
} from "./schemas/contact.schema"

@Injectable()
export class WhatsappMemoryService {
  private readonly logger = new Logger(WhatsappMemoryService.name)
  public store: ReturnType<typeof makeInMemoryStore>

  constructor(
    @InjectModel(ChatModel.name) private chatModel: Model<ChatDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(ContactModel.name)
    private contactModel: Model<ContactDocument>,
  ) {}

  async initMemoryStore(sock: WASocket) {
    this.store = makeInMemoryStore({})
    this.store.readFromFile("./baileys_store.json")
    setInterval(() => {
      this.store.writeToFile("./baileys_store.json")
      this.logger.log("Memory store written to file.")
    }, 60 * 1000)
    this.store.bind(sock.ev)
    this.logger.log("Memory store initialized and bound to socket events.")

    sock.ev.on(
      "messaging-history.set",
      async ({ chats = [], contacts = [], messages = [] }) => {
        const messagesDocs = new Map<string, MessageDocument>()
        if (messages.length) {
          messages.forEach(message => {
            messagesDocs.set(
              message.key.remoteJid,
              new this.messageModel({
                key: message.key,
                message: message.message,
                messageTimestamp: message.messageTimestamp,
              }),
            )
          })
        }

        const contactDocs = contacts.map(
          contact => new this.contactModel(contact),
        )

        const savePromises = chats.map(async chat => {
          const messages = chat.messages.map(msg =>
            messagesDocs.get(msg.message.key.remoteJid),
          )
          const contact =
            contactDocs.find(contact => contact.id === chat.id) ||
            new this.contactModel({
              id: chat.id,
              name: chat.messages[0].message.key.fromMe,
            })

          const chatDocument = await this.chatModel.findOne({ id: chat.id })
          chatDocument.messages.find
          return new this.chatModel({
            ...chat,
            messages: messages,
            contact: contact,
          }).save()
        })

        /* await this.persistMessagingHistory(chatDocs, contactDocs) */

        this.logger.log(
          `Synced ${chats.length} chats and ${contacts.length} contacts`,
        )

        this.logger.log("Finished sync of messaging history.")
      },
    )
  }

  private async persistMessagingHistory(
    chatDocs: ChatDocument[],
    contactDocs: ContactDocument[],
  ) {
    if (chatDocs.length) {
      await this.chatModel.bulkWrite(
        chatDocs.map(chat => {
          return {
            updateOne: {
              filter: { id: chat.id },
              update: { $set: chat },
              upsert: true,
            },
          }
        }),
      )
    }

    /*     if (contactDocs.length) {
      await this.contactModel.bulkWrite(
        contactDocs.map(contact => {
          return {
            updateOne: {
              filter: { id: contact.id },
              update: { $set: contact },
              upsert: true,
            },
          }
        }),
      )
    } */
  }
}
