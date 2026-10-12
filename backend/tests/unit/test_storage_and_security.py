import uuid

from app.core.security import hash_password, hash_token, new_session_token, verify_password
from app.modules.storage.adapter import asset_key, source_key
from app.modules.storage.fake import FakeStorage


def test_password_hash_roundtrip():
    h = hash_password("correct horse battery")
    assert h != "correct horse battery" and verify_password("correct horse battery", h)
    assert not verify_password("wrong", h)


def test_session_token_is_only_stored_hashed():
    t = new_session_token()
    assert len(t) >= 40 and hash_token(t) != t and len(hash_token(t)) == 64


def test_keys_never_use_user_filenames():
    k = source_key(uuid.uuid4(), uuid.uuid4(), "PDF")
    assert k.startswith("projects/") and k.endswith(".pdf") and "../" not in k
    assert "/assets/" in asset_key(uuid.uuid4(), uuid.uuid4(), "png")


def test_fake_storage_flow():
    s = FakeStorage()
    up = s.presign_put("k", content_type="application/pdf", size=3, expires_s=900)
    assert up.method == "PUT" and s.head("k") is None
    s.put("k", b"abc", "application/pdf")
    info = s.head("k")
    assert info and info.size == 3
    s.delete("k")
    assert s.head("k") is None
