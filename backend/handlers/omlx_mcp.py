# oMLX MCP client — same loop as the oMLX admin chat UI.
#
# Open Interpreter only reads delta.content. oMLX injects Brave (and any other
# MCP tools) into /v1/chat/completions but does not execute them. This module
# replaces interpreter.llm.completions so tool_calls are executed via
# POST /v1/mcp/execute, then the model is called again with the results.

from __future__ import annotations

import json
import threading
import time
import uuid
from typing import Any, Callable, Dict, Iterator, List, Optional

import httpx

MAX_MCP_ROUNDS = 8
TOOL_TIMEOUT_S = 30.0
RESULT_CHARS = 12_000
TOOLS_TTL_S = 60.0
YIELD_CHARS = 48

_tls = threading.local()
_tools_lock = threading.Lock()
_tools_cache: tuple[float, List[Dict[str, Any]]] = (0.0, [])

_TOOL_STATUS = {
    "brave_web_search": "searching the web…",
    "brave_news_search": "searching news…",
    "brave_llm_context": "fetching search context…",
}


def bind_turn(*, status_cb: Callable[[str], None], stop_flag: threading.Event) -> None:
    _tls.status_cb = status_cb
    _tls.stop_flag = stop_flag


def unbind_turn() -> None:
    _tls.status_cb = None
    _tls.stop_flag = None


def _stopped() -> bool:
    flag = getattr(_tls, "stop_flag", None)
    return bool(flag is not None and flag.is_set())


def _status(text: str) -> None:
    cb = getattr(_tls, "status_cb", None)
    if cb:
        cb(text)


def _short_name(full_name: str) -> str:
    return full_name.split("__")[-1] if full_name else full_name


def _tool_status(full_name: str) -> str:
    return _TOOL_STATUS.get(_short_name(full_name), f"calling {_short_name(full_name)}…")


def _auth_headers(api_key: str) -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }


def _v1_base(api_base: str) -> str:
    base = (api_base or "").rstrip("/")
    if not base.endswith("/v1"):
        base = base + "/v1"
    return base


def openai_tools_from_omlx(raw: Dict[str, Any]) -> List[Dict[str, Any]]:
    tools: List[Dict[str, Any]] = []
    for item in raw.get("tools") or []:
        name = item.get("name")
        if not name:
            continue
        params = item.get("parameters") or {"type": "object", "properties": {}}
        tools.append({
            "type": "function",
            "function": {
                "name": name,
                "description": item.get("description") or "",
                "parameters": params,
            },
        })
    return tools


def fetch_mcp_tools(api_base: str, api_key: str, *, force: bool = False) -> List[Dict[str, Any]]:
    global _tools_cache
    now = time.monotonic()
    with _tools_lock:
        cached_at, cached = _tools_cache
        if not force and cached and (now - cached_at) < TOOLS_TTL_S:
            return cached

    base = _v1_base(api_base)
    try:
        with httpx.Client(timeout=5.0) as client:
            resp = client.get(f"{base}/mcp/tools", headers=_auth_headers(api_key))
            resp.raise_for_status()
            tools = openai_tools_from_omlx(resp.json())
    except Exception as e:
        print(f"[MCP] tools fetch failed: {e}", flush=True)
        return []

    with _tools_lock:
        _tools_cache = (time.monotonic(), tools)
    names = [t["function"]["name"] for t in tools]
    print(f"[MCP] {len(tools)} tool(s): {', '.join(names) or '(none)'}", flush=True)
    return tools


def _parse_args(raw: str) -> Dict[str, Any]:
    if not raw or not str(raw).strip():
        return {}
    try:
        value = json.loads(raw)
        return value if isinstance(value, dict) else {}
    except json.JSONDecodeError:
        return {}


def _stringify_content(content: Any) -> str:
    if content is None:
        return ""
    if isinstance(content, str):
        text = content
    else:
        try:
            text = json.dumps(content, ensure_ascii=False)
        except TypeError:
            text = str(content)
    if len(text) > RESULT_CHARS:
        return text[:RESULT_CHARS] + "\n…[truncated]"
    return text


def execute_mcp_tool(
    api_base: str,
    api_key: str,
    tool_name: str,
    arguments: Dict[str, Any],
) -> str:
    base = _v1_base(api_base)
    try:
        with httpx.Client(timeout=httpx.Timeout(TOOL_TIMEOUT_S, connect=10.0)) as client:
            resp = client.post(
                f"{base}/mcp/execute",
                headers=_auth_headers(api_key),
                json={"tool_name": tool_name, "arguments": arguments},
            )
            if not resp.is_success:
                return f"Error: HTTP {resp.status_code} from MCP execute"
            data = resp.json()
            if data.get("is_error"):
                return data.get("error_message") or _stringify_content(data.get("content")) or "MCP tool error"
            return _stringify_content(data.get("content"))
    except httpx.TimeoutException:
        return f"Error: Tool timed out after {int(TOOL_TIMEOUT_S)}s"
    except Exception as e:
        return f"Error: {e}"


def _merge_tool_delta(acc: Dict[int, Dict[str, Any]], tc: Dict[str, Any]) -> None:
    idx = tc.get("index", 0)
    if idx not in acc:
        acc[idx] = {
            "id": "",
            "type": "function",
            "function": {"name": "", "arguments": ""},
        }
    slot = acc[idx]
    if tc.get("id"):
        slot["id"] = tc["id"]
    fn = tc.get("function") or {}
    if fn.get("name"):
        slot["function"]["name"] += fn["name"]
    args = fn.get("arguments")
    if isinstance(args, dict):
        slot["function"]["arguments"] = json.dumps(args, ensure_ascii=False)
    elif args:
        slot["function"]["arguments"] += str(args)


def _content_chunks(text: str) -> Iterator[Dict[str, Any]]:
    """Yield text in OI-friendly pieces. Never split a backtick run; OI buffers
    trailing ` so it can detect ``` fences. Ending the stream on a backtick
    drops the rest of the fence and truncates the code."""
    if not text:
        return
    if not text.endswith("\n"):
        text += "\n"
    i = 0
    n = len(text)
    while i < n:
        if _stopped():
            return
        if text[i] == "`":
            piece = "`"
            i += 1
        else:
            tick = text.find("`", i)
            j = n if tick == -1 else tick
            j = min(j, i + YIELD_CHARS)
            piece = text[i:j]
            i = j
        yield {"choices": [{"index": 0, "delta": {"content": piece}, "finish_reason": None}]}


def _stream_one_round(
    *,
    api_base: str,
    api_key: str,
    model: str,
    messages: List[Dict[str, Any]],
    tools: List[Dict[str, Any]],
    max_tokens: Optional[int],
    temperature: Optional[float],
) -> tuple[str, List[Dict[str, Any]]]:
    """Stream one /chat/completions call. Returns (content, tool_calls)."""
    payload: Dict[str, Any] = {
        "model": model,
        "messages": messages,
        "stream": True,
    }
    if max_tokens:
        payload["max_tokens"] = max_tokens
    if temperature is not None:
        payload["temperature"] = temperature
    if tools:
        payload["tools"] = tools

    content_parts: List[str] = []
    tool_acc: Dict[int, Dict[str, Any]] = {}
    trailing_tool_calls: List[Dict[str, Any]] = []
    url = f"{_v1_base(api_base)}/chat/completions"
    timeout = httpx.Timeout(connect=10.0, read=180.0, write=30.0, pool=10.0)

    with httpx.Client(timeout=timeout) as client:
        with client.stream("POST", url, headers=_auth_headers(api_key), json=payload) as resp:
            if resp.status_code >= 400:
                err_body = resp.read().decode("utf-8", errors="replace")[:500]
                raise RuntimeError(f"oMLX chat failed ({resp.status_code}): {err_body}")
            for line in resp.iter_lines():
                if _stopped():
                    break
                if not line:
                    continue
                if isinstance(line, bytes):
                    line = line.decode("utf-8", errors="replace")
                line = line.strip()
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    break
                try:
                    obj = json.loads(data)
                except json.JSONDecodeError:
                    continue
                choice = (obj.get("choices") or [None])[0]
                if not choice:
                    continue
                delta = choice.get("delta") or {}
                piece = delta.get("content")
                if piece:
                    content_parts.append(piece)
                for tc in delta.get("tool_calls") or []:
                    if isinstance(tc, dict):
                        _merge_tool_delta(tool_acc, tc)
                msg_tcs = (choice.get("message") or {}).get("tool_calls") or []
                if msg_tcs:
                    trailing_tool_calls = [tc for tc in msg_tcs if isinstance(tc, dict)]

    if not tool_acc and trailing_tool_calls:
        for i, tc in enumerate(trailing_tool_calls):
            _merge_tool_delta(tool_acc, {**tc, "index": tc.get("index", i)})

    tool_calls = []
    for idx in sorted(tool_acc):
        tc = tool_acc[idx]
        if not tc["function"]["name"]:
            continue
        if not tc["id"]:
            tc["id"] = f"call_{uuid.uuid4().hex[:8]}"
        tool_calls.append(tc)
    return "".join(content_parts), tool_calls


def omlx_completions(**params: Any) -> Iterator[Dict[str, Any]]:
    """Drop-in replacement for interpreter.llm.completions (LiteLLM)."""
    api_base = params.get("api_base") or ""
    api_key = params.get("api_key") or "dummy"
    model = str(params.get("model") or "").removeprefix("openai/")
    messages: List[Dict[str, Any]] = list(params.get("messages") or [])
    max_tokens = params.get("max_tokens")
    temperature = params.get("temperature")

    tools = fetch_mcp_tools(api_base, api_key)
    working = messages

    for depth in range(MAX_MCP_ROUNDS):
        if _stopped():
            return
        if depth == 0:
            _status("thinking…")
        content, tool_calls = _stream_one_round(
            api_base=api_base,
            api_key=api_key,
            model=model,
            messages=working,
            tools=tools,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        if _stopped():
            return

        if not tool_calls:
            yield from _content_chunks(content)
            return

        names = [tc["function"]["name"] for tc in tool_calls]
        print(f"[MCP] round {depth + 1}: {', '.join(names)}", flush=True)
        working = working + [{
            "role": "assistant",
            "content": content or None,
            "tool_calls": tool_calls,
        }]

        for tc in tool_calls:
            if _stopped():
                return
            name = tc["function"]["name"]
            args = _parse_args(tc["function"].get("arguments") or "")
            _status(_tool_status(name))
            result = execute_mcp_tool(api_base, api_key, name, args)
            err = result.startswith("Error:")
            print(
                f"[MCP] {name} {'failed' if err else 'ok'} ({len(result)} chars)",
                flush=True,
            )
            working = working + [{
                "role": "tool",
                "tool_call_id": tc["id"],
                "content": result or "",
            }]
        _status("using search results…")

    yield from _content_chunks(
        "Stopped after too many tool calls. Try a narrower question."
    )
