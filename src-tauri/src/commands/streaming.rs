use reqwest::Client;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

#[derive(Deserialize, Debug)]
pub struct StreamRequest {
    pub provider: String,
    pub api_key: String,
    pub model: String,
    pub system_prompt: String,
    pub user_prompt: String,
    pub temperature: Option<f64>,
    pub max_tokens: Option<u32>,
    pub images: Option<Vec<String>>,
    pub stream_id: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct StreamToken {
    pub stream_id: String,
    pub token: String,
    pub done: bool,
    pub error: Option<String>,
    pub usage: Option<StreamUsage>,
}

#[derive(Serialize, Clone, Debug)]
pub struct StreamUsage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

#[tauri::command]
pub async fn stream_llm(app: AppHandle, request: StreamRequest) -> Result<(), String> {
    let stream_id = request.stream_id.clone();
    let app_handle = app.clone();

    tokio::spawn(async move {
        let result = match request.provider.as_str() {
            "gemini" => stream_gemini(&app_handle, &request).await,
            "anthropic" => stream_anthropic(&app_handle, &request).await,
            "openai" | "groq" | "openrouter" | "ollama" => {
                stream_openai_compat(&app_handle, &request).await
            }
            _ => Err(format!("Unknown provider: {}", request.provider)),
        };

        if let Err(e) = result {
            let _ = app_handle.emit(
                "llm-stream",
                StreamToken {
                    stream_id: stream_id.clone(),
                    token: String::new(),
                    done: true,
                    error: Some(e),
                    usage: None,
                },
            );
        }
    });

    Ok(())
}

async fn stream_openai_compat(app: &AppHandle, req: &StreamRequest) -> Result<(), String> {
    let base_url = match req.provider.as_str() {
        "openai" => "https://api.openai.com/v1",
        "groq" => "https://api.groq.com/openai/v1",
        "openrouter" => "https://openrouter.ai/api/v1",
        "ollama" => "http://localhost:11434/v1",
        _ => return Err(format!("Unknown provider: {}", req.provider)),
    };
    let url = format!("{}/chat/completions", base_url);

    let mut messages = vec![serde_json::json!({"role": "system", "content": req.system_prompt})];

    if let Some(images) = &req.images {
        if !images.is_empty() {
            let mut content_parts = vec![serde_json::json!({"type": "text", "text": req.user_prompt})];
            for img in images {
                content_parts.push(serde_json::json!({"type": "image_url", "image_url": {"url": img}}));
            }
            messages.push(serde_json::json!({"role": "user", "content": content_parts}));
        } else {
            messages.push(serde_json::json!({"role": "user", "content": req.user_prompt}));
        }
    } else {
        messages.push(serde_json::json!({"role": "user", "content": req.user_prompt}));
    }

    let body = serde_json::json!({
        "model": req.model,
        "messages": messages,
        "temperature": req.temperature.unwrap_or(0.3),
        "max_tokens": req.max_tokens.unwrap_or(8192),
        "stream": true
    });

    let client = Client::new();
    let mut builder = client.post(&url).json(&body);

    if !req.api_key.is_empty() {
        builder = builder.header("Authorization", format!("Bearer {}", req.api_key));
    }
    if req.provider == "openrouter" {
        builder = builder
            .header("HTTP-Referer", "https://zenith-ide.app")
            .header("X-Title", "Zenith IDE");
    }

    let response = builder.send().await.map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("API error {}: {}", status, body));
    }

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();
    use futures::StreamExt;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Stream error: {}", e))?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        let lines: Vec<String> = buffer.split('\n').map(|s| s.to_string()).collect();
        buffer = lines.last().cloned().unwrap_or_default();

        for line in &lines[..lines.len().saturating_sub(1)] {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed == "data: [DONE]" {
                if trimmed == "data: [DONE]" {
                    let _ = app.emit(
                        "llm-stream",
                        StreamToken {
                            stream_id: req.stream_id.clone(),
                            token: String::new(),
                            done: true,
                            error: None,
                            usage: None,
                        },
                    );
                    return Ok(());
                }
                continue;
            }

            if let Some(data) = trimmed.strip_prefix("data: ") {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                    if let Some(delta) = json["choices"][0]["delta"]["content"].as_str() {
                        let _ = app.emit(
                            "llm-stream",
                            StreamToken {
                                stream_id: req.stream_id.clone(),
                                token: delta.to_string(),
                                done: false,
                                error: None,
                                usage: None,
                            },
                        );
                    }

                    if let Some(usage) = json.get("usage") {
                        let _ = app.emit(
                            "llm-stream",
                            StreamToken {
                                stream_id: req.stream_id.clone(),
                                token: String::new(),
                                done: true,
                                error: None,
                                usage: Some(StreamUsage {
                                    prompt_tokens: usage["prompt_tokens"].as_u64().unwrap_or(0) as u32,
                                    completion_tokens: usage["completion_tokens"].as_u64().unwrap_or(0) as u32,
                                    total_tokens: usage["total_tokens"].as_u64().unwrap_or(0) as u32,
                                }),
                            },
                        );
                        return Ok(());
                    }
                }
            }
        }
    }

    let _ = app.emit(
        "llm-stream",
        StreamToken {
            stream_id: req.stream_id.clone(),
            token: String::new(),
            done: true,
            error: None,
            usage: None,
        },
    );

    Ok(())
}

async fn stream_gemini(app: &AppHandle, req: &StreamRequest) -> Result<(), String> {
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:streamGenerateContent?alt=sse&key={}",
        req.model, req.api_key
    );

    let mut parts = vec![serde_json::json!({"text": req.user_prompt})];
    if let Some(images) = &req.images {
        for img in images {
            if let Some(captures) = img.strip_prefix("data:") {
                if let Some(idx) = captures.find(";base64,") {
                    let mime = &captures[..idx];
                    let data = &captures[idx + 8..];
                    parts.push(serde_json::json!({"inlineData": {"mimeType": mime, "data": data}}));
                }
            }
        }
    }

    let body = serde_json::json!({
        "system_instruction": {"parts": [{"text": req.system_prompt}]},
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {
            "temperature": req.temperature.unwrap_or(0.3),
            "maxOutputTokens": req.max_tokens.unwrap_or(8192)
        }
    });

    let client = Client::new();
    let response = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body_text = response.text().await.unwrap_or_default();
        return Err(format!("Gemini API error {}: {}", status, body_text));
    }

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();
    use futures::StreamExt;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Stream error: {}", e))?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        let lines: Vec<String> = buffer.split('\n').map(|s| s.to_string()).collect();
        buffer = lines.last().cloned().unwrap_or_default();

        for line in &lines[..lines.len().saturating_sub(1)] {
            let trimmed = line.trim();
            if let Some(data) = trimmed.strip_prefix("data: ") {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                    if let Some(text) = json["candidates"][0]["content"]["parts"][0]["text"].as_str() {
                        let _ = app.emit(
                            "llm-stream",
                            StreamToken {
                                stream_id: req.stream_id.clone(),
                                token: text.to_string(),
                                done: false,
                                error: None,
                                usage: None,
                            },
                        );
                    }

                    if let Some(meta) = json.get("usageMetadata") {
                        let _ = app.emit(
                            "llm-stream",
                            StreamToken {
                                stream_id: req.stream_id.clone(),
                                token: String::new(),
                                done: true,
                                error: None,
                                usage: Some(StreamUsage {
                                    prompt_tokens: meta["promptTokenCount"].as_u64().unwrap_or(0) as u32,
                                    completion_tokens: meta["candidatesTokenCount"].as_u64().unwrap_or(0) as u32,
                                    total_tokens: meta["totalTokenCount"].as_u64().unwrap_or(0) as u32,
                                }),
                            },
                        );
                    }
                }
            }
        }
    }

    let _ = app.emit(
        "llm-stream",
        StreamToken {
            stream_id: req.stream_id.clone(),
            token: String::new(),
            done: true,
            error: None,
            usage: None,
        },
    );

    Ok(())
}

async fn stream_anthropic(app: &AppHandle, req: &StreamRequest) -> Result<(), String> {
    let url = "https://api.anthropic.com/v1/messages";

    let mut content = vec![serde_json::json!({"type": "text", "text": req.user_prompt})];
    if let Some(images) = &req.images {
        for img in images {
            if let Some(captures) = img.strip_prefix("data:") {
                if let Some(idx) = captures.find(";base64,") {
                    let mime = &captures[..idx];
                    let data = &captures[idx + 8..];
                    content.push(serde_json::json!({
                        "type": "image",
                        "source": {"type": "base64", "media_type": mime, "data": data}
                    }));
                }
            }
        }
    }

    let body = serde_json::json!({
        "model": req.model,
        "system": req.system_prompt,
        "messages": [{"role": "user", "content": content}],
        "max_tokens": req.max_tokens.unwrap_or(8192),
        "temperature": req.temperature.unwrap_or(0.3),
        "stream": true
    });

    let client = Client::new();
    let response = client
        .post(url)
        .header("x-api-key", &req.api_key)
        .header("anthropic-version", "2023-06-01")
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body_text = response.text().await.unwrap_or_default();
        return Err(format!("Anthropic API error {}: {}", status, body_text));
    }

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();
    use futures::StreamExt;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Stream error: {}", e))?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        let lines: Vec<String> = buffer.split('\n').map(|s| s.to_string()).collect();
        buffer = lines.last().cloned().unwrap_or_default();

        for line in &lines[..lines.len().saturating_sub(1)] {
            let trimmed = line.trim();
            if let Some(data) = trimmed.strip_prefix("data: ") {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                    let event_type = json["type"].as_str().unwrap_or("");

                    match event_type {
                        "content_block_delta" => {
                            if let Some(text) = json["delta"]["text"].as_str() {
                                let _ = app.emit(
                                    "llm-stream",
                                    StreamToken {
                                        stream_id: req.stream_id.clone(),
                                        token: text.to_string(),
                                        done: false,
                                        error: None,
                                        usage: None,
                                    },
                                );
                            }
                        }
                        "message_delta" => {
                            if let Some(usage) = json.get("usage") {
                                let _ = app.emit(
                                    "llm-stream",
                                    StreamToken {
                                        stream_id: req.stream_id.clone(),
                                        token: String::new(),
                                        done: true,
                                        error: None,
                                        usage: Some(StreamUsage {
                                            prompt_tokens: 0,
                                            completion_tokens: usage["output_tokens"].as_u64().unwrap_or(0) as u32,
                                            total_tokens: usage["output_tokens"].as_u64().unwrap_or(0) as u32,
                                        }),
                                    },
                                );
                            }
                        }
                        "message_stop" => {
                            let _ = app.emit(
                                "llm-stream",
                                StreamToken {
                                    stream_id: req.stream_id.clone(),
                                    token: String::new(),
                                    done: true,
                                    error: None,
                                    usage: None,
                                },
                            );
                            return Ok(());
                        }
                        _ => {}
                    }
                }
            }
        }
    }

    Ok(())
}
