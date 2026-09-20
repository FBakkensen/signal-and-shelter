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

**Movement capabilities**: What an individual humanoid or robot can currently traverse, including its support footprint, body dimensions, speed, jump limits and movement timings. Capabilities can differ by type and individual, including changes from upgrades; an actor need not be able to jump.

**Upgrade station**: A designated place where a stationary actor can receive upgrades. The ship is a possible station, not a selected location.

**Actor**: The player-controlled humanoid or an individual robot that occupies space and moves on the island.

**Support footprint**: The area beneath an actor's feet or base that must be supported at a valid standing position. It is distinct from the space occupied by the actor's full body.

**Movement blockage**: A valid situation in which an actor cannot currently make progress toward its destination. It does not by itself mean the actor's position is invalid or its job has been abandoned.

**Yielding**: Temporarily waiting, retreating or detouring to let another actor pass while retaining the original destination.

**Requested destination**: The place the player asks the humanoid to reach. It may lie in unexplored or unreachable terrain and remains the goal when only part of the journey is currently possible.

**Reachable endpoint**: The requested destination when reachable through explored ground, otherwise the reachable place closest to it. Reaching an intermediate endpoint does not mean the requested destination has been reached.

**Vent**: A stepped, block-built formation on the island. Vents are solid scenery, with no current production or power behavior.

**Ship terminal**: The stranded ship's communications console. Checking its data link records a successful connection without restoring flight or delivering software.

**Overview**: The retired separate, paused view of the island. Use strategic view for the active distant-zoom presentation.

**Strategic view**: The distant-zoom presentation of the island, anchored to the humanoid, with simplified terrain and recognizable information about explored resource deposits. It changes presentation without changing which actions are available.
