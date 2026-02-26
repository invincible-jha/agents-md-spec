# SPDX-License-Identifier: MIT
# Copyright (c) 2026 MuVeraAI Corporation

"""
Tests for the AGENTS.md Python async fetcher.
Uses unittest.mock to mock aiohttp without requiring network access.
"""

from __future__ import annotations

import asyncio
from typing import AsyncIterator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from agents_md import FetchPolicyError, fetch_policy


MINIMAL_AGENTS_MD = """# AGENTS.md

## Identity
- site: example.com
- contact: ai@example.com
"""

FULL_AGENTS_MD = """# AGENTS.md

## Identity
- site: example.com

## Trust Requirements
- minimum-trust-level: 2
- authentication: required

## Allowed Actions
- read-content: true
- submit-forms: false
"""


# ---------------------------------------------------------------------------
# Helpers for mocking aiohttp
# ---------------------------------------------------------------------------


def make_response(status: int, body: str, url: str) -> MagicMock:
    """Create a mock aiohttp response context manager."""
    response = MagicMock()
    response.status = status
    response.url = url
    response.headers = {"Content-Length": str(len(body.encode()))}
    response.text = AsyncMock(return_value=body)

    # Support async context manager protocol for `async with session.get(url) as response`.
    context = MagicMock()
    context.__aenter__ = AsyncMock(return_value=response)
    context.__aexit__ = AsyncMock(return_value=None)
    return context


def make_session(responses: dict[str, tuple[int, str]]) -> MagicMock:
    """Create a mock aiohttp ClientSession."""

    def get_side_effect(url: str, **kwargs: object) -> MagicMock:
        if url in responses:
            status, body = responses[url]
        else:
            status, body = 404, "Not Found"
        return make_response(status, body, url)

    session = MagicMock()
    session.get = MagicMock(side_effect=get_side_effect)

    # Support async context manager protocol for `async with aiohttp.ClientSession() as session`.
    session_context = MagicMock()
    session_context.__aenter__ = AsyncMock(return_value=session)
    session_context.__aexit__ = AsyncMock(return_value=None)
    return session_context


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestFetchPolicy:
    @pytest.fixture(autouse=True)
    def patch_aiohttp(self) -> AsyncIterator[None]:  # type: ignore[misc]
        """Patch aiohttp.ClientSession and aiohttp.TCPConnector for all tests."""
        with (
            patch("agents_md.fetcher.aiohttp") as mock_aiohttp,
        ):
            mock_aiohttp.ClientTimeout = MagicMock(return_value=MagicMock())
            mock_aiohttp.TCPConnector = MagicMock(return_value=MagicMock())
            self._mock_aiohttp = mock_aiohttp
            yield

    def _setup_session(self, responses: dict[str, tuple[int, str]]) -> None:
        self._mock_aiohttp.ClientSession = MagicMock(
            return_value=make_session(responses)
        )

    @pytest.mark.asyncio
    async def test_fetches_from_agents_md_first(self) -> None:
        self._setup_session({"https://example.com/AGENTS.md": (200, MINIMAL_AGENTS_MD)})

        result = await fetch_policy("https://example.com", enforce_https=False)
        assert result is not None
        assert result.success is True
        assert result.policy is not None
        assert result.policy.identity.site == "example.com"

    @pytest.mark.asyncio
    async def test_falls_back_to_well_known_when_root_404(self) -> None:
        self._setup_session(
            {
                "https://example.com/AGENTS.md": (404, "Not Found"),
                "https://example.com/.well-known/agents.md": (200, MINIMAL_AGENTS_MD),
            }
        )

        result = await fetch_policy("https://example.com", enforce_https=False)
        assert result is not None
        assert result.success is True

    @pytest.mark.asyncio
    async def test_returns_none_when_both_urls_return_404(self) -> None:
        self._setup_session({})

        result = await fetch_policy("https://example.com", enforce_https=False)
        assert result is None

    @pytest.mark.asyncio
    async def test_raises_fetch_policy_error_for_http_when_enforce_https(self) -> None:
        with pytest.raises(FetchPolicyError):
            await fetch_policy("http://example.com", enforce_https=True)

    @pytest.mark.asyncio
    async def test_does_not_raise_for_http_when_enforce_https_false(self) -> None:
        self._setup_session({"http://example.com/AGENTS.md": (200, MINIMAL_AGENTS_MD)})

        result = await fetch_policy("http://example.com", enforce_https=False)
        assert result is not None

    @pytest.mark.asyncio
    async def test_strips_trailing_slashes_from_base_url(self) -> None:
        self._setup_session({"https://example.com/AGENTS.md": (200, MINIMAL_AGENTS_MD)})

        # With trailing slash — should still find the file.
        result = await fetch_policy("https://example.com/", enforce_https=False)
        assert result is not None
        assert result.success is True

    @pytest.mark.asyncio
    async def test_returns_failed_parse_result_for_invalid_file(self) -> None:
        invalid_content = "## Trust Requirements\n- minimum-trust-level: 1\n"
        self._setup_session(
            {"https://example.com/AGENTS.md": (200, invalid_content)}
        )

        result = await fetch_policy("https://example.com", enforce_https=False)
        assert result is not None
        assert result.success is False
        assert len(result.errors) > 0

    @pytest.mark.asyncio
    async def test_parses_full_featured_file(self) -> None:
        self._setup_session({"https://example.com/AGENTS.md": (200, FULL_AGENTS_MD)})

        result = await fetch_policy("https://example.com", enforce_https=False)
        assert result is not None
        assert result.success is True
        assert result.policy is not None
        assert result.policy.trust_requirements.minimum_trust_level == 2
        assert result.policy.allowed_actions["read_content"] is True
