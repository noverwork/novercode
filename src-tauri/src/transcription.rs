use crate::store::{Settings, StoreState};
use serde::{Deserialize, Serialize};
use std::sync::{Mutex, MutexGuard, PoisonError};
use std::time::Duration;
use tauri::State;

pub const DEFAULT_BASE_URL: &str = "https://api.openai.com";
const TRANSCRIPTION_MODEL: &str = "gpt-4o-transcribe";
const MAX_ATTEMPTS: u8 = 3;

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

#[derive(Debug, Deserialize)]
struct OpenAiTranscriptionResponse {
  text: String,
}

fn lock_or_recover<T>(mutex: &Mutex<T>) -> MutexGuard<'_, T> {
  mutex.lock().unwrap_or_else(PoisonError::into_inner)
}

fn map_status_code_to_error(status_code: u16, error_body: Option<String>) -> TranscriptionError {
  match status_code {
    400 | 413 => TranscriptionError::InvalidAudio,
    401 => TranscriptionError::MissingApiKey,
    429 => TranscriptionError::RateLimited,
    503 => TranscriptionError::ApiError("Service temporarily unavailable".to_string()),
    _ => {
      let details = error_body
        .filter(|body| !body.trim().is_empty())
        .map(|body| format!(": {body}"))
        .unwrap_or_default();

      TranscriptionError::ApiError(format!(
        "OpenAI transcription request failed with status {status_code}{details}"
      ))
    }
  }
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
  state: State<'_, StoreState>,
  request: TranscriptionRequest,
) -> Result<TranscriptionResponse, TranscriptionError> {
  if request.audio_data.is_empty() {
    return Err(TranscriptionError::InvalidAudio);
  }

  let (api_key, base_url) = {
    let settings = lock_or_recover(&state.settings);
    get_openai_config(&settings)?
  };

  let endpoint = format!("{}/v1/audio/transcriptions", base_url.trim_end_matches('/'));
  let client = reqwest::Client::new();

  for attempt in 0..MAX_ATTEMPTS {
    let audio_part = reqwest::multipart::Part::bytes(request.audio_data.clone())
      .file_name("audio.webm")
      .mime_str("audio/webm")
      .map_err(|error| {
        TranscriptionError::ApiError(format!("Failed to prepare audio payload: {error}"))
      })?;

    let form = reqwest::multipart::Form::new()
      .part("file", audio_part)
      .text("model", TRANSCRIPTION_MODEL.to_string());

    let response = client
      .post(&endpoint)
      .bearer_auth(&api_key)
      .multipart(form)
      .send()
      .await
      .map_err(|error| {
        TranscriptionError::ApiError(format!("Failed to call OpenAI transcription API: {error}"))
      })?;

    if response.status().is_success() {
      let payload = response
        .json::<OpenAiTranscriptionResponse>()
        .await
        .map_err(|error| {
          TranscriptionError::ApiError(format!(
            "Failed to parse OpenAI transcription response: {error}"
          ))
        })?;

      return Ok(TranscriptionResponse { text: payload.text });
    }

    let status_code = response.status().as_u16();
    let error_body = response.text().await.ok();
    let should_retry = matches!(status_code, 429 | 503);
    let is_last_attempt = attempt + 1 == MAX_ATTEMPTS;

    if should_retry && !is_last_attempt {
      let backoff_seconds = 1_u64 << attempt;
      tokio::time::sleep(Duration::from_secs(backoff_seconds)).await;
      continue;
    }

    return Err(map_status_code_to_error(status_code, error_body));
  }

  Err(TranscriptionError::ApiError(
    "OpenAI transcription failed after maximum attempts".to_string(),
  ))
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
