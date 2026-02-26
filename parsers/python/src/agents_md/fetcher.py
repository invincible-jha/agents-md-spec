# SPDX-License-Identifier: MIT
# Copyright (c) 2026 MuVeraAI Corporation

"""
Async fetcher for AGENTS.md policy files.

Requires the optional ``aiohttp`` dependency:
    pip install agents-md[fetcher]

Usage:
    from agents_md import fetch_policy

    result = await fetch_policy("https://example.com")
    if result and result.success and result.policy:
        print(result.policy.identity.site)
"""

from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING

from .parser import AgentsMdParser
from .types import ParseResult

if TYPE_CHECKING:
    pass

# Maximum file size accepted (1 MB) as per the specification.
_MAX_FILE_SIZE_BYTES = 1_048_576

# Fetch timeout in seconds as per the specification.
_FETCH_TIMEOUT_SECONDS = 10

_USER_AGENT = "agents-md-parser/0.1.0 (https://github.com/aumos-oss/agents-md-spec)"


class FetchPolicyError(Exception):
    """Raised by fetch_policy for non-recoverable errors (e.g., HTTP scheme violation)."""


async def fetch_policy(
    base_url: str,
    *,
    enforce_https: bool = True,
    timeout_seconds: float = _FETCH_TIMEOUT_SECONDS,
) -> ParseResult | None:
    """
    Fetch and parse an AGENTS.md policy from a web property.

    Tries the following URLs in order:
    1. ``{base_url}/AGENTS.md``
    2. ``{base_url}/.well-known/agents.md``

    Returns ``None`` if no policy file is found at either location.
    Returns a ``ParseResult`` (potentially with errors) if a file is found
    but fails to parse.

    AGENTS.md files MUST be served over HTTPS. This function enforces that
    rule when ``enforce_https`` is ``True``.

    Args:
        base_url: The base URL of the web property (e.g., ``"https://example.com"``).
            Must include the scheme. Trailing slashes are handled automatically.
        enforce_https: Whether to require HTTPS. Set to ``False`` for local testing only.
        timeout_seconds: Per-request timeout in seconds. Default: 10.

    Returns:
        A ParseResult if an AGENTS.md file was found, or None if not found.

    Raises:
        FetchPolicyError: When ``enforce_https`` is True and the URL uses HTTP.
        ImportError: When ``aiohttp`` is not installed.

    Example::

        result = await fetch_policy("https://example.com")
        if result and result.success and result.policy:
            print(result.policy.identity.site)
    """
    try:
        import aiohttp
    except ImportError as exc:
        raise ImportError(
            "aiohttp is required for fetch_policy. "
            'Install it with: pip install "agents-md[fetcher]"'
        ) from exc

    normalized_base = base_url.rstrip("/")

    if enforce_https and not normalized_base.startswith("https://"):
        raise FetchPolicyError(
            f'AGENTS.md must be served over HTTPS. Received URL: "{base_url}". '
            "Pass enforce_https=False to override for testing."
        )

    candidate_urls = [
        f"{normalized_base}/AGENTS.md",
        f"{normalized_base}/.well-known/agents.md",
    ]

    connector = aiohttp.TCPConnector(ssl=enforce_https)
    timeout = aiohttp.ClientTimeout(total=timeout_seconds)

    async with aiohttp.ClientSession(
        connector=connector,
        timeout=timeout,
        headers={"User-Agent": _USER_AGENT},
    ) as session:
        for url in candidate_urls:
            content = await _attempt_fetch(session, url, enforce_https)
            if content is None:
                continue

            parser = AgentsMdParser()
            return parser.parse(content)

    return None


async def _attempt_fetch(
    session: "aiohttp.ClientSession",
    url: str,
    enforce_https: bool,
) -> str | None:
    """
    Attempt to fetch the content at the given URL.

    Returns the string content on HTTP 200.
    Returns None on HTTP 404, non-2xx status, timeout, or if file exceeds size limit.
    Raises on unexpected network errors.
    """
    try:
        async with session.get(url, allow_redirects=True) as response:
            # Detect HTTPS downgrade in redirect.
            if enforce_https and not str(response.url).startswith("https://"):
                return None

            if response.status == 404:
                return None
            if not (200 <= response.status < 300):
                return None

            # Check Content-Length header before reading.
            content_length_header = response.headers.get("Content-Length")
            if content_length_header is not None:
                try:
                    if int(content_length_header) > _MAX_FILE_SIZE_BYTES:
                        return None
                except ValueError:
                    pass

            content = await response.text(encoding="utf-8")

            # Secondary size check when Content-Length was absent.
            if len(content.encode("utf-8")) > _MAX_FILE_SIZE_BYTES:
                return None

            return content

    except asyncio.TimeoutError:
        return None
