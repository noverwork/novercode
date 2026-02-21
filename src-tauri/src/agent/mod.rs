use crate::store::StoreState;
use rig::completion::{Chat, Message};
use rig::providers::openai;
use serde::{Deserialize, Serialize};
use tauri::State;

const DEFAULT_MODEL: &str = "gpt-4o-mini";
const DEFAULT_BASE_URL: &str = "https://api.openai.com/v1";

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

fn get_openai_config(settings: &crate::store::Settings) -> Result<(String, String), &'static str> {
  let api_key = settings.llm_api_key.clone().ok_or("API key not set")?;
  let base_url = DEFAULT_BASE_URL.to_string();
  Ok((api_key, base_url))
}

#[tauri::command]
pub async fn chat(
  state: State<'_, StoreState>,
  request: ChatRequest,
) -> Result<ChatResponse, String> {
  let api_key = {
    let settings = lock_or_recover(&state.settings);

    let (api_key, _base_url) = get_openai_config(&settings)
      .map_err(|_| "LLM API key not configured. Please set it in Settings.".to_string())?;

    api_key
  };

  let model_name = request.model.unwrap_or_else(|| DEFAULT_MODEL.to_string());

  let client = openai::Client::new(&api_key);
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
