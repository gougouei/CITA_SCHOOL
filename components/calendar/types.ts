export type EventType = "cours_live" | "examen" | "ceremonie" | "reunion" | "autre";

export interface CalendarEvent {
  id:          string;
  title:       string;
  description: string | null;
  event_type:  EventType;
  start_at:    string;
  end_at:      string | null;
  location:    string | null;
  class_id:    string | null;
  created_by:  string;
}

export interface ClassOption {
  id:   string;
  name: string;
}

export interface EventInput {
  title:        string;
  description:  string;
  event_type:   EventType;
  start_at:     string;     // ISO datetime
  end_at:       string;     // ISO datetime ou ""
  location:     string;
  class_id:     string | null;
}

export const EVENT_TYPES: { value: EventType; label: string; bg: string; color: string; dot: string }[] = [
  { value: "cours_live", label: "Cours live",  bg: "bg-[hsla(0,75%,45%,0.12)]",   color: "text-citsa-red-hex",      dot: "bg-citsa-red-hex" },
  { value: "examen",     label: "Examen",      bg: "bg-[hsla(35,90%,50%,0.12)]",  color: "text-[hsl(35,90%,35%)]",  dot: "bg-[hsl(35,90%,40%)]" },
  { value: "ceremonie",  label: "Cérémonie",   bg: "bg-[hsla(280,60%,50%,0.12)]", color: "text-[hsl(280,60%,35%)]", dot: "bg-[hsl(280,60%,40%)]" },
  { value: "reunion",    label: "Réunion",     bg: "bg-[hsla(200,70%,50%,0.12)]", color: "text-[hsl(200,70%,38%)]", dot: "bg-[hsl(200,70%,45%)]" },
  { value: "autre",      label: "Autre",       bg: "bg-muted-bg",                  color: "text-muted-fg",            dot: "bg-muted-fg" },
];

export const EVENT_TYPE_BY_VALUE: Record<EventType, typeof EVENT_TYPES[number]> = Object.fromEntries(
  EVENT_TYPES.map((t) => [t.value, t])
) as Record<EventType, typeof EVENT_TYPES[number]>;
