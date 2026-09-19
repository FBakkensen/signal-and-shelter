"""Run in Blender after exporting SHIP_PARTS to /tmp/signal-and-shelter-ship-parts.json.
See docs/architecture.md for the generation command. Preserves the active scene.
"""
import bpy
import json
from pathlib import Path

root = Path('/home/fbakkensen/Code/MyFirstGame')
parts = json.loads(Path('/tmp/signal-and-shelter-ship-parts.json').read_text())
previous_scene = bpy.context.window.scene
scene = bpy.data.scenes.new('Signal_And_Shelter_Ship_Asset')
bpy.context.window.scene = scene
try:
    for part in parts:
        x, y, z = part['position']
        sx, sy, sz = part['size']
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x, -z, y))
        obj = bpy.context.object
        obj.name = 'Ship_' + part['name']
        obj.dimensions = (sx, sz, sy)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        mat = bpy.data.materials.new(obj.name + '_material')
        c = part['color'].lstrip('#')
        srgb = [int(c[i:i+2], 16) / 255 for i in (0, 2, 4)]
        color = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in srgb]
        mat.diffuse_color = (*color, 1)
        mat.use_nodes = True
        shader = mat.node_tree.nodes.get('Principled BSDF')
        shader.inputs['Base Color'].default_value = (*color, 1)
        shader.inputs['Roughness'].default_value = .8
        shader.inputs['Emission Color'].default_value = (*color, 1)
        shader.inputs['Emission Strength'].default_value = part.get('emission', 0)
        obj.data.materials.append(mat)
    scene.unit_settings.system = 'METRIC'
    bpy.ops.export_scene.gltf(filepath=str(root/'public/assets/ship.glb'), export_format='GLB', use_active_scene=True, export_animations=False, export_yup=True)
    bpy.data.libraries.write(str(root/'assets/ship.blend'), {scene})
    result = {'asset': str(root/'public/assets/ship.glb'), 'source': str(root/'assets/ship.blend'), 'objects': len(scene.objects)}
finally:
    bpy.context.window.scene = previous_scene
