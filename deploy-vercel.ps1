$env:PATH = "C:\Users\THASAZ~1\node-v18.19.0-win-x64;$env:PATH"
$token = Get-Content -Path "C:\Users\THASAZ~1\compreouvenda\.vercel\auth.json.tmp" -Raw
$token = $token.Trim()
& "C:\Users\THASAZ~1\node-v18.19.0-win-x64\node.exe" "C:\Users\THASAZ~1\compreouvenda\node_modules\vercel\dist\index.js" deploy --prod --yes --token $token
