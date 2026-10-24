export const API_BASE_URL = "https://route-posts.routemisr.com/";
export const DEFAULT_PROFILE_IMAGE = "https://pub-3cba56bacf9f4965bbb0989e07dada12.r2.dev/linkedPosts/default-profile.png";
export const ROUTE_LOGO = "/route.png";

export const TOKEN_STORAGE_KEY = "route_posts_token";
export const BASE_URL_STORAGE_KEY = "route_posts_base_url";

// Regex for validation matching the demo
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;
export const PASSWORD_REGEX = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/;
export const PASSWORD_HINT = "Password must include uppercase, lowercase, number, and special character.";
