use crate::store::StoreState;
use crate::transcription::get_openai_config;
use rig::completion::{Chat, Message};
use rig::providers::openai;
use serde::{Deserialize, Serialize};
use tauri::State;

const DEFAULT_MODEL: &str = "gpt-4o-mini";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
  pub role: String,
  pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatRequest {
  pub messages: Vec<ChatMessage>,
  #[serde(default)]
  pub model: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ChatResponse {
  pub content: String,
}

fn lock_or_recover<T>(mutex: &std::sync::Mutex<T>) -> std::sync::MutexGuard<'_, T> {
  mutex
    .lock()
    .unwrap_or_else(std::sync::PoisonError::into_inner)
}

fn to_rig_messages(messages: Vec<ChatMessage>) -> Vec<Message> {
  messages
    .into_iter()
    .map(|m| Message {
      role: m.role,
      content: m.content,
    })
    .collect()
}

#[tauri::command]
pub async fn chat(
  state: State<'_, StoreState>,
  request: ChatRequest,
) -> Result<ChatResponse, String> {
  let (api_key, base_url, default_model) = {
    let settings = lock_or_recover(&state.settings);

    let (api_key, base_url) = get_openai_config(&settings)
      .map_err(|_| "LLM API key not configured. Please set it in Settings.".to_string())?;

    let default_model = settings
      .llm_model
      .clone()
      .unwrap_or_else(|| DEFAULT_MODEL.to_string());

    (api_key, base_url, default_model)
  };

  let model_name = request.model.unwrap_or(default_model);

  let client = openai::Client::from_url(&api_key, &base_url);
  let agent = client.agent(&model_name).build();

  let chat_history = to_rig_messages(request.messages);

  let prompt = chat_history
    .last()
    .map(|m| m.content.clone())
    .ok_or("No messages provided")?;

  let response = agent
    .chat(&prompt, chat_history)
    .await
    .map_err(|e| e.to_string())?;

  Ok(ChatResponse { content: response })
}
