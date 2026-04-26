Output website/assets/demo-search.gif

Set FontSize 13
Set Width 110
Set Height 20
Set Theme "Catppuccin Mocha"
Set Padding 20
Set TypingSpeed 50ms

# Requires: ONNX model already downloaded (run `mnemo update` once first)
# Run: npm link (once) then: vhs scripts/demo-search.tape

Hide
Exec "rm -rf /tmp/mnemo-search && mkdir -p /tmp/mnemo-search/src"
Exec "printf 'export function authenticateUser(token: string): boolean {\n  return token.startsWith(\"Bearer \");\n}\nexport function generateToken(userId: string): string {\n  return \"Bearer \" + userId;\n}\n' > /tmp/mnemo-search/src/auth.ts"
Exec "printf 'export async function queryDatabase(sql: string): Promise<unknown[]> {\n  return [];\n}\nexport function connectToDatabase(url: string): void {}\n' > /tmp/mnemo-search/src/database.ts"
Exec "printf 'import { authenticateUser } from \"./auth.js\";\nexport function requireAuth(req: Request): void {\n  if (!authenticateUser(req.headers.authorization ?? \"\")) throw new Error(\"Unauthorized\");\n}\n' > /tmp/mnemo-search/src/middleware.ts"
Exec "cd /tmp/mnemo-search && git init -q && git remote add origin https://github.com/acme/api.git"
Exec "cd /tmp/mnemo-search && mnemo init 2>/dev/null; true"
Exec "cd /tmp/mnemo-search && mnemo update 2>/dev/null; true"
Show

Sleep 800ms

Type "cd /tmp/mnemo-search"
Enter
Sleep 500ms

Type 'mnemo search "JWT authentication middleware"'
Sleep 700ms
Enter
Sleep 4s
