# 3D Model Placeholder

Place your GLTF/GLB model file in this folder.

## Supported Formats
- `.gltf` + `.bin` + textures
- `.glb` (single file, embedded textures)

## Naming Convention
- Model file: `model.gltf` or `model.glb`
- Update `src/components/Model.jsx` to match your filename

## Optimization Tips
- Reduce polygon count (Blender: Decimate Modifier)
- Use Draco compression for smaller file size
- Optimize textures (max 2048x2048 for web)
- Test performance at different DPR settings
