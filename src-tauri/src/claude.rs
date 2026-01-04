use std::process::Stdio;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

/// Check if Claude CLI is installed and available
#[tauri::command]
pub async fn check_claude_installed() -> Result<bool, String> {
    let output = std::process::Command::new("claude")
        .arg("--version")
        .output();

    match output {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

/// Check Claude login status
#[tauri::command]
pub async fn check_claude_auth() -> Result<String, String> {
    let output = std::process::Command::new("claude")
        .args(["config", "get", "primaryApiKey"])
        .output()
        .map_err(|e| format!("Failed to check auth: {}", e))?;

    if output.status.success() {
        let result = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if result.is_empty() || result == "null" {
            Ok("subscription".to_string()) // 用訂閱帳號
        } else {
            Ok("api_key".to_string()) // 用 API key
        }
    } else {
        Ok("not_logged_in".to_string())
    }
}

/// Stream message to Claude CLI with real-time output via Tauri events
#[tauri::command]
pub async fn stream_claude_message(
    app: AppHandle,
    message: String,
    session_id: Option<String>,
) -> Result<String, String> {
    let mut args = vec![
        "--print".to_string(),
        "--output-format".to_string(),
        "stream-json".to_string(),
    ];

    // 如果有 session_id，保持對話上下文
    if let Some(sid) = &session_id {
        args.push("--resume".to_string());
        args.push(sid.clone());
    }

    args.push(message);

    let mut child = Command::new("claude")
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn claude: {}", e))?;

    let stdout = child.stdout.take().ok_or("Failed to get stdout")?;
    let mut reader = BufReader::new(stdout).lines();

    let mut final_session_id = session_id.unwrap_or_default();
    let mut full_response = String::new();

    // 逐行讀取 NDJSON 串流
    while let Some(line) = reader
        .next_line()
        .await
        .map_err(|e| format!("Read error: {}", e))?
    {
        if line.trim().is_empty() {
            continue;
        }

        // 解析 JSON 事件
        if let Ok(event) = serde_json::from_str::<serde_json::Value>(&line) {
            let event_type = event.get("type").and_then(|t| t.as_str()).unwrap_or("");

            match event_type {
                "assistant" => {
                    // 完整的助手消息
                    if let Some(message) = event.get("message") {
                        if let Some(content) = message.get("content") {
                            if let Some(arr) = content.as_array() {
                                for item in arr {
                                    if let Some(text) = item.get("text").and_then(|t| t.as_str()) {
                                        full_response.push_str(text);
                                    }
                                }
                            }
                        }
                    }
                    let _ = app.emit("claude:message", &event);
                }
                "content_block_delta" => {
                    // 增量文字 - 即時串流
                    if let Some(delta) = event.get("delta") {
                        if let Some(text) = delta.get("text").and_then(|t| t.as_str()) {
                            let _ = app.emit("claude:delta", text);
                        }
                    }
                }
                "result" => {
                    // 最終結果，包含 session_id
                    if let Some(sid) = event.get("session_id").and_then(|s| s.as_str()) {
                        final_session_id = sid.to_string();
                    }
                    let _ = app.emit("claude:result", &event);
                }
                "error" => {
                    let error_msg = event
                        .get("error")
                        .and_then(|e| e.get("message"))
                        .and_then(|m| m.as_str())
                        .unwrap_or("Unknown error");
                    let _ = app.emit("claude:error", error_msg);
                    return Err(error_msg.to_string());
                }
                _ => {
                    // 其他事件類型（tool_use, system 等）
                    let _ = app.emit("claude:event", &event);
                }
            }
        }
    }

    // 等待進程結束
    let status = child
        .wait()
        .await
        .map_err(|e| format!("Process error: {}", e))?;

    if !status.success() {
        return Err("Claude process failed".to_string());
    }

    // 發送完成事件
    let _ = app.emit("claude:done", &final_session_id);

    Ok(final_session_id)
}

/// Send a message to Claude CLI and get the response (non-streaming, for simple queries)
#[tauri::command]
pub async fn send_claude_message(message: String) -> Result<String, String> {
    let output = std::process::Command::new("claude")
        .args(["--print", "--output-format", "json", &message])
        .output()
        .map_err(|e| format!("Failed to execute claude command: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Claude CLI error: {}", stderr));
    }

    String::from_utf8(output.stdout).map_err(|e| format!("Failed to parse response: {}", e))
}
