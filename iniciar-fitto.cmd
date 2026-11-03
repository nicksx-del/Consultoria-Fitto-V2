@echo off
title Fitto V2 - Servidor local
cd /d "%~dp0"
echo Iniciando o Fitto V2 em http://localhost:8082
echo Mantenha esta janela aberta enquanto estiver usando o site.
echo.
call npm run web -- --port 8082 --localhost --offline
echo.
echo O servidor foi encerrado. Se houve um erro, confira a mensagem acima.
pause
