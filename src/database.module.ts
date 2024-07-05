import { Module } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { AppConfig } from "config/configurations.interface"
import configuration from "config/configurations"

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath:
        process.env.NODE_ENV === "production" ? ".env.production" : ".env",
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const dbConfig = configService.get<AppConfig["database"]>("database")
        return {
          uri: `mongodb://${dbConfig.username}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}`,
          dbName: dbConfig.name,
          useNewUrlParser: true,
          useUnifiedTopology: true,
        }
      },
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
