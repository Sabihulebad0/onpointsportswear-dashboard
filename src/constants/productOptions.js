export const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "One Size"];

export const ITEM_TYPES = [
  { value: "standard", label: "Standard" },
  { value: "customizable", label: "Customizable" },
];

export const typeLabel = (value) =>
  ITEM_TYPES.find((item) => item.value === value)?.label || "Standard";

export const COLOR_OPTIONS = [
  { name: "Black", value: "#111111" },
  { name: "White", value: "#f5f5f5" },
  { name: "Grey", value: "#8a8f98" },
  { name: "Navy", value: "#0f2744" },
  { name: "Blue", value: "#1d6fd6" },
  { name: "Red", value: "#c24141" },
  { name: "Orange", value: "#e67e22" },
  { name: "Yellow", value: "#f1c40f" },
  { name: "Green", value: "#0f8a6a" },
  { name: "Purple", value: "#7c3aed" },
  { name: "Pink", value: "#db2777" },
  { name: "Brown", value: "#7c4a1e" },
];
