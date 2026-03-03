# 3D Reconstruction Viewer

Interactive browser-based viewer for underwater coral reef 3D reconstructions.
Built with [Three.js](https://threejs.org/). Hosted on GitHub Pages.

## Live viewer

**[https://nycjikm.github.io/3d-viewer/](https://nycjikm.github.io/3d-viewer/)**

Access requires a password (shared separately).

## Features

- Password-protected access — model files are AES-256-GCM encrypted at rest
- Multi-layer panel (toggle layers on/off like MeshLab)
- Supports textured OBJ meshes and PLY point clouds
- Real-time download progress bar
- Free 360° rotation (TrackballControls)

## Current models

### Optillium – Double Aruco

Coral reef section scanned with the Mantis ROV using stereo ZED camera.
Reconstructed with COLMAP (SfM) + OpenMVS (dense MVS + texturing).

| Layer | Type | Description |
|-------|------|-------------|
| Textured Mesh (filtered) | OBJ | Best quality, mild outlier filter |
| Textured Mesh (raw) | OBJ | Original mesh before filtering |
| Dense Point Cloud | PLY | Raw MVS point cloud |
| Point Cloud (mild filter) | PLY | After mild statistical filter |
| Point Cloud (strong filter) | PLY | After aggressive filter |
| Mesh Structure | PLY | Mesh geometry without texture |

## Adding a new model

1. Encrypt your files:
   ```bash
   # Copy model files into models/
   cp your_model.obj models/
   # Add the file to FILES list in encrypt.py, then run:
   python3 encrypt.py
   ```

2. Add an entry to the `MODELS` array in `app.js`:
   ```js
   {
     name: "Your Model Name",
     description: "Short description",
     icon: "🐠",
     layers: [
       {
         name: "Textured Mesh",
         type: "obj",
         obj: "models/your_model.obj",
         mtl: "models/your_model.mtl",
         tex: "models/your_model_texture.png",
         size: "XX MB", color: "#4e9fff", visible: true,
       },
     ],
   }
   ```

3. Push and GitHub Pages will redeploy automatically.

## Pipeline

Reconstruction pipeline code: [3d-reconstruction-pipeline](https://github.com/nycjikm/3d-reconstruction-pipeline)
