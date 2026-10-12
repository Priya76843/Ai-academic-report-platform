"""S3-compatible implementation: LocalStack locally, AWS S3 or any compatible service in production."""

from typing import Any

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.core.config import get_settings
from app.modules.storage.adapter import ObjectInfo, PresignedUpload


class S3Storage:
    def __init__(self) -> None:
        s = get_settings()
        self.bucket = s.s3_bucket
        kwargs: dict[str, Any] = dict(
            region_name=s.s3_region,
            aws_access_key_id=s.s3_access_key_id,
            aws_secret_access_key=s.s3_secret_access_key,
            config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
        )
        self.client = boto3.client("s3", endpoint_url=s.s3_endpoint_url, **kwargs)
        # Presigned URLs must be valid for the browser's view of the endpoint (e.g. localhost vs. container name).
        self.public = boto3.client("s3", endpoint_url=s.s3_public_endpoint_url or s.s3_endpoint_url, **kwargs)

    def presign_put(self, key: str, *, content_type: str, size: int, expires_s: int) -> PresignedUpload:
        url = self.public.generate_presigned_url(
            "put_object",
            Params={"Bucket": self.bucket, "Key": key, "ContentType": content_type, "ContentLength": size},
            ExpiresIn=expires_s,
        )
        return PresignedUpload(url=url, method="PUT", headers={"Content-Type": content_type}, expires_in=expires_s)

    def presign_get(self, key: str, *, expires_s: int, filename: str | None = None) -> str:
        params: dict[str, Any] = {"Bucket": self.bucket, "Key": key}
        if filename:
            params["ResponseContentDisposition"] = f'attachment; filename="{filename}"'
        return self.public.generate_presigned_url("get_object", Params=params, ExpiresIn=expires_s)

    def head(self, key: str) -> ObjectInfo | None:
        try:
            r = self.client.head_object(Bucket=self.bucket, Key=key)
        except ClientError as e:
            if e.response.get("Error", {}).get("Code") in ("404", "NoSuchKey", "NotFound"):
                return None
            raise
        return ObjectInfo(key=key, size=int(r["ContentLength"]), content_type=r.get("ContentType"))

    def delete(self, key: str) -> None:
        self.client.delete_object(Bucket=self.bucket, Key=key)
