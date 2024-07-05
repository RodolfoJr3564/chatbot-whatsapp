export interface LangflowOutput {
  session_id: string
  outputs: Output[]
}

export interface Output {
  inputs: Inputs
  outputs: OutputDetail[]
}

export interface Inputs {
  input_value: string
}

export interface OutputDetail {
  results: Results
  artifacts: Artifacts
  outputs: OutputMessages
  messages: Message[]
  component_display_name: string
  component_id: string
  used_frozen_result: boolean
}

export interface Results {
  message: MessageData
}

export interface MessageData {
  text_key: string
  data: MessageContent
  default_value: string
  text: string
  sender: string
  sender_name: string
  files: any[]
  session_id: string
  timestamp: string
  flow_id: string
}

export interface MessageContent {
  text: string
  sender: string
  sender_name: string
  session_id: string
  files: any[]
  timestamp: string
  flow_id: string
}

export interface Artifacts {
  message: string
  sender: string
  sender_name: string
  files: any[]
  type: string
}

export interface OutputMessages {
  message: MessageObject
  type: string
}

export interface MessageObject {
  message: MessageContent
  type: string
}

export interface Message {
  message: string
  sender: string
  sender_name: string
  session_id: string
  component_id: string
  files: any[]
  type: string
}
