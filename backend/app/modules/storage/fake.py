"""In-memory storage for unit tests. `put()` simulates the browser's PUT."""

from app.modules.storage.adapter import ObjectInfo, PresignedUpload


class FakeStorage:
    def __init__(self) -> None:
        self.objects: dict[str, tuple[bytes, str]] = {}
        self.presigned: list[str] = []

    def presign_put(self, key: str, *, content_type: str, size: int, expires_s: int) -> PresignedUpload:
        self.presigned.append(key)
        return PresignedUpload(
            url=f"fake://upload/{key}", method="PUT", headers={"Content-Type": content_type}, expires_in=expires_s
        )

    def put(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> None:
        self.objects[key] = (data, content_type)

    def presign_get(self, key: str, *, expires_s: int, filename: str | None = None) -> str:
        return f"fake://download/{key}?expires={expires_s}"

    def head(self, key: str) -> ObjectInfo | None:
        if key not in self.objects:
            return None
        data, ct = self.objects[key]
        return ObjectInfo(key=key, size=len(data), content_type=ct)

    def delete(self, key: str) -> None:
        self.objects.pop(key, None)
