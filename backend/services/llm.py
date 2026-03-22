"""
Central LLM entrypoint for ShieldSentinel.

**Public hosting (typical):** set ``OPENROUTER_API_KEY`` (and optionally ``GROQ_API_KEY``)
on the server only. All users share that key; tune cost with ``OPENROUTER_MODELS``.

**OpenRouter:** ``OPENROUTER_MODELS`` (comma-separated cascade), ``OPENROUTER_HTTP_REFERER``,
``OPENROUTER_APP_TITLE``, ``OPENROUTER_FALLBACK_MODEL``.
"""

from services.smart_llm_router import smart_router as llm

__all__ = ["llm"]
