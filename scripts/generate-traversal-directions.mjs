import { writeFileSync } from "node:fs";
const scale = 10n ** 70n;
const pi = BigInt(
  "31415926535897932384626433832795028841971693993751058209749445923078164062".slice(
    0,
    71
  )
);
const values = [];
for (let i = 0; i <= 16384; i++) {
  const x = (pi * BigInt(i)) / 32768n,
    x2 = (x * x) / scale;
  let term = x,
    sum = x;
  for (let j = 1; j < 50; j++) {
    term = (-term * x2) / (scale * BigInt(2 * j) * BigInt(2 * j + 1));
    sum += term;
  }
  values.push(i === 16384 ? 16777216 : Number((sum * 16777216n) / scale));
}
writeFileSync(
  "src/packages/traversal-prototype/lib/directions-table.ts",
  "// Generated inward Q24 sine quarter-turn; see experiment evidence for recipe.\nexport const SIN = " +
    JSON.stringify(values) +
    ";\n"
);
