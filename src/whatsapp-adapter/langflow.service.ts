// src/langflow/langflow.service.ts

import { Injectable, Logger } from "@nestjs/common"
import { HttpService } from "@nestjs/axios"
import { ConfigService } from "@nestjs/config"
import { firstValueFrom } from "rxjs"
import { LangflowOutput, OutputDetail } from "./langflow-output.interface"
import { LangFlowConfig } from "../config/configurations.interface"

@Injectable()
export class LangflowService {
  private baseURL: string
  private apiKey: string
  private mainFlowId: string
  private readonly logger = new Logger(LangflowService.name)

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const langflowConfig = this.configService.get<LangFlowConfig>("langflow")
    this.baseURL = langflowConfig.url
    this.apiKey = langflowConfig.apiKey
    this.mainFlowId = langflowConfig.mainFlowId
  }

  private async post(
    endpoint: string,
    body: Record<string, unknown>,
  ): Promise<LangflowOutput> {
    const url = `${this.baseURL}${endpoint}`
    const headers = {
      "Content-Type": "application/json",
      ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.post<LangflowOutput>(url, body, { headers }),
      )
      return data
    } catch (error) {
      this.logger.error(
        `Request Error: ${error.response?.data || error.message}`,
      )
      throw new Error("An error occurred while making the API request.")
    }
  }

  async runMainFlow(
    question: string,
    stream = false,
  ): Promise<{ sessionId: string; outputs: OutputDetail }> {
    const endpoint = "/api/v1/run" + `/${this.mainFlowId}` + `?stream=${stream}`
    const body = {
      input_value: question,
      output_type: "chat",
      input_type: "chat",
    }

    try {
      const data = await this.post(endpoint, body)
      return {
        sessionId: data.session_id,
        outputs: data.outputs[0]?.outputs[0],
      }
    } catch (error) {
      this.logger.error(
        `Failed to generate response from API: ${JSON.stringify(error.response?.data) || JSON.stringify(error.message)}`,
      )
    }
  }
}
