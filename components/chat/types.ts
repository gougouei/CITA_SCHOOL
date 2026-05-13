export type ChannelType = "class" | "direct" | "general_students";

export interface ChatChannel {
  id:           string;
  channel_type: ChannelType;
  display_name: string;          // Nom à afficher (nom classe ou nom autre user)
  class_id:     string | null;
  peer_id:      string | null;   // user_id de l'autre pour les DMs
  peer_avatar:  string | null;
}

export interface ChatMessage {
  id:          string;
  channel_id:  string;
  sender_id:   string;
  content:     string;
  created_at:  string;
  // Joined data
  sender_name:   string;
  sender_avatar: string | null;
}

export interface ClassPeer {
  user_id:    string;
  full_name:  string;
  username:   string;
  avatar_url: string | null;
  role:       "professor" | "student";
  class_name: string;
}
