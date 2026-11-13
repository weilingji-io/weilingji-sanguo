#!/usr/bin/env bash
# 三国寻踪 · 部署到 sanguo.weilingji.com
# 用法：./scripts/deploy.sh
# 服务器：ubuntu@82.157.170.195（与微零清单同一台）
# 目录：/opt/weiling-sanguo（与 /opt/weiling-list 并列）
# Nginx：/etc/nginx/sites-available/sanguo.weilingji.com（Let's Encrypt 自动续期）
set -euo pipefail

cd "$(dirname "$0")/.."
SERVER="ubuntu@82.157.170.195"
REMOTE_DIR="/opt/weiling-sanguo"

echo "[1/3] 重建内容数据..."
node scripts/build-content.mjs

echo "[2/3] 同步到服务器（排除 _source 原始图）..."
rsync -az index.html "$SERVER:$REMOTE_DIR/"
rsync -az --delete --exclude='_source' --exclude='.DS_Store' assets/ "$SERVER:$REMOTE_DIR/assets/"
rsync -az data/ "$SERVER:$REMOTE_DIR/data/"

echo "[3/3] 校验线上..."
sleep 1
code=$(curl -s -o /dev/null -w "%{http_code}" https://sanguo.weilingji.com/data/site.json)
[ "$code" = "200" ] && echo "部署完成：https://sanguo.weilingji.com （site.json $code）" || { echo "校验失败：site.json HTTP $code"; exit 1; }
