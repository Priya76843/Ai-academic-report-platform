from functools import lru_cache

from app.modules.storage.adapter import StorageAdapter


@lru_cache
def get_storage() -> StorageAdapter:
    from app.modules.storage.s3 import S3Storage

    return S3Storage()
