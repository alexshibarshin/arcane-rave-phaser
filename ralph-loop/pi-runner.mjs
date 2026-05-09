#!/usr/bin/env node
/**
 * pi-runner.mjs — RPC session runner for Pi coding agent.
 *
 * Spawns `pi --mode rpc`, sends a prompt, processes events,
 * auto-responds to permission-gate extension UI requests,
 * returns structured JSON result on stdout.
 *
 * Usage:
 *   node pi-runner.mjs --role worker|reviewer --model provider/modelId --prompt "..." [--timeout 3600]
 *
 * Exit codes: 0 = PASS, 1 = FAIL/TIMEOUT/ERROR
 */

import { spawn } from "node:child_process";

// --- Arg parsing ---
function getArg(name) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : null;
}

const ROLE = getArg("--role");
const MODEL = getArg("--model");
const PROMPT = getArg("--prompt");
const TIMEOUT_SEC = parseInt(getArg("--timeout") ?? "3600", 10);

if (!ROLE || !MODEL || !PROMPT) {
  console.error("Usage: pi-runner.mjs --role worker|reviewer --model provider/modelId --prompt '...' [--timeout 3600]");
  process.exit(2);
}

// --- Model parsing: provider/modelId or provider/modelId:thinking ---
let provider, modelId, thinkingLevel;
const lastColon = MODEL.lastIndexOf(":");
const validThinking = new Set(["off", "minimal", "low", "medium", "high", "xhigh"]);
if (lastColon > 0 && validThinking.has(MODEL.slice(lastColon + 1))) {
  thinkingLevel = MODEL.slice(lastColon + 1);
  MODEL = MODEL.slice(0, lastColon);
}
const slashIdx = MODEL.indexOf("/");
if (slashIdx > 0) {
  provider = MODEL.slice(0, slashIdx);
  modelId = MODEL.slice(slashIdx + 1);
} else {
  modelId = MODEL;
}

// --- Extract text from agent_end messages ---
function extractText(messages) {
  if (!Array.isArray(messages)) return "";
  const texts = [];
  for (const msg of messages) {
    if (msg?.role === "assistant" && msg.content) {
      const content = Array.isArray(msg.content) ? msg.content : [msg.content];
      for (const block of content) {
        if (block?.type === "text" && block.text) texts.push(block.text);
      }
    }
  }
  return texts.join("");
}

// --- Parse REVIEW VERDICT from reviewer response ---
function parseVerdict(text) {
  const marker = "REVIEW VERDICT";
  const idx = text.lastIndexOf(marker);
  if (idx < 0) return null;

  const after = text.slice(idx + marker.length);
  const jsonStart = after.indexOf("{");
  if (jsonStart < 0) return null;

  // Extract the JSON object — count braces
  let depth = 0;
  let jsonEnd = -1;
  for (let i = jsonStart; i < after.length; i++) {
    if (after[i] === "{") depth++;
    if (after[i] === "}") depth--;
    if (depth === 0) {
      jsonEnd = i + 1;
      break;
    }
  }
  if (jsonEnd < 0) return null;

  try {
    return JSON.parse(after.slice(jsonStart, jsonEnd));
  } catch {
    return null;
  }
}

// --- Main ---
const startedAt = Date.now();

const args = ["--mode", "rpc", "--no-session"];
if (provider) args.push("--provider", provider);
if (modelId) args.push("--model", modelId);

const pi = spawn("pi", args, {
  stdio: ["pipe", "pipe", "pipe"],
});

let lastText = "";
let agentEnded = false;
let settled = false;

const result = { status: "error", text: "", verdict: null, duration_ms: 0 };

const finish = () => {
  if (settled) return;
  settled = true;
  result.duration_ms = Date.now() - startedAt;
  try { pi.kill("SIGKILL"); } catch {}
};

// --- Timeout ---
const timeoutTimer = setTimeout(() => {
  finish();
  result.status = "timeout";
  result.text = lastText;
  console.log(JSON.stringify(result));
  process.exit(1);
}, TIMEOUT_SEC * 1000);

// --- Stdout reader ---
let stdoutBuf = "";
pi.stdout.on("data", (chunk) => {
  if (settled) return;
  stdoutBuf += chunk.toString();

  while (true) {
    const nl = stdoutBuf.indexOf("\n");
    if (nl < 0) break;

    const line = stdoutBuf.slice(0, nl);
    stdoutBuf = stdoutBuf.slice(nl + 1);
    if (!line) continue;

    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }

    // Auto-respond to permission-gate extension UI requests
    if (event.type === "extension_ui_request") {
      const resp = { type: "extension_ui_response", id: event.id };
      if (event.method === "confirm") {
        resp.confirmed = true;
      } else if (event.method === "input") {
        // typed-confirm: always block
        resp.value = "BLOCK";
      } else if (event.method === "select") {
        // Default to first option's safe equivalent
        resp.value = Array.isArray(event.options) && event.options.length > 1
          ? event.options[event.options.length - 1]
          : undefined;
      } else {
        // notify, setStatus, setWidget, etc. — fire-and-forget, no response needed
        continue;
      }
      try { pi.stdin.write(JSON.stringify(resp) + "\n"); } catch {}
      continue;
    }

    if (event.type === "agent_end") {
      agentEnded = true;
      lastText = extractText(event.messages);
      continue;
    }
  }
});

pi.stderr.on("data", () => {});

// --- Handle errors ---
pi.on("error", (err) => {
  finish();
  clearTimeout(timeoutTimer);
  result.status = "error";
  result.text = err.message;
  console.log(JSON.stringify(result));
  process.exit(1);
});

pi.stdin.on("error", () => {
  // EPIPE — process died, handled in close
});

// --- Close handler ---
pi.on("close", (code, signal) => {
  finish();
  clearTimeout(timeoutTimer);

  if (agentEnded) {
    if (ROLE === "reviewer") {
      const verdict = parseVerdict(lastText);
      result.verdict = verdict;
      result.status = verdict?.verdict === "PASS" ? "ok" : "ok";
    } else {
      result.status = "ok";
    }
  } else {
    result.status = "error";
    result.text = result.text || `pi exited: code=${code} signal=${signal}`;
  }

  result.text = lastText;
  console.log(JSON.stringify(result));

  if (ROLE === "reviewer" && result.verdict?.verdict === "FAIL") {
    process.exit(1);
  }
  process.exit(result.status === "ok" ? 0 : 1);
});

// --- Set model if needed ---
if (provider && modelId) {
  pi.stdin.write(JSON.stringify({ type: "set_model", provider, modelId }) + "\n");
}
if (thinkingLevel) {
  pi.stdin.write(JSON.stringify({ type: "set_thinking_level", level: thinkingLevel }) + "\n");
}

// --- Send prompt ---
pi.stdin.write(JSON.stringify({ type: "prompt", message: PROMPT }) + "\n");
