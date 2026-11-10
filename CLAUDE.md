# Project conventions for Claude

- Do NOT append `Co-Authored-By: Claude` or any other co-author trailer to
  commit messages. Just the message I give you, nothing else.
- Do NOT upgrade dependencies or run `npm audit fix` unless I ask.
- Do NOT modify files outside the scope of the current ask.
- Always `npm run build` before pushing.
- When touching Supabase schema or auth, remind me to run the SQL in the
  dashboard before pushing code that depends on it.
