#!/usr/bin/env python3
"""把 _source/people/ 下的原始 PNG 立绘处理为 assets/img/people/{id}.webp。

用法:
  python3 scripts/process-portraits.py            # 按 map.json 的映射处理
  python3 scripts/process-portraits.py --map      # 生成空映射文件模板

映射文件 _source/people/map.json: { "<personId>": "<源文件名.png>", ... }
处理规则: 裁掉底部 7%（生成水印区），等比缩放到宽 720px，输出 webp q82。
"""
import json
import sys
from pathlib import Path

from PIL import Image

root = Path(__file__).resolve().parent.parent
SRC = root / '_source' / 'people'
DST = root / 'assets' / 'img' / 'people'
MAP = SRC / 'map.json'
CROP_BOTTOM_RATIO = 0.07
TARGET_W = 720
QUALITY = 82

def main():
    DST.mkdir(parents=True, exist_ok=True)
    if '--map' in sys.argv:
        if MAP.exists():
            print(f'{MAP} 已存在')
        else:
            MAP.write_text('{\n}\n')
            print(f'写入模板 {MAP}')
        return
    if not MAP.exists():
        sys.exit('缺少 _source/people/map.json，先运行 --map 生成模板并填写映射')
    mapping = json.loads(MAP.read_text())
    done = skipped = 0
    for pid, fname in mapping.items():
        src = SRC / fname
        if not src.exists():
            print(f'! 跳过 {pid}: 源文件不存在 {fname}')
            skipped += 1
            continue
        img = Image.open(src).convert('RGB')
        w, h = img.size
        keep_h = int(h * (1 - CROP_BOTTOM_RATIO))
        img = img.crop((0, 0, w, keep_h))
        if img.width > TARGET_W:
            img = img.resize((TARGET_W, round(keep_h * TARGET_W / w)), Image.LANCZOS)
        out = DST / f'{pid}.webp'
        img.save(out, 'WEBP', quality=QUALITY, method=6)
        done += 1
    print(f'处理 {done} 张，跳过 {skipped} 张 → {DST}')

if __name__ == '__main__':
    main()
