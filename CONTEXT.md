# Signal & Shelter

A friendly, combat-free exploration game about a stranded humanoid making a home on an unfamiliar planet.

## Language

**Island**: A bounded area of voxel terrain with a stranded ship, vents, and resource deposits. Its seed identifies a reproducible beginning.
_Avoid_: World (when referring to one island)

**Seed**: Case-sensitive text identifying an island's starting terrain and placements for a particular generation version. It does not represent saved progress.

**Play**: The player's exploration of an island, including movement, surveying deposits, and using the ship terminal. Pausing suspends movement.

**Resource deposit**: An outcrop whose material is identified when any part is first revealed through exploration. Deposits contain copper, iron, or silica; discovery does not gather material.
_Avoid_: Landmark (when referring to a resource deposit)

**Exploration**: Uncovering terrain, objects and deposit identities within eight horizontal metres of the humanoid, regardless of obstacles. Camera direction and zoom do not change exploration.

**Explored area**: Ground already uncovered through exploration. It remains visible and active after the humanoid leaves; knowing an object does not grant remote physical interaction.

**Unexplored area**: Ground not yet uncovered through exploration. Fog conceals its terrain and objects in both close play and strategic view.

**Vent**: A stepped, block-built formation on the island. Vents are solid scenery, with no current production or power behavior.

**Ship terminal**: The stranded ship's communications console. Checking its data link records a successful connection without restoring flight or delivering software.

**Overview**: The retired separate, paused view of the island. Use strategic view for the active distant-zoom presentation.

**Strategic view**: The distant-zoom presentation of the island, anchored to the humanoid, with simplified terrain and recognizable information about explored resource deposits. It changes presentation without changing which actions are available.
