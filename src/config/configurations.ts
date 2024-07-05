import { AppConfig } from "./configurations.interface"

export default (): AppConfig => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    host: process.env.MONGO_HOST,
    port: parseInt(process.env.MONGO_PORT, 10) || 27017,
    username: process.env.MONGO_INITDB_ROOT_USERNAME,
    password: process.env.MONGO_INITDB_ROOT_PASSWORD,
    name: process.env.MONGO_DB,
  },
  langflow: {
    url: process.env.LANGFLOW_URL,
    apiKey: process.env.LANGFLOW_API_KEY,
    stream: process.env.LANGFLOW_STREAM === "true",
  },
})
