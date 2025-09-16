// src/components/GenresList.jsx
import { GENRES_FLAT } from "./GenderFlat"; // mantém seu nome de arquivo atual

// Mapeia slugs para rótulos bonitos
const SPECIAL_LABELS = {
  "science-fiction": "Science Fiction",
  "magical-realism": "Magical Realism",
  "short-stories": "Short Stories",
  "graphic-novel": "Graphic Novel",
  "true-crime": "True Crime",
  "personal-development": "Personal Development",
  "nature-environment": "Nature & Environment",
  "spirituality-religion": "Spirituality & Religion",
  "health-wellness": "Health & Wellness",
  "cookbooks-food": "Cookbooks & Food",
  "art-photography": "Art & Photography",
  "picture-book": "Picture Book",
  "early-reader": "Early Reader",
  "middle-grade": "Middle Grade",
  "young-adult": "Young Adult",
  "poetry-general": "Poetry",
  "ya-fantasy": "YA Fantasy",
  "ya-romance": "YA Romance",
  "ya-dystopian": "YA Dystopian",
};

function toLabel(slug) {
  if (SPECIAL_LABELS[slug]) return SPECIAL_LABELS[slug];
  // Capitaliza palavras e trata "ya"
  return slug
    .split("-")
    .map((w) => (w.toLowerCase() === "ya" ? "YA" : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

export default function GenreSelect({
  value,
  onChange,
  id = "genre",
  name = "genre",
  placeholder = "Selecione um gênero",
  className = "",
}) {
  return (
    <select
      id={id}
      name={name}
      className={`border rounded-md px-3 py-2 w-full ${className}`}
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {GENRES_FLAT.map((slug) => (
        <option key={slug} value={slug}>
          {toLabel(slug)}
        </option>
      ))}
    </select>
  );
}
