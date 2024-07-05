import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Document, Schema as MongooseSchema, Types } from "mongoose"
import { Contact as WAContact } from "@whiskeysockets/baileys"

export type ContactDocument = Contact & Document

@Schema({ timestamps: true })
export class Contact implements WAContact {
  @Prop({ type: MongooseSchema.Types.ObjectId })
  _id: Types.ObjectId

  @Prop({ required: true, unique: true })
  id: string

  @Prop()
  imgUrl?: string

  @Prop()
  name?: string

  @Prop()
  notify?: string

  @Prop()
  status?: string

  @Prop()
  verifiedName?: string

  @Prop({ type: Date, default: Date.now })
  createdAt: Date

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date
}

export const ContactSchema = SchemaFactory.createForClass(Contact)
