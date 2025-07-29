export const DATE_FORMAT = "yyyy-MM-dd";

export enum LogicOperator {
  Union = "union",
  Intersection = "intersection",
}

export enum FilterType {
  Artist = "urn:entity:artist",
  Book = "urn:entity:book",
  Brand = "urn:entity:brand",
  Destination = "urn:entity:destination",
  Movie = "urn:entity:movie",
  Person = "urn:entity:person",
  Place = "urn:entity:place",
  Podcast = "urn:entity:podcast",
  TVShow = "urn:entity:tv_show",
  VideoGame = "urn:entity:videogame",
  Heatmap = "urn:heatmap",
}

export enum Gender {
  Male = "male",
  Female = "female",
}

export enum SignalWeight {
  VeryLow = "very_low",
  Low = "low",
  Mid = "mid",
  Medium = "medium",
  High = "high",
  VeryHigh = "very_high",
}
