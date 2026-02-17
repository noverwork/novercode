use crate::store::{Settings, StoreState};
use serde::{Deserialize, Serialize};
use tauri::State;

pub const DEFAULT_BASE_URL: &str = "https://api.openai.com";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionRequest {
  pub audio_data: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionResponse {
  pub text: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum TranscriptionError {
  MissingApiKey,
  InvalidAudio,
  ApiError(String),
  RateLimited,
}

pub(crate) fn get_openai_config(
  settings: &Settings,
) -> Result<(String, String), TranscriptionError> {
  let api_key = settings
    .llm_api_key
    .clone()
    .filter(|key| !key.trim().is_empty())
    .ok_or(TranscriptionError::MissingApiKey)?;

  let base_url = settings
    .llm_base_url
    .clone()
    .unwrap_or_else(|| DEFAULT_BASE_URL.to_string());

  Ok((api_key, base_url))
}

#[tauri::command]
pub async fn transcribe_audio(
  _state: State<'_, StoreState>,
  request: TranscriptionRequest,
) -> Result<TranscriptionResponse, TranscriptionError> {
  if request.audio_data.is_empty() {
    return Err(TranscriptionError::InvalidAudio);
  }

  Ok(TranscriptionResponse {
    text: "placeholder".to_string(),
  })
}

#[cfg(test)]
mod tests {
  use super::{get_openai_config, TranscriptionError, DEFAULT_BASE_URL};
  use crate::store::Settings;

  #[test]
  fn get_openai_config_returns_key_and_base_url() {
    let settings = Settings {
      llm_api_key: Some("test-key".to_string()),
      llm_base_url: Some("https://example.openai.local".to_string()),
      ..Settings::default()
    };

    let result = get_openai_config(&settings);

    assert_eq!(
      result,
      Ok((
        "test-key".to_string(),
        "https://example.openai.local".to_string()
      ))
    );
  }

  #[test]
  fn get_openai_config_returns_missing_api_key_error() {
    let settings = Settings {
      llm_api_key: Some("".to_string()),
      llm_base_url: Some("https://example.openai.local".to_string()),
      ..Settings::default()
    };

    let result = get_openai_config(&settings);

    assert_eq!(result, Err(TranscriptionError::MissingApiKey));
  }

  #[test]
  fn get_openai_config_uses_default_base_url_when_missing() {
    let settings = Settings {
      llm_api_key: Some("test-key".to_string()),
      llm_base_url: None,
      ..Settings::default()
    };

    let result = get_openai_config(&settings);

    assert_eq!(
      result,
      Ok(("test-key".to_string(), DEFAULT_BASE_URL.to_string()))
    );
  }
}
