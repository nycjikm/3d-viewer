#!/usr/bin/env python3
"""
Optimize 3D models for web by:
1. Removing oversized files (>100MB)
2. Keeping only essential geometry
3. Preparing for faster loading
"""
import os
from pathlib import Path

MODELS_DIR = Path(__file__).parent / "models"

# Files to REMOVE (too large, can be regenerated locally if needed)
FILES_TO_REMOVE = [
    "scene_dense.ply",  # 120MB dense point cloud - remove
    "scene_textured.obj",  # 209MB raw textured mesh - remove  
    "scene_textured_filtered.obj",  # 74MB duplicate - remove
]

def optimize_models():
    removed_count = 0
    for subdir in MODELS_DIR.glob("*/"):
        if not subdir.is_dir():
            continue
        
        for pattern in FILES_TO_REMOVE:
            for file in subdir.glob(pattern):
                size_mb = file.stat().st_size / (1024*1024)
                file.unlink()
                print(f"✓ Removed: {subdir.name}/{file.name} ({size_mb:.1f} MB)")
                removed_count += 1
    
    print(f"\n✓ Optimized! Removed {removed_count} oversized files")
    
    # Show remaining files
    print("\n📦 Remaining model files:")
    for subdir in sorted(MODELS_DIR.glob("*/")):
        if subdir.is_dir() and list(subdir.glob("*")):
            print(f"\n{subdir.name}:")
            total = 0
            for file in sorted(subdir.glob("*")):
                if file.is_file():
                    size_mb = file.stat().st_size / (1024*1024)
                    total += size_mb
                    print(f"  - {file.name}: {size_mb:.1f} MB")
            print(f"  Total: {total:.1f} MB")

if __name__ == "__main__":
    optimize_models()
