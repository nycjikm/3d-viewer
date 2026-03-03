#!/usr/bin/env python3
"""
Encrypt model files for the 3D viewer.
Run once: python3 encrypt.py
Replaces plain files with .enc versions. Keep this script private.
"""
import sys
import secrets
from pathlib import Path

try:
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
except ImportError:
    print("Run: pip install cryptography")
    sys.exit(1)

PASSWORD = "Robot452"
# Fixed public salt — OK because password has high entropy.
# Must match the salt in app.js.
SALT = b"3d-viewer-v1-salt"  # 17 bytes, padded to 32 internally by PBKDF2

MODELS_DIR = Path(__file__).parent / "models"

FILES = [
    "scene_textured_filtered_mild.obj",
    "scene_textured_filtered_mild.mtl",
    "scene_textured_filtered_mild_0.png",
    "scene_textured.obj",
    "scene_textured.mtl",
    "scene_textured_material_00_map_Kd.jpg",
    "scene_dense.ply",
    "scene_dense_filtered_mild.ply",
    "scene_dense_filtered_strong.ply",
    "scene_mesh_filtered_openmvs.ply",
]


def derive_key(password: str) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=SALT,
        iterations=100_000,
    )
    return kdf.derive(password.encode())


def encrypt(data: bytes, key: bytes) -> bytes:
    iv = secrets.token_bytes(12)
    return iv + AESGCM(key).encrypt(iv, data, None)


def main():
    key = derive_key(PASSWORD)
    print(f"Derived key from password ({len(key)*8}-bit AES-GCM)")

    # Write a tiny verify file so the browser can check the password
    # without needing to download a large model file first.
    verify_path = MODELS_DIR / "verify.enc"
    verify_path.write_bytes(encrypt(b"VALID", key))
    print(f"Written: verify.enc")

    for filename in FILES:
        src = MODELS_DIR / filename
        dst = MODELS_DIR / (filename + ".enc")
        if not src.exists():
            print(f"SKIP (not found): {filename}")
            continue
        data = src.read_bytes()
        enc = encrypt(data, key)
        dst.write_bytes(enc)
        src.unlink()
        print(f"Encrypted: {filename}  {len(data)/1048576:.1f} MB → {len(enc)/1048576:.1f} MB")

    print("\nDone. Plain files removed. Only .enc files remain.")


if __name__ == "__main__":
    main()
