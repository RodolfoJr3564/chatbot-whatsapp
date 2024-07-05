import { Injectable, Logger } from "@nestjs/common"
import { WASocket, proto, Contact as WAContact } from "@whiskeysockets/baileys"
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

  constructor(
    @InjectModel(ChatModel.name) private chatModel: Model<ChatDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(ContactModel.name)
    private contactModel: Model<ContactDocument>,
  ) {}

  async init(sock: WASocket) {
    sock.ev.on(
      "messaging-history.set",
      async ({ chats = [], contacts = [], messages = [] }) => {
        await this.processChats(chats)
        await this.processContacts(contacts)
        await this.processMessages(messages)
      },
    )

    sock.ev.on("messages.upsert", async ({ messages }) => {
      await this.processMessages(messages)
    })

    sock.ev.on("contacts.upsert", async contacts => {
      await this.processContacts(contacts)
    })

    sock.ev.on("chats.upsert", async chats => {
      await this.processChats(chats)
    })

    sock.ev.on("messages.update", async updates => {
      this.logger.log(`Updating ${updates.length} messages`)
      /* for (const { update, key } of updates) {
        await this.messageModel
          .updateOne({ id: key.id }, { $set: update })
          .exec()
      } */
    })

    sock.ev.on("messages.delete", async item => {
      this.logger.log(`Deleting ${item} messages`)
      /* if ("all" in item) {
        await this.messageModel.deleteMany({ "key.remoteJid": item.jid }).exec()
      } else {
        await this.messageModel
          .deleteMany({ id: { $in: item.keys.map(k => k.id) } })
          .exec()
      } */
    })

    sock.ev.on("chats.update", async updates => {
      this.logger.log(`Updating ${updates.length} chats`)
      /* for (const update of updates) {
        await this.chatModel
          .updateOne({ id: update.id }, { $set: update })
          .exec()
      } */
    })

    sock.ev.on("chats.delete", async deletions => {
      this.logger.log(`Deleting ${deletions.length} chats`)
      /* await this.chatModel.deleteMany({ id: { $in: deletions } }).exec() */
    })

    sock.ev.on("contacts.update", async updates => {
      this.logger.log(`Updating ${updates.length} contacts`)
      /* for (const update of updates) {
        await this.contactModel
          .updateOne({ id: update.id }, { $set: update })
          .exec()
      } */
    })
  }

  private async processChats(chats: proto.IConversation[]) {
    this.logger.log(`Processing ${chats.length} chats`)
    /* const chatDocs = chats.map(
      chat =>
        new this.chatModel({
          id: chat.id,
          contact_id: chat.id,
          archived: chat.archived,
          description: chat.description,
          lastMsgTimestamp: chat.lastMsgTimestamp,
        }),
    )

    if (chatDocs.length) {
      await this.chatModel.bulkWrite(
        chatDocs.map(chat => ({
          updateOne: {
            filter: { id: chat.id },
            update: { $set: chat },
            upsert: true,
          },
        })),
      )
    } */
  }

  private async processContacts(contacts: WAContact[]) {
    this.logger.log(`Processing ${contacts.length} contacts`)
    /* const contactDocs = contacts.map(contact => new this.contactModel(contact))

    if (contactDocs.length) {
      await this.contactModel.bulkWrite(
        contactDocs.map(contact => ({
          updateOne: {
            filter: { id: contact.id },
            update: { $set: contact },
            upsert: true,
          },
        })),
      )
    } */
  }

  private async processMessages(messages: proto.IWebMessageInfo[]) {
    this.logger.log(`Processing ${messages.length} messages`)
    /* const messageDocs = messages.map(message => ({
      updateOne: {
        filter: { id: message.key.id },
        update: {
          $set: {
            id: message.key.id,
            key: message.key,
            message: message.message,
            chat_id: message.key.remoteJid,
            messageTimestamp: message.messageTimestamp,
          },
        },
        upsert: true,
      },
    }))

    if (messageDocs.length) {
      await this.messageModel.bulkWrite(messageDocs)
    } */
  }
}
