@echo off
REM === pepe-manga.read - Windows task runner (mirror of the Makefile) =========
REM Usage:  make ^<target^>     e.g.  make android-apk
REM         make help          list targets
REM Override KEY_*/DB_* by setting env vars first, e.g.:
REM         set KEY_STOREPASS=secret ^&^& make android-keystore
setlocal enableextensions

set "ROOT=%~dp0"
pushd "%ROOT%" >nul

set "COMPOSE=docker compose"
set "BACKEND_SVC=backend"
set "FRONTEND_SVC=frontend"
set "DB_SVC=mysql"

if not defined DB_USER set "DB_USER=pepe-manga"
if not defined DB_PASS set "DB_PASS=pepe-mangapass"
if not defined DB_NAME set "DB_NAME=pepe-manga"

set "ANDROID_DIR=android_native"
if not defined KEYSTORE      set "KEYSTORE=%ANDROID_DIR%\release.jks"
if not defined KEY_ALIAS     set "KEY_ALIAS=pepe-manga"
if not defined KEY_STOREPASS set "KEY_STOREPASS=changeit"
if not defined KEY_KEYPASS   set "KEY_KEYPASS=%KEY_STOREPASS%"
if not defined KEY_DNAME     set "KEY_DNAME=CN=pepe-manga, OU=dev, O=pepe-manga, C=MX"

set "TARGET=%~1"
if "%TARGET%"=="" set "TARGET=help"

REM Verify the requested target exists before jumping to it.
findstr /b /c:":target_%TARGET%" "%~f0" >nul 2>&1
if errorlevel 1 (
  echo Unknown target: %TARGET%
  echo Run "make help" for the list.
  set "RC=1"
  goto :done
)
set "RC=0"
goto target_%TARGET%

REM === meta ===================================================================
:target_help
echo Targets:
echo   help                show this help
echo   build               (re)build all images
echo   up                  up + build, attached
echo   upd                 up + build, detached
echo   down                stop and remove containers + network
echo   stop                stop containers (keep them)
echo   start               start previously-stopped containers
echo   restart             restart all services
echo   ps                  list services
echo   logs                tail logs for all services
echo   logs-backend        tail backend logs
echo   logs-frontend       tail frontend logs
echo   logs-db             tail mysql logs
echo   mysql               mysql client connected to the pepe-manga database
echo   rescan              trigger backend to re-walk every watched folder
echo   reseed              drop all series/progress + re-seed sample data (DESTRUCTIVE)
echo   db-reset            wipe the mysql volume (DESTRUCTIVE)
echo   clean               stop services + remove containers
echo   clean-all           clean + remove volumes (DESTRUCTIVE)
echo   health              hit backend /health
echo   api-docs            open backend swagger docs in default browser
echo   open                open the frontend in default browser
echo   fe-install          install frontend deps locally
echo   fe-dev              run frontend dev server on host
echo   fe-build            production vite build on host
echo   be-install          install backend deps in a local venv
echo   be-dev              run backend on host (uses .venv)
echo   android-keystore    generate a release keystore + keystore.properties
echo   android-apk         build a release APK of android_native (signed if configured)
echo   android-aab         build a release App Bundle (.aab) of android_native (signed if configured)
echo   android-apk-debug   build a debug APK of android_native
echo   verify              compile-check backend + vite build the frontend
echo   py-check            byte-compile every backend .py
goto :done

REM === lifecycle ==============================================================
:target_build
%COMPOSE% build
goto :rc

:target_up
%COMPOSE% up --build
goto :rc

:target_upd
%COMPOSE% up -d --build
goto :rc

:target_down
%COMPOSE% down
goto :rc

:target_stop
%COMPOSE% stop
goto :rc

:target_start
%COMPOSE% start
goto :rc

:target_restart
%COMPOSE% restart
goto :rc

:target_ps
%COMPOSE% ps
goto :rc

REM === logs ===================================================================
:target_logs
%COMPOSE% logs -f --tail=200
goto :rc

:target_logs-backend
%COMPOSE% logs -f --tail=200 %BACKEND_SVC%
goto :rc

:target_logs-frontend
%COMPOSE% logs -f --tail=200 %FRONTEND_SVC%
goto :rc

:target_logs-db
%COMPOSE% logs -f --tail=200 %DB_SVC%
goto :rc

REM === shells / data ==========================================================
:target_mysql
%COMPOSE% exec %DB_SVC% mysql -u%DB_USER% -p%DB_PASS% %DB_NAME%
goto :rc

:target_rescan
curl -fsS -X POST http://localhost:8202/api/import/rescan && echo.
goto :rc

:target_reseed
echo ^>^>^> truncating series/chapters/progress/bookmarks/sources...
%COMPOSE% exec -T %DB_SVC% mysql -u%DB_USER% -p%DB_PASS% %DB_NAME% -e "SET FOREIGN_KEY_CHECKS=0; TRUNCATE TABLE bookmarks; TRUNCATE TABLE progress; TRUNCATE TABLE chapters; TRUNCATE TABLE series; TRUNCATE TABLE sources; SET FOREIGN_KEY_CHECKS=1;"
if errorlevel 1 goto :rc
%COMPOSE% restart %BACKEND_SVC%
goto :rc

:target_db-reset
%COMPOSE% down
docker volume rm pepe-manga-viewer_pepe-manga-mysql-data >nul 2>&1
%COMPOSE% up -d --build
goto :rc

:target_clean
%COMPOSE% down --remove-orphans
goto :rc

:target_clean-all
%COMPOSE% down -v --remove-orphans
goto :rc

REM === health =================================================================
:target_health
curl -fsS http://localhost:8202/health && echo.
goto :rc

:target_api-docs
start "" http://localhost:8202/docs
goto :done

:target_open
start "" http://localhost:8201
goto :done

REM === local (no-docker) helpers ==============================================
:target_fe-install
pushd frontend
call npm install
set "RC=%ERRORLEVEL%"
popd
goto :done

:target_fe-dev
pushd frontend
call npm run dev -- --host
set "RC=%ERRORLEVEL%"
popd
goto :done

:target_fe-build
pushd frontend
call npm run build
set "RC=%ERRORLEVEL%"
popd
goto :done

:target_be-install
pushd backend
python -m venv .venv
call .venv\Scripts\activate.bat
pip install -r requirements.txt
set "RC=%ERRORLEVEL%"
popd
goto :done

:target_be-dev
pushd backend
call .venv\Scripts\activate.bat
set "DATABASE_URL=mysql+pymysql://%DB_USER%:%DB_PASS%@localhost:8203/%DB_NAME%"
set "MANGA_ROOT=%CD%\sample_manga"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
set "RC=%ERRORLEVEL%"
popd
goto :done

REM === android ================================================================
:target_android-keystore
if exist "%KEYSTORE%" (
  echo ^>^>^> %KEYSTORE% already exists - refusing to overwrite
  set "RC=1"
  goto :done
)
keytool -genkeypair -v -keystore "%KEYSTORE%" -alias %KEY_ALIAS% -keyalg RSA -keysize 2048 -validity 10000 -storepass %KEY_STOREPASS% -keypass %KEY_KEYPASS% -dname "%KEY_DNAME%"
if errorlevel 1 goto :rc
for %%I in ("%KEYSTORE%") do set "KEYSTORE_NAME=%%~nxI"
(
  echo storeFile=%KEYSTORE_NAME%
  echo storePassword=%KEY_STOREPASS%
  echo keyAlias=%KEY_ALIAS%
  echo keyPassword=%KEY_KEYPASS%
) > "%ANDROID_DIR%\keystore.properties"
echo ^>^>^> wrote %ANDROID_DIR%\keystore.properties (git-ignored) - release builds will now be signed
goto :done

:target_android-apk
pushd "%ANDROID_DIR%"
call .\gradlew.bat assembleRelease
set "RC=%ERRORLEVEL%"
popd
if not "%RC%"=="0" goto :done
echo ^>^>^> APK(s) in %ANDROID_DIR%\app\build\outputs\apk\release\:
dir /b "%ANDROID_DIR%\app\build\outputs\apk\release\*.apk"
goto :done

:target_android-aab
pushd "%ANDROID_DIR%"
call .\gradlew.bat bundleRelease
set "RC=%ERRORLEVEL%"
popd
if not "%RC%"=="0" goto :done
echo ^>^>^> AAB(s) in %ANDROID_DIR%\app\build\outputs\bundle\release\:
dir /b "%ANDROID_DIR%\app\build\outputs\bundle\release\*.aab"
goto :done

:target_android-apk-debug
pushd "%ANDROID_DIR%"
call .\gradlew.bat assembleDebug
set "RC=%ERRORLEVEL%"
popd
if not "%RC%"=="0" goto :done
echo ^>^>^> APK(s) in %ANDROID_DIR%\app\build\outputs\apk\debug\:
dir /b "%ANDROID_DIR%\app\build\outputs\apk\debug\*.apk"
goto :done

REM === verify =================================================================
:target_verify
python -m compileall -q backend\app
if errorlevel 1 ( set "RC=1" & goto :done )
echo OK backend
pushd frontend
call npm run build
set "RC=%ERRORLEVEL%"
popd
goto :done

:target_py-check
python -m compileall -q backend\app
set "RC=%ERRORLEVEL%"
if "%RC%"=="0" echo OK backend
goto :done

REM === epilogue ===============================================================
:rc
set "RC=%ERRORLEVEL%"
:done
popd >nul
exit /b %RC%
