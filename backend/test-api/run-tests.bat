@echo off
set BASE=http://localhost:3001/api
set PASS=0
set FAIL=0
set EMAIL=apitest%RANDOM%@test.com
set PASSWORD=StrongPass1!

echo ========================================
echo  宠物平台 API 集成测试
echo ========================================
echo.

:: ─── 1. 弱密码拒绝 ───
echo [1] 弱密码应被拒绝
curl.exe -s -X POST %BASE%/auth/register -H "Content-Type: application/json" -d "{\"email\":\"weak@test.com\",\"name\":\"Weak\",\"password\":\"123\",\"roles\":\"OWNER\"}" | findstr "error" >nul && (echo   ✅ 弱密码被拒绝 & set /a PASS+=1) || (echo   ❌ 弱密码未被拒绝 & set /a FAIL+=1)

:: ─── 2. 强密码注册 ───
echo [2] 强密码注册
for /f "delims=" %%a in ('curl.exe -s -X POST %BASE%/auth/register -H "Content-Type: application/json" -d "{\"email\":\"%EMAIL%\",\"name\":\"Test User\",\"password\":\"%PASSWORD%\",\"roles\":\"OWNER\"}"') do set RES=%%a
echo %RES% | findstr "accessToken" >nul && (echo   ✅ 注册成功，收到双 token & set /a PASS+=1) || (echo   ❌ 注册失败 & set /a FAIL+=1)

:: 提取 accessToken
for /f "tokens=2 delims=:, " %%a in ('echo %RES% ^| findstr "accessToken"') do set TOKEN=%%~a
set ACCESS=%RES:~0,-1%

:: ─── 3. 重复注册 ───
echo [3] 重复邮箱应被拒绝
curl.exe -s -X POST %BASE%/auth/register -H "Content-Type: application/json" -d "{\"email\":\"%EMAIL%\",\"name\":\"Test User\",\"password\":\"%PASSWORD%\",\"roles\":\"OWNER\"}" | findstr "error" >nul && (echo   ✅ 重复邮箱被拒绝 & set /a PASS+=1) || (echo   ❌ 重复邮箱未拒绝 & set /a FAIL+=1)

:: ─── 4. 登录 ───
echo [4] 正确密码登录
for /f "delims=" %%a in ('curl.exe -s -X POST %BASE%/auth/login -H "Content-Type: application/json" -d "{\"email\":\"%EMAIL%\",\"password\":\"%PASSWORD%\"}"') do set LOGIN=%%a
echo %LOGIN% | findstr "accessToken" >nul && (echo   ✅ 登录成功，收到双 token & set /a PASS+=1) || (echo   ❌ 登录失败 & set /a FAIL+=1)

:: 提取 refreshToken
set REFRESH_STR=%LOGIN%
set REFRESH=%LOGIN:~0,-1%

:: ─── 5. 错误密码登录 ───
echo [5] 错误密码应被拒绝
curl.exe -s -X POST %BASE%/auth/login -H "Content-Type: application/json" -d "{\"email\":\"%EMAIL%\",\"password\":\"wrongpass\"}" | findstr "error" >nul && (echo   ✅ 错误密码被拒绝 & set /a PASS+=1) || (echo   ❌ 错误密码未被拒绝 & set /a FAIL+=1)

echo.
echo ====== 结果: %PASS% 通过, %FAIL% 失败 ======
if %FAIL% gtr 0 exit /b 1
