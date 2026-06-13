Set-Location "C:\Users\THASAZ~1\COMPRE~1"
$env:PATH = "C:\Users\THASAZ~1\node-v18.19.0-win-x64;$env:PATH"
& node node_modules/next/dist/bin/next build *>&1 | Tee-Object -FilePath "build_log.txt"
