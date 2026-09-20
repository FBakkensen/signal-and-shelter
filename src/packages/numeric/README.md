# Deterministic numeric foundation

Production library for the accepted [numeric design](../../../docs/numeric-design.md) and [physics contract](../../../docs/physics-design.md). Normal play does not consume it yet. Numeric, table, seed and random versions are all **1**; changing these algorithms or bytes requires a version change. Tick frequency is 60 Hz.

## Entry points

- `index.ts`: region axes, checked integers/division, counters, directions, target conversion, motion residues and contact projection.
- `random.ts`: seed normalization, canonical key encoding, addressed random words and immutable integer draws.
- `capabilities.ts`: individual effective movement units and humanoid defaults; validation does not establish physical feasibility.
- `generate.ts`: offline Node-only table recipe/checksum utility. Never import it in runtime modules.

All numeric inputs are checked, including structurally typed coordinates supplied by callers. Invalid inputs throw before publishing a result. Operations do not mutate caller state. Persist residues, stream counters and individual capabilities in the later authoritative snapshot.

## Coordinates and motion

An axis is `{ region, local }`: signed-32 region index and integer local millimetres in `[0,15999]`. `normalizeAxis` accepts a safe-integer noncanonical local value and floor-normalizes it; `moveAxis` accepts an already canonical axis and at most ±1,000,000 mm. `rebaseAxis` computes an exact relative displacement of at most ±1,000,000 mm without flattening global coordinates. Distant queries must use region traversal or a separately bounded wide operation.

`divide(n,d)` accepts safe integers with positive `d`, returning a floor quotient and nonnegative remainder. `roundRatio` rounds nearest with half ties toward positive infinity, without unsafe numerator doubling/addition. `advanceCounter` enforces the maximum `2^48−1`; overflow throws. Negative zero is normalized at integer boundaries.

Headings are integers `[0,65535]`, zero along +x, increasing toward +z. `direction` reconstructs Q24 x/z components from a private frozen quarter sine table. `targetHeading(x,z)` accepts bounded relative components and exhaustively selects the greatest exact dot product, breaking ties by lowest heading; zero returns `null`. It is the deterministic reference implementation, not a measured high-throughput planner. Equal dot products can favor a nearby table index rather than an intuitively exact cardinal/diagonal index. Host camera-angle quantization is a later host-adapter responsibility.

`stepMotion(headingOrNull,speed,residue)` consumes integer mm/tick speed in `[0,1000000]` and world-axis residues in `[-2^23,2^23)`. It returns rounded integer displacement and new residue. A null heading adds zero and retains residues. Turning and reversal retain the accumulated identity. `projectResidue` clears only the axes physics identifies as blocked. It does not classify contact, approve movement or redistribute rejected displacement.

Largest component numerator is bounded by `1000000 * 2^24 + 2^23`; a two-axis target dot product by `2 * 1000000 * 2^24`. Both fit exact Number integers. These bounds do not authorize chained geometry products; later contact kernels own their bounds/exact wide comparisons.

## Table recipe

Run `npm run numeric:generate` to regenerate, or `npm run numeric:verify` to compare the checked-in source exactly. SHA-256 covers 16,385 signed-32 little-endian entries (65,540 bytes), not TypeScript source text. The exported checksum identifies the bytes.

The recipe uses the embedded decimal digits of pi and a BigInt fixed-decimal Taylor recurrence at 90 decimal places. Values are truncated inward to Q24, with exact zero and quarter-turn endpoints. Tests regenerate independently at 60 decimal places, compare every entry, check every reconstructed direction's inward norm/deficit and symmetry, and lock the checksum. No runtime trigonometric function determines movement. This table approximation is separate from heading quantization and position rounding.

## Random encoding v1

A resolved seed uses the existing case-sensitive convention: trim, truncate to 80 UTF-16 units, replace lone surrogates with U+FFFD, then trim again so truncation cannot expose trailing whitespace. Blank seed selection belongs to the host; streams require a nonempty canonical seed. Purpose and stable entity identity are well-formed Unicode strings, without implicit normalization. Coordinate-addressed generation can use stable integer-coordinate entity keys; the generator must version that key convention.

Encode seed, purpose and entity in that order. Each is UTF-8 prefixed with an unsigned-32 little-endian byte length. Append a six-byte unsigned little-endian draw counter (low 32-bit word then high 16-bit word). Version is recorded separately, not prepended to v1 bytes. Hash all bytes with FNV-1a, then xor-shift 13, multiply modulo `2^32` by 1,274,126,177, xor-shift 16. Only hash operations use modular arithmetic.

`randomWord(key,counter)` is stateless addressing, accepting counters through `2^48−1`. `createRandomStream`/`drawInteger` use the counter as the next draw index. The maximum counter denotes exhaustion because a subsequent count cannot be represented. Each accepted or rejected sample increments it; results return the new immutable state. Exhaustion throws and leaves the input unchanged, even if rejection occurred. Callers must treat exhaustion as a fault, not silently retry forever.

Ranges are inclusive; endpoints are integers in `[-2^31,2^32−1]` and range width is at most `2^32`. Reject words at or above `2^32 − (2^32 mod width)`, then map the remainder. No intermediate float fraction is used.

Golden vectors for seed `signal-and-shelter`, purpose `terrain`, entity `cell:-1,0,2`:

| Counter         | Word       |
| --------------- | ---------- |
| 0               | 4043637905 |
| 1               | 1652397872 |
| 4294967296      | 1208673779 |
| 281474976710655 | 3409356750 |

The inclusive range `[0,2147483648]` rejects the first word and returns 1652397872 with next counter 2. Unicode encoding/hash and independent BigInt modular reference vectors are in the public-interface tests.

## Individual capabilities

Lengths are integer mm, speeds integer mm/tick, acceleration integer mm/tick² and durations whole ticks. Numeric bounds are local-kernel bounds, not promises that every combination produces a feasible trajectory. Defaults: support 440×440, body 600×600×1800, walking 70, acceleration 7, elevation 1000, apex 1250, preparation/recovery 7 each, alignment 250. Each actor may supply a different validated profile, including `canJump: false`. No station, upgrade or movement state machine is implemented here.
