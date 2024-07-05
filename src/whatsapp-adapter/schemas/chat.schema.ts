import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import mongoose, { Document, Schema as MongooseSchema, Types } from "mongoose"
import { ContactDocument } from "./contact.schema"
import { MessageDocument } from "./message.schema"
import { proto, Contact as WAContact } from "@whiskeysockets/baileys"

export type ChatDocument = Chat & Document

export interface IHistorySyncMsg {
  message?: proto.IWebMessageInfo | null

  msgOrderId?: number | Long | null
}

@Schema({ timestamps: true })
export class Chat implements Omit<proto.IConversation, "createdAt"> {
  @Prop({ type: MongooseSchema.Types.ObjectId })
  _id: Types.ObjectId

  @Prop({ required: true, unique: true })
  id: string

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Contact", required: true })
  contact_id: Types.ObjectId

  @Prop({ type: Object, ref: "Contact" })
  contactDocs: ContactDocument

  @Prop({ type: Object, required: true })
  contact: WAContact

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: "Message" }] })
  message_ids: Types.ObjectId[]

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: "Message" }] })
  messagesDocs: MessageDocument[]

  @Prop({ type: [Object], required: true })
  messages?: proto.IHistorySyncMsg[]

  @Prop()
  archived?: boolean

  @Prop()
  description?: string

  @Prop({ type: mongoose.Schema.Types.BigInt })
  lastMsgTimestamp?: number | Long

  @Prop({ type: Date, default: Date.now })
  createdAt: Date

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date
}

export const ChatSchema = SchemaFactory.createForClass(Chat)
