export type UserRole = "admin" | "professor" | "student";

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Class {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  members_count?: number;
}

export interface AdmissionRequest {
  id: string;
  last_name: string;
  first_name: string;
  email: string;
  date_of_birth: string;
  country_of_birth: string;
  country_of_residence: string;
  marital_status: "single" | "married" | "divorced" | "widowed";
  number_of_children: number;
  occupation: string;
  how_discovered: string | null;
  motivation: string;
  photo_url: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface LiveSession {
  id: string;
  title: string;
  host_id: string;
  session_type: "class_live" | "broadcast";
  status: "scheduled" | "live" | "ended";
  recording_url: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface Exercise {
  id: string;
  title: string;
  description: string | null;
  exercise_type: "pdf" | "quiz" | "qcm";
  class_id: string;
  professor_id: string;
  file_url: string | null;
  created_at: string;
  questions?: ExerciseQuestion[];
}

export interface ExerciseQuestion {
  id: string;
  exercise_id: string;
  question_text: string;
  question_order: number;
  question_type: "single_choice" | "multiple_choice" | "open";
  options: string[] | null;
  correct_answer: unknown;
  points: number;
}

export interface ExerciseSubmission {
  id: string;
  exercise_id: string;
  student_id: string;
  answers: Record<string, unknown>;
  score: number | null;
  is_graded: boolean;
  submitted_at: string;
}

export interface ChatChannel {
  id: string;
  name: string | null;
  channel_type: "class" | "direct" | "general_students";
  class_id: string | null;
}

export interface ChatMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type:
    | "live_started"
    | "exercise_posted"
    | "new_message"
    | "file_uploaded"
    | "admission_update"
    | "general";
  reference_id: string | null;
  reference_type: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Library {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  files_count?: number;
}

export interface LibraryFile {
  id: string;
  library_id: string;
  file_name: string;
  file_type: "pdf" | "video" | "audio" | "pptx" | "other";
  file_url: string;
  file_size: number | null;
  storage_path: string;
  created_at: string;
}

export interface KpiData {
  students: number;
  professors: number;
  classes: number;
  libraries: number;
}
