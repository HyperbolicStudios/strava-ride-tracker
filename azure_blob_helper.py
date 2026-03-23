"""
azure_blob_helper.py
Simple Azure Blob Storage helper for file and in-memory data operations.

Usage:
    public  = BlobHelper("blob-container-strava-tracker")
    private = BlobHelper("blob-container-strava-private")

    public.save_file("output/vancouver_network.geojson")
    public.load_file("vancouver_network.geojson", "output/vancouver_network.geojson")

    private.save_data(tokens, "strava_tokens.json")
    tokens = private.load_data("strava_tokens.json")
"""

import os
import json
import logging
from pathlib import Path
from typing import Any
from dotenv import load_dotenv
import gzip

from azure.storage.blob import BlobServiceClient, ContentSettings
from azure.core.exceptions import ResourceNotFoundError

load_dotenv()

logger = logging.getLogger(__name__)

CONTENT_TYPES = {
    ".geojson": "application/geo+json",
    ".json":    "application/json",
    ".csv":     "text/csv",
}


class BlobHelper:
    def __init__(self, container: str, connection_string: str | None = None):
        conn = connection_string or os.environ.get("AZURE_STORAGE_CONNECTION_STRING")
        if not conn:
            raise ValueError("No connection string found. Set AZURE_STORAGE_CONNECTION_STRING.")
        self._client    = BlobServiceClient.from_connection_string(conn)
        self._container = container

    def _blob(self, blob_name: str):
        return self._client.get_blob_client(container=self._container, blob=blob_name)

    def _content_type(self, filename: str) -> str:
        return CONTENT_TYPES.get(Path(filename).suffix.lower(), "application/octet-stream")

    # -- File-based --

    def save_file(self, local_path: str, blob_name: str | None = None) -> str:
        """Upload a local file. Returns public URL."""
        blob_name = blob_name or Path(local_path).name
        with open(local_path, "rb") as f:
            self._blob(blob_name).upload_blob(
                f, overwrite=True,
                content_settings=ContentSettings(content_type=self._content_type(local_path))
            )
        logger.info("Saved %s → blob:%s/%s", local_path, self._container, blob_name)
        return self._blob(blob_name).url

    def load_file(self, blob_name: str, local_path: str | None = None) -> str:
        """Download a blob to a local file. Returns local path."""
        local_path = local_path or blob_name
        Path(local_path).parent.mkdir(parents=True, exist_ok=True)
        with open(local_path, "wb") as f:
            f.write(self._download(blob_name))
        logger.info("Loaded blob:%s/%s → %s", self._container, blob_name, local_path)
        return local_path

    # -- In-memory --

    def save_data(self, data: Any, blob_name: str) -> str:
        """Serialise and upload a dict directly. Returns public URL."""
        self._blob(blob_name).upload_blob(
            json.dumps(data, indent=2).encode("utf-8"), overwrite=True,
            content_settings=ContentSettings(content_type=self._content_type(blob_name))
        )
        logger.info("Saved data → blob:%s/%s", self._container, blob_name)
        return self._blob(blob_name).url

    def load_data(self, blob_name: str) -> Any:
        """Download and deserialise a blob directly. Returns parsed dict."""
        logger.info("Loaded blob:%s/%s into memory", self._container, blob_name)
        return json.loads(self._download(blob_name))

    # -- Internal --

    def _download(self, blob_name: str) -> bytes:
        try:
            return self._blob(blob_name).download_blob().readall()
        except ResourceNotFoundError:
            raise FileNotFoundError(f"Blob '{blob_name}' not found in '{self._container}'.") from None

    def save_compressed(self, data: Any, blob_name: str) -> str:
        """Serialise, compress, and upload a dict. Returns public URL."""
        payload = gzip.compress(json.dumps(data, indent=2).encode("utf-8"))
        self._blob(blob_name).upload_blob(
            payload,
            overwrite=True,
            content_settings=ContentSettings(
                content_type=self._content_type(blob_name),
                content_encoding="gzip"
            )
        )
        logger.info("Saved compressed data → blob:%s/%s", self._container, blob_name)
        return self._blob(blob_name).url