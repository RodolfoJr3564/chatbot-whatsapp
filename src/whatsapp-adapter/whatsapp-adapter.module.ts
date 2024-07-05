import { Module } from "@nestjs/common"
import { WhatsappAdapterService } from "./whatsapp-adapter.service"
import { WhatsappAdapterController } from "./whatsapp-adapter.controller"
import { HttpModule } from "@nestjs/axios"
import { WhatsappConnectService } from "./whatsapp-connect.service"
import { WhatsappMessageHandlerService } from "./whatsapp-message-handler.service"
import { WhatsappMemoryService } from "./whatsapp-memory-stream.service"
import { WhatsappChatService } from "./whatsapp-chat.service"
import { MongooseModule } from "@nestjs/mongoose"
import { Contact, ContactSchema } from "whatsapp-adapter/schemas/contact.schema"
import { Chat, ChatSchema } from "whatsapp-adapter/schemas/chat.schema"
import { Message, MessageSchema } from "whatsapp-adapter/schemas/message.schema"

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: Contact.name, schema: ContactSchema },
      { name: Chat.name, schema: ChatSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
  ],
  controllers: [WhatsappAdapterController],
  providers: [
    WhatsappAdapterService,
    WhatsappConnectService,
    WhatsappMessageHandlerService,
    WhatsappMemoryService,
    WhatsappChatService,
  ],
})
export class WhatsappAdapterModule {}
