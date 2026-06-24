@echo off
chcp 65001 >nul
echo ============================================
echo  落葉谷網站 Git 初始化 + 推送 GitHub Pages
echo ============================================
echo.

cd /d "%~dp0"

REM 如果已經 init 過就跳過
if exist ".git" (
    echo [已存在 .git，略過 init]
    goto :remote
)

echo [1/5] git init...
git init
git branch -M main

:remote
echo [2/5] 設定遠端...
git remote remove origin 2>nul
git remote add origin https://github.com/fc884168-droid/lyg886688.git

echo [3/5] 設定 git 身份...
git config user.email "fc4168866@gmail.com"
git config user.name "fc884168-droid"

echo [4/5] 加入所有檔案...
git add .

echo [5/5] Commit + Push（會跳出瀏覽器登入 GitHub）...
git commit -m "init: 落葉谷網站上線"
git push -u origin main

echo.
echo ============================================
echo  完成！請到 GitHub Repo Settings ^> Pages
echo  設定 Source: main branch / (root)
echo ============================================
echo.
pause
