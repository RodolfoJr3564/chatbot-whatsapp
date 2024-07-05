export interface DatabaseConfig {
  host: string
  port: number
  username: string
  password: string
  name: string
}

export interface LangFlowConfig {
  url: string
  apiKey: string
  stream: boolean
}

export interface AppConfig {
  port: number
  database: DatabaseConfig
  langflow: LangFlowConfig
}
