// Metres, Y-up. Shared by collision and the Blender asset recipe.
import type { BlockPart } from "./blocks.ts";
export const SHIP_PARTS: readonly BlockPart[] = [
  { name: "Hull", position: [0, 1.6, 0], size: [3.6, 2, 6], color: "#d9decb" },
  {
    name: "Belly",
    position: [0, 0.7, 0],
    size: [3, 0.5, 5.5],
    color: "#546e6d",
  },
  {
    name: "Cabin",
    position: [0, 2.7, -1.4],
    size: [2.7, 0.8, 2.5],
    color: "#537d87",
  },
  {
    name: "Nose",
    position: [0, 1.6, -3.4],
    size: [2.4, 1.5, 0.8],
    color: "#d9decb",
  },
  {
    name: "Port_wing",
    position: [-2.7, 0.85, 0.5],
    size: [1.8, 0.35, 3.6],
    color: "#dd9a5e",
  },
  {
    name: "Broken_wing",
    position: [2.25, 0.85, 1],
    size: [0.9, 0.35, 2],
    color: "#dd9a5e",
  },
  {
    name: "Detached_panel",
    position: [-4.8, 0.16, 2.6],
    size: [1.6, 0.3, 1.8],
    color: "#dd9a5e",
  },
  {
    name: "Engine_left",
    position: [-1.1, 1.5, 3.25],
    size: [0.8, 1.1, 0.7],
    color: "#384950",
  },
  {
    name: "Engine_right",
    position: [1.1, 1.5, 3.25],
    size: [0.8, 1.1, 0.7],
    color: "#384950",
  },
  {
    name: "Landing_left",
    position: [-1.3, 0.25, 1.7],
    size: [0.5, 0.5, 1.8],
    color: "#384950",
  },
  {
    name: "Landing_right",
    position: [1.3, 0.25, 1.7],
    size: [0.5, 0.5, 1.8],
    color: "#384950",
  },
  {
    name: "Landing_front",
    position: [0, 0.25, -2],
    size: [0.6, 0.5, 1.5],
    color: "#384950",
  },
  {
    name: "Antenna",
    position: [0.85, 3.3, 0.6],
    size: [0.12, 1.4, 0.12],
    color: "#384950",
  },
  {
    name: "Data_light",
    position: [0.85, 4, 0.6],
    size: [0.35, 0.18, 0.35],
    color: "#8ce6bd",
    emission: 1.2,
  },
  {
    name: "Console_stand",
    position: [3.5, 0.6, 2],
    size: [0.35, 1.2, 0.5],
    color: "#546e6d",
  },
  {
    name: "Console",
    position: [3.5, 1.3, 2],
    size: [1.2, 0.6, 0.45],
    color: "#384950",
  },
  {
    name: "Console_screen",
    position: [3.5, 1.32, 2.24],
    size: [0.95, 0.38, 0.04],
    color: "#8ce6bd",
    emission: 0.8,
  },
];
