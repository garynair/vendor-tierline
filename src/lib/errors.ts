import type { PostgrestError } from "@supabase/supabase-js";

// Our RPCs raise P0001/P0002 with messages written for end users; anything
// else (constraint names, SQL details) is translated or hidden.
export function friendlyError(error: PostgrestError, fallback = "Something went wrong. Try again.") {
  switch (error.code) {
    case "P0001":
    case "P0002":
    case "22023":
      return error.message;
    case "23505":
      return "That name is already in use.";
    case "23503":
      return "This is still in use by an assessment, so it can't be removed or changed.";
    case "23514":
      return "One of the values is out of range.";
    case "42501":
      return "You don't have permission to do that.";
    default:
      return fallback;
  }
}
