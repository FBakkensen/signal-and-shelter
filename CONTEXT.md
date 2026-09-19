# Signal & Shelter

A friendly, combat-free exploration game about a stranded humanoid making a home on an unfamiliar planet.

## Language

**Island**: A bounded area of voxel terrain with a stranded ship, vents, and resource deposits. Its seed identifies a reproducible beginning.
_Avoid_: World (when referring to one island)

**Seed**: Case-sensitive text identifying an island's starting terrain and placements for a particular generation version. It does not represent saved progress.

**Play**: The player's exploration of an island, including movement, surveying deposits, and using the ship terminal. Pausing or viewing the overview suspends movement.

**Resource deposit**: An outcrop that can be surveyed by approaching it. Deposits currently contain copper, iron, or silica; surveying does not gather material.
_Avoid_: Landmark (when referring to a resource deposit)

**Vent**: A stepped, block-built formation on the island. Vents are solid scenery, with no current production or power behavior.

**Ship terminal**: The stranded ship's communications console. Checking its data link records a successful connection without restoring flight or delivering software.
