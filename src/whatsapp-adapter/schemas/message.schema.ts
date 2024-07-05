import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import mongoose, { Document, Schema as MongooseSchema, Types } from "mongoose"
import { proto } from "@whiskeysockets/baileys"

export type MessageDocument = Message & Document

@Schema({ timestamps: true })
export class Message implements proto.IWebMessageInfo {
  @Prop({ type: MongooseSchema.Types.ObjectId })
  _id: Types.ObjectId

  @Prop({ required: true, unique: false })
  id: string

  @Prop({ type: Object, required: true })
  key: proto.IMessageKey

  @Prop({ type: Object })
  message?: proto.IMessage

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true })
  chat_id: Types.ObjectId

  @Prop({ type: mongoose.Schema.Types.BigInt })
  messageTimestamp: number | Long

  @Prop({ type: Date, default: Date.now })
  createdAt: Date

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date

  @Prop({ type: Number })
  msgOrderId?: number | Long
}

export const MessageSchema = SchemaFactory.createForClass(Message)
