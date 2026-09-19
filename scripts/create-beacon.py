"""Run through Blender MCP; builds an isolated asset scene without touching user objects."""
import bpy
from pathlib import Path

root = Path('/home/fbakkensen/Code/MyFirstGame')
scene = bpy.data.scenes.new('Signal_And_Shelter_Beacon_Asset')
previous_scene = bpy.context.window.scene
bpy.context.window.scene = scene

def material(name, color, emission=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = .85
    shader.inputs['Emission Color'].default_value = (*color, 1)
    shader.inputs['Emission Strength'].default_value = emission
    return mat

def block(name, location, dimensions, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    return obj

try:
    stone = material('Beacon_warm_limestone', (.52,.49,.36))
    dark = material('Beacon_dark_bronze', (.12,.22,.19))
    amber = material('Beacon_amber_glass', (1,.51,.1), 1.5)
    block('Beacon_foundation', (0,0,.2), (2,2,.4), stone)
    block('Beacon_plinth', (0,0,.65), (1.3,1.3,.5), stone)
    block('Beacon_column', (0,0,1.7), (.65,.65,1.6), stone)
    block('Beacon_lantern_base', (0,0,2.6), (1.4,1.4,.25), dark)
    block('Beacon_light', (0,0,3.1), (.8,.8,.8), amber)
    for x in [-.55,.55]:
        for y in [-.55,.55]:
            block('Beacon_corner', (x,y,3.1), (.12,.12,1), dark)
    block('Beacon_roof', (0,0,3.7), (1.65,1.65,.25), dark)
    block('Beacon_cap', (0,0,3.95), (1,1,.25), dark)
    scene.unit_settings.system = 'METRIC'
    bpy.ops.export_scene.gltf(filepath=str(root/'public/assets/beacon.glb'), export_format='GLB', use_active_scene=True, export_animations=False, export_yup=True)
    bpy.data.libraries.write(str(root/'assets/beacon.blend'), {scene})
    result = {'asset': str(root/'public/assets/beacon.glb'), 'source': str(root/'assets/beacon.blend'), 'objects': len(scene.objects), 'height_m': 4.075}
finally:
    bpy.context.window.scene = previous_scene
