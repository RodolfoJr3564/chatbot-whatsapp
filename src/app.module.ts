import { Module } from "@nestjs/common"
import { AppController } from "./app.controller"
import { AppService } from "./app.service"
import { WhatsappAdapterModule } from "./whatsapp-adapter/whatsapp-adapter.module"
import { EventEmitterModule } from "@nestjs/event-emitter"
import { ConfigModule } from "@nestjs/config"
import { DatabaseModule } from "./database.module"
import configuration from "./config/configurations"

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath:
        process.env.NODE_ENV === "production" ? ".env.production" : ".env",
    }),
    DatabaseModule,
    WhatsappAdapterModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
