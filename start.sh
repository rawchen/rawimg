#!/bin/sh
APP_NAME=rawimg

# 启用 HttpURLConnection 的 keep-alive 连接池（与 RawimgApplication#configureHttpKeepAlive 同步）。
# 收益：避免每次 HTTP 调用都重新 TCP+TLS 握手，节省 ~200~800ms/次。
JAVA_OPTS="-Dhttp.keepAlive=true -Dhttp.maxConnections=20 -Dsun.net.www.http.KeepAlive.remainingData=true"

nohup java $JAVA_OPTS -Xmx300m -jar $APP_NAME.jar >> app.log 2>&1 &
echo $! > /var/run/$APP_NAME.pid
echo "$APP_NAME start successed pid is $! "