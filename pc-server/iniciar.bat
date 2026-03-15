@echo off
title PC Server - Biblioteca Virtual
color 0B
cls

echo.
echo ========================================
echo   SERVIDOR PC - BIBLIOTECA VIRTUAL
echo ========================================
echo.
echo INSTRUCCIONES:
echo   1. Abre 2 terminales con cloudflared:
echo      - Terminal 1: cloudflared tunnel --url http://localhost:3001
echo      - Terminal 2: cloudflared tunnel --url http://localhost:3000
echo   2. Copia las URLs generadas
echo ========================================
echo.

:: Solicitar URLs
set /p "TUNNEL_URL=URL del PC-SERVER (tunel 3001): "
if "%TUNNEL_URL%"=="" (
    echo [ERROR] Debes ingresar la URL del PC-SERVER
    pause & exit /b 1
)

set /p "BIBLIOTECA_URL=URL de BIBLIOTECA-VIRTUAL (tunel 3000): "
if "%BIBLIOTECA_URL%"=="" (
    echo [ERROR] Debes ingresar la URL de la Biblioteca
    pause & exit /b 1
)

:: Mostrar configuración
echo.
echo ========================================
echo CONFIGURACION:
echo   PC Server: %TUNNEL_URL%
echo   Biblioteca: %BIBLIOTECA_URL%
echo ========================================
echo.

:: Actualizar config.json
echo Actualizando configuracion...
(
    echo {
    echo   "apiKey": "MiBiblioteca2024SecretKey_AbCdEfGh",
    echo   "serverUrl": "%BIBLIOTECA_URL%",
    echo   "booksFolder": "C:\\MisLibros",
    echo   "localPort": 3001,
    echo   "pcName": "Mi PC"
    echo }
) > config.json

echo Iniciando servidor...
echo.

:: Iniciar servidor
set "TUNNEL_URL=%TUNNEL_URL%"
node server.js

pause