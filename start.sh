#!/bin/sh
APP_NAME=rawimg

nohup java -jar $APP_NAME.jar >> app.log 2>&1 &
echo $! > /var/run/$APP_NAME.pid
echo "$APP_NAME start successed pid is $! "