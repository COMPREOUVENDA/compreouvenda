@echo off
cd /d C:\Users\THASAZ~1\COMPRE~1
"C:\Users\THASAZ~1\node-v18.19.0-win-x64\node.exe" node_modules\next\dist\bin\next build 2>&1
echo BUILD_EXIT:%ERRORLEVEL%
