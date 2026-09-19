# Signal & Shelter

Language for the stranded-island exploration experiment.

## Language

**Island**: The bounded starting place containing terrain, a stranded ship, vents, resource deposits and the player's arrival point.
_Avoid_: Level, map (when referring to the place rather than its overview).

**Solid**: A placed ship, vent or resource deposit whose visible blocks obstruct or support the player. Terrain is separate; distant scenery and haze grains are not solids.

**Resource deposit**: A nearby outcrop the player can survey to record a resource discovery. Surveying does not gather material.
_Avoid_: Collectible, inventory item.

**Ship terminal**: The powered communications console beside the stranded ship. Its connection check records a local discovery about the ship's data link.
_Avoid_: Download station (software delivery is not implemented).
