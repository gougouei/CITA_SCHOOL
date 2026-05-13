export type MediaType = "image" | "video" | null;

export interface BlogAuthor {
  id:         string;
  full_name:  string;
  avatar_url: string | null;
  role:       "admin" | "professor" | "student";
}

export interface BlogPost {
  id:              string;
  author_id:       string;
  content:         string | null;
  media_url:       string | null;
  media_type:      MediaType;
  shared_post_id:  string | null;
  created_at:      string;
  // joined
  author:          BlogAuthor;
  like_count:      number;
  comment_count:   number;
  liked_by_me:     boolean;
  shared_post?:    BlogPost | null;
}

export interface BlogComment {
  id:         string;
  post_id:    string;
  author_id:  string;
  content:    string;
  created_at: string;
  author:     BlogAuthor;
}
