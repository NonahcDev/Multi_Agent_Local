"""
Async Ollama API wrapper.
Connects directly to an agent machine's Ollama instance and streams tokens.
"""
from __future__ import annotations
import json
import logging
from typing import AsyncIterator, Optional

import httpx

from core.config import settings

logger = logging.getLogger("ollama_client")


class OllamaClient:
    def __init__(self, host: str, port: int = settings.ollama_default_port) -> None:
        self.base_url = f"http://{host}:{port}"
        self._client = httpx.AsyncClient(timeout=settings.ollama_timeout)

    async def list_models(self) -> list[dict]:
        try:
            resp = await self._client.get(f"{self.base_url}/api/tags")
            resp.raise_for_status()
            return resp.json().get("models", [])
        except Exception as exc:
            logger.error("list_models failed for %s: %s", self.base_url, exc)
            return []

    async def generate_stream(
        self,
        model: str,
        prompt: str,
        system: Optional[str] = None,
        options: Optional[dict] = None,
    ) -> AsyncIterator[str]:
        """Yields each token string as it arrives from Ollama."""
        body: dict = {"model": model, "prompt": prompt, "stream": True}
        if system:
            body["system"] = system
        if options:
            body["options"] = options

        try:
            async with self._client.stream(
                "POST", f"{self.base_url}/api/generate", json=body
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line:
                        continue
                    try:
                        data = json.loads(line)
                        token = data.get("response", "")
                        if token:
                            yield token
                        if data.get("done"):
                            break
                    except json.JSONDecodeError:
                        continue
        except httpx.ConnectError as exc:
            logger.error("Cannot connect to Ollama at %s: %s", self.base_url, exc)
            raise
        except Exception as exc:
            logger.error("generate_stream error: %s", exc)
            raise

    async def check_health(self) -> bool:
        try:
            resp = await self._client.get(f"{self.base_url}/", timeout=5)
            return resp.status_code == 200
        except Exception:
            return False

    async def aclose(self) -> None:
        await self._client.aclose()
