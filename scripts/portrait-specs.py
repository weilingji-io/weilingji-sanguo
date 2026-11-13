#!/usr/bin/env python3
"""生成 content/portraits.json —— 146 位人物的写实立绘提示词表。

用法: python3 scripts/portrait-specs.py
输入: content/master.json
输出: content/portraits.json (id, name, role, age, prompt, version)

人物画像分级：
- OVERRIDE: 知名人物按史书/演义容貌记载定制
- 其余按 role + faction 规则生成
统一画风：写实电影感人像摄影，素净暖灰宣纸底，侧逆光，85mm，禁文字水印。
"""
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parent.parent
master = json.loads((root / 'content' / 'master.json').read_text())
people = master['people']

VERSION = 'realistic-v1'
FEMALE = {'diaochan', 'zhenshi', 'sunfuren', 'ganfuren', 'huangyueying', 'daqiao', 'qiaoxiao', 'fuhou'}

# role -> (身份描述, 头饰, 服饰基调)
ROLE_DESC = {
    'ruler': ('君主诸侯', '黑色进贤冠，束发整齐', '交领右衽织锦锦袍，暗纹低调，外披大氅，腰系革带'),
    'strategist': ('谋士文臣', '灰色纶巾或黑色幅巾', '交领右衽宽袖儒袍，外披素色深衣或氅，腰束绦带'),
    'general': ('武将', '铁灰色束发帻巾', '内着交领战袍，外罩皮绳缀连的旧札甲与护肩，甲面有划痕与锈迹，腰系宽革带'),
    'civil': ('文官', '黑色幅巾', '交领右衽宽袖官袍，素雅缘饰，腰束革带'),
    'mystic': ('方士道人', '道巾裹头', '宽松道袍，布料朴拙'),
    'physician': ('医者', '素色布巾', '素净交领布袍，衣料朴拙但整洁'),
    'merchant': ('富商士人', '褐色幅巾', '赭褐色交领锦袍，料子厚实，腰系革带'),
}

FACTION_COLOR = {
    '蜀汉': '玄黑与赭红',
    '曹魏': '玄黑与土黄',
    '孙吴': '青碧与赭褐',
    '群雄': '铁灰与褐',
    '汉室': '深绛与玄黑',
    '西晋': '素青与月白',
}

BOILERPLATE = ('背景：素净暖灰宣纸色渐变虚化，无道具杂物。柔和侧逆光，浅景深，85mm 镜头，'
               '真实皮肤纹理与毛孔、细微胡须，胶片颗粒，克制的中性色调。要求：东亚人面孔，写实真人质感；'
               '画面中严禁出现任何文字、字母、印章、落款、边框、水印；不要卡通、动漫、3D渲染、塑料感美颜，不要游戏造型。')

# 知名人物定制：容貌 + 可覆盖头饰/服饰
OVERRIDE = {
    'liubei': {'age': 45, 'look': '额宽面方，双耳较大而垂，目细有神，留整齐的五绺短须，面色温润，眉间有历经风霜的沉稳', 'dress': '玄黑色交领右衽宽袖深衣，赭红色缘饰，外披深褐色素面大氅', 'head': '黑色幅巾，束发整齐'},
    'guanyu': {'age': 48, 'look': '面如重枣（肤色深红褐色），丹凤眼、卧蚕眉，双目微阖而含威，须髯极长过腹、色近乌黑，鬓角有霜', 'dress': '墨绿色交领右衽宽袖战袍，外罩旧牛皮札甲，甲片以麻绳缀连，肩部有磨痕', 'head': '青黑色布帻，束发'},
    'zhangfei': {'age': 42, 'look': '面色黝黑，豹头环眼（双眼圆大而明亮），燕颔虎须（腮旁虬髯浓密上翘），浓眉怒目，身材魁梧肩宽，面容粗犷', 'dress': '黑色札甲与铁制护肩，甲片以皮绳缀连，内着皂色（近黑）交领战袍，腰系宽革带，甲面有划痕与锈迹', 'head': '铁灰色束发帻巾'},
    'zhugeliang': {'age': 40, 'look': '清瘦面庞，面如冠玉，眉目疏朗，目光深远而从容，留五绺长须，鬓角微霜', 'dress': '素白色交领右衽宽袖儒袍，月白色暗纹鹤氅披于肩，腰束青灰色绦带', 'head': '白色纶巾，束发整齐', 'prop': '右手持一柄白色羽毛扇于胸前'},
    'zhaoyun': {'age': 38, 'look': '面容俊朗，剑眉星目，鼻梁挺直，短须整洁，身姿挺拔', 'dress': '白色交领战袍外罩银灰色轻甲，甲片细密，护肩素净', 'head': '白色帻巾，束发'},
    'caocao': {'age': 50, 'look': '瘦削而威严的中年面容，细长眼，目光锐利逼人，眉峰斜立，留短须，颧骨微高，鬓角有霜', 'dress': '玄黑色交领右衽锦袍，衣面有暗纹织锦，外罩黑漆皮制胸甲，肩披玄色大氅，腰系革带', 'head': '黑色进贤冠，束发'},
    'caopi': {'age': 32, 'look': '面容清俊，细目薄唇，短须整洁，眉宇矜持', 'dress': '玄黑色交领织锦锦袍，暗纹低调，外披大氅', 'head': '黑色进贤冠'},
    'simayi': {'age': 55, 'look': '长脸深目，颧骨较高，目光阴沉而深藏，短须斑白，神态审慎', 'dress': '玄黑色交领锦袍，暗纹低调，外披氅衣', 'head': '黑色进贤冠'},
    'sunquan': {'age': 40, 'look': '方颐大口，须髯呈紫褐色，目光炯炯有英气，眉骨分明', 'dress': '青碧色交领织锦袍，赭色缘饰，外披大氅', 'head': '黑色进贤冠'},
    'zhouyu': {'age': 32, 'look': '姿容俊美，剑眉入鬓，目若朗星，短须整洁，气质儒雅而英挺', 'dress': '青色交领儒将袍，外罩轻甲仅在肩部露出，腰束绦带', 'head': '青色纶巾'},
    'lusu': {'age': 42, 'look': '体格敦实，浓眉大眼，面容坦率大气，短须', 'dress': '青碧色交领宽袖袍，外披素氅', 'head': '灰色纶巾'},
    'lvmeng': {'age': 38, 'look': '面容坚毅，浓眉，短须，身形壮实', 'dress': '素白色交领战袍外罩深灰轻甲（士卒装扮）', 'head': '白色布帻'},
    'luxun': {'age': 35, 'look': '眉清目秀，面容沉静儒雅，眉宇间有超龄的沉稳，无须或短须极淡', 'dress': '青碧色交领儒袍，肩部有轻甲', 'head': '青灰色纶巾'},
    'sunce': {'age': 30, 'look': '年轻英武，剑眉朗目，笑容爽朗，短须，面容明朗', 'dress': '赭褐色交领战袍外罩轻甲', 'head': '铁灰色帻巾'},
    'sunjian': {'age': 38, 'look': '面容刚毅，虬髯，古铜色皮肤，目光悍勇', 'dress': '铁灰交领战袍外罩旧札甲', 'head': '铁灰色帻巾'},
    'xunyu': {'age': 42, 'look': '清雅端方，长须飘然，目光温和而深远', 'dress': '素雅土黄色交领宽袖袍', 'head': '黑色幅巾'},
    'guojia': {'age': 33, 'look': '年轻清瘦，眉宇飞扬，目光灵动带笑，短须', 'dress': '玄黑与土黄色调交领儒袍', 'head': '黑色幅巾'},
    'jiaxu': {'age': 58, 'look': '深沉内敛，眼窝略深，目光冷静，花白短须', 'dress': '玄黑色交领儒袍，朴素', 'head': '黑色幅巾'},
    'zhangliao': {'age': 45, 'look': '仪表堂堂，浓眉，长须整齐，身形魁梧', 'dress': '玄黑与土黄色调战袍外罩札甲', 'head': '铁灰色帻巾'},
    'xuchu': {'age': 42, 'look': '虎背熊腰，浓眉环眼，虬髯浓密，古铜色皮肤，面容憨悍', 'dress': '皮甲护肩，内着粗布战袍', 'head': '褐色布帻'},
    'xiahoudun': {'age': 48, 'look': '左眼微眯、眼周有旧伤疤，虬髯，面容悍厉', 'dress': '玄黑战袍外罩铁甲', 'head': '铁灰色帻巾'},
    'caoren': {'age': 45, 'look': '沉稳坚毅，短须，面容方正', 'dress': '玄黑战袍外罩厚实札甲', 'head': '铁灰色帻巾'},
    'caozhi': {'age': 28, 'look': '文秀清朗，眉目俊逸，目光洒脱，短须极淡', 'dress': '月白色交领儒袍，缘饰雅致', 'head': '黑色幅巾'},
    'pangtong': {'age': 34, 'look': '面貌朴拙不扬，浓眉深目，短髯，眼神机智狡黠', 'dress': '赭褐色交领宽袖儒袍', 'head': '深褐色纶巾'},
    'fazheng': {'age': 40, 'look': '面容精明，短须，目光锐利', 'dress': '玄黑与赭红调交领袍', 'head': '黑色幅巾'},
    'huangzhong': {'age': 65, 'look': '白发白须，精神矍铄，目光如炬，面容清癯而刚健', 'dress': '赭红战袍外罩旧札甲，肩背强弓的皮制箭囊带', 'head': '褐色帻巾，束发'},
    'machao': {'age': 33, 'look': '相貌俊朗，眉目英气，猿臂蜂腰身形矫健，短须', 'dress': '银白色战袍外罩银灰轻甲，肩披白色氅', 'head': '银灰色束发冠'},
    'weiyan': {'age': 45, 'look': '面容傲悍，虬髯，目有傲气，眉骨高', 'dress': '赭红战袍外罩旧甲', 'head': '铁灰色帻巾'},
    'jiangwei': {'age': 35, 'look': '年少英武，剑眉，短须，文武兼备的气质', 'dress': '玄黑与赭红调战袍外罩轻甲', 'head': '铁灰色帻巾'},
    'huanggai': {'age': 58, 'look': '苍髯老将，古铜色皮肤，体格结实，目光沉稳', 'dress': '青碧战袍外罩旧札甲', 'head': '铁灰色帻巾'},
    'ganning': {'age': 35, 'look': '豪悍矫健，虬髯，目露侠气', 'dress': '青碧战袍外罩皮甲，腰间挂铜铃形饰件', 'head': '青黑色帻巾'},
    'taishici': {'age': 38, 'look': '猿臂修长，面容英气，短须', 'dress': '青碧战袍外罩轻甲', 'head': '青灰色帻巾'},
    'zhangzhao': {'age': 60, 'look': '白须垂胸，面容持重慈和，眉目温文', 'dress': '青碧色交领宽袖官袍', 'head': '黑色幅巾'},
    'zhugejin': {'age': 42, 'look': '面容敦厚，长脸短须，目光宽和', 'dress': '青碧色交领官袍', 'head': '黑色幅巾'},
    'xushu': {'age': 38, 'look': '面容刚直，剑眉，短须，目光侠气', 'dress': '玄黑与赭红调交领袍', 'head': '灰色纶巾'},
    'lvbu': {'age': 35, 'look': '身形高大雄伟，剑眉虎目，面容俊伟，短髯', 'dress': '银灰色鱼鳞状皮甲，内着铁灰战袍，肩披赤色氅', 'head': '赤金束发冠，束发', 'prop': ''},
    'yuanshao': {'age': 52, 'look': '仪容威重，长须，眉宇间有世家贵气与自负', 'dress': '铁灰与褐调织锦锦袍，外披大氅', 'head': '黑色进贤冠'},
    'yuanshu': {'age': 45, 'look': '面容微胖自负，短须，眉目倨傲', 'dress': '铁灰与褐调织锦锦袍', 'head': '黑色进贤冠'},
    'dongzhuo': {'age': 55, 'look': '体态肥胖，满面横肉，虬髯，目光贪婪而威压', 'dress': '铁灰与褐调锦袍外罩皮甲，外披氅', 'head': '黑色进贤冠'},
    'liubiao': {'age': 60, 'look': '温雅长者，长须花白，眉目儒和', 'dress': '铁灰与褐调宽袖锦袍', 'head': '黑色幅巾'},
    'liuzhang': {'age': 45, 'look': '面容柔弱温和，短须，气质守成', 'dress': '铁灰与褐调锦袍', 'head': '黑色幅巾'},
    'liushan': {'age': 35, 'look': '面容圆润，眼神畏缩迟钝，眉目无主见', 'dress': '玄黑与赭红调锦袍', 'head': '黑色进贤冠'},
    'masu': {'age': 36, 'look': '书生气质，眉目聪明外露，短须', 'dress': '玄黑与赭红调青衿儒袍', 'head': '黑色幅巾'},
    'menghuo': {'age': 45, 'look': '体格粗壮，皮肤黝黑，披散头发，面容粗犷', 'dress': '南疆首领皮氅，缀羽饰与铜环纹样，肩挎兽皮带', 'head': '披发，额系铜色饰带'},
    'diaochan': {'age': 20, 'look': '面若桃花，柳叶细眉，杏眼含情，眼角微垂带一缕轻愁，肤色白皙细腻，乌黑长发梳理成汉末女子的堕马髻，鬓边留碎发', 'dress': '绛红色交领右衽曲裾深衣，衣料为细绢，领缘与袖口有暗金色织纹，腰束素色宽带', 'head': '发髻插素银珠钗与木簪，不施浓妆，妆容淡雅'},
    'zhenshi': {'age': 30, 'look': '端庄秀丽，眉目温婉，肌肤细腻，乌发高髻', 'dress': '月白色交领右衽深衣，暗纹低调，腰束素带', 'head': '高髻插素银珠钗，妆容淡雅'},
    'sunfuren': {'age': 28, 'look': '眉目英挺，目光飒爽，面容明艳', 'dress': '青红相间的束袖劲装，外罩短氅，腰系革带', 'head': '高髻束发，插赤金小钗'},
    'ganfuren': {'age': 40, 'look': '温婉中年妇人，眉目柔顺，面带慈色', 'dress': '素色交领深衣，朴素整洁', 'head': '低髻插木簪'},
    'huangyueying': {'age': 35, 'look': '目光灵慧，眉目朴拙，神态聪颖自信', 'dress': '朴拙土褐色交领布衣，袖口有墨渍痕迹', 'head': '简朴发髻插木簪'},
    'daqiao': {'age': 32, 'look': '温婉娴静，眉目柔美，面容清丽', 'dress': '素青色交领右衽深衣，料子轻软', 'head': '低髻插素银珠钗'},
    'qiaoxiao': {'age': 28, 'look': '明媚灵动，眉目含笑，面容清丽', 'dress': '淡青色交领右衽深衣，料子轻软', 'head': '低髻插素银珠钗'},
    'fuhou': {'age': 30, 'look': '眉目端庄，神色惶惑不安，面容憔悴', 'dress': '深绛与玄黑调交领深衣，料子厚重', 'head': '高髻插素银钗，妆面素净'},
    'huaxiong': {'age': 38, 'look': '面容凶悍，虬髯，体格魁梧', 'dress': '铁灰战袍外罩厚甲', 'head': '铁灰色帻巾'},
    'yanliang': {'age': 40, 'look': '河北猛将，面容凶悍，虬髯，体格魁梧', 'dress': '铁灰与褐调战袍外罩厚甲', 'head': '铁灰色帻巾'},
    'wenchou': {'age': 40, 'look': '面容凶悍，虬髯，浓眉环眼，体格魁梧', 'dress': '铁灰与褐调战袍外罩厚甲', 'head': '铁灰色帻巾'},
    'dianwei': {'age': 35, 'look': '浓眉环眼，虬髯短而密，古铜色皮肤，体格魁梧，面容憨猛', 'dress': '皮甲护肩，内着粗布战袍', 'head': '褐色布帻'},
    'chegong_chengong': {},
    'simahui': {'age': 65, 'look': '白须老者，面容松和带笑，目光通透', 'dress': '宽松素色道袍', 'head': '灰色道巾'},
    'huatuo': {'age': 62, 'look': '白须白发，神清目朗，面容清癯安详', 'dress': '素净交领布袍，整洁', 'head': '素色布巾'},
    'zuoci': {'age': 50, 'look': '面容清奇，目光灵动飘然，花白散发半束', 'dress': '葛布素色道袍，朴素飘逸', 'head': '葛巾裹头，散发半束'},
    'yuji': {'age': 55, 'look': '面容清癯，目光幽深，神态神秘', 'dress': '黑灰色道袍', 'head': '黑色道冠'},
    'zhangjiao': {'age': 48, 'look': '面容清奇，目光狂热，花白散发', 'dress': '土黄色道袍，腰系黄绦', 'head': '黄巾裹头'},
    'wangyun': {'age': 58, 'look': '长须花白，面容刚正，眉宇忧思', 'dress': '深绛与玄黑调汉官袍服', 'head': '黑色进贤冠'},
    'hejin': {'age': 45, 'look': '体格壮硕，面容粗豪，虬髯，气质骄横', 'dress': '深绛与玄黑调戎服外罩皮甲', 'head': '黑色进贤冠'},
    'kongrong': {'age': 50, 'look': '文士气度，长须，眉目清朗带傲', 'dress': '铁灰与褐调宽袖袍', 'head': '黑色幅巾'},
    'gongsunzan': {'age': 45, 'look': '面容悍锐，短须，目光机敏', 'dress': '白色氅衣内罩银灰轻甲', 'head': '银灰色束发冠'},
    'tianfeng': {'age': 48, 'look': '面容刚直，长须，目光恳切', 'dress': '铁灰与褐调青袍', 'head': '黑色幅巾'},
    'jushou': {'age': 50, 'look': '面容沉毅，短须，目光深远', 'dress': '铁灰与褐调青袍', 'head': '黑色幅巾'},
    'xuyou': {'age': 45, 'look': '面容促狭自得，山羊须，目光机变', 'dress': '铁灰与褐调袍服', 'head': '黑色幅巾'},
    'hansui': {'age': 58, 'look': '花白虬髯，古铜色皮肤，西凉老将面容', 'dress': '皮氅内罩旧甲', 'head': '褐色帻巾'},
    'mateng': {'age': 55, 'look': '花白虬髯，古铜色皮肤，面容悍勇', 'dress': '皮氅内罩旧甲', 'head': '褐色帻巾'},
    'gaoshun': {'age': 38, 'look': '沉默坚毅，面容冷峻，短须', 'dress': '铁灰战袍外罩齐整札甲', 'head': '铁灰色帻巾'},
    'zhoucang': {'age': 40, 'look': '黑面虬髯，浓眉环眼，体格壮硕', 'dress': '灰褐粗布战袍外罩皮甲', 'head': '褐色布帻'},
    'guanping': {'age': 28, 'look': '年轻武将，面容刚毅，短须极淡', 'dress': '玄黑与赭红调战袍外罩轻甲', 'head': '铁灰色帻巾'},
    'guanxing': {'age': 26, 'look': '年轻武将，面容英气，无须', 'dress': '玄黑与赭红调战袍外罩轻甲', 'head': '铁灰色帻巾'},
    'zhangbao': {'age': 25, 'look': '年轻武将，面容粗犷带少年气，无须', 'dress': '玄黑与赭红调战袍外罩轻甲', 'head': '铁灰色帻巾'},
    'maliang': {'age': 38, 'look': '眉间有白毛（白眉），文雅温润，短须', 'dress': '玄黑与赭红调儒袍', 'head': '黑色幅巾'},
    'qiaozhou': {'age': 58, 'look': '白须老学者，面容清癯，目光平和', 'dress': '玄黑与赭红调青衿儒袍', 'head': '黑色幅巾'},
    'dengai': {'age': 55, 'look': '面容朴实坚毅，鬓发斑白，短须', 'dress': '玄黑与土黄调布袍外罩轻甲', 'head': '褐色帻巾'},
    'zhonghui': {'age': 38, 'look': '面容倨傲，眉目自负，短须整洁', 'dress': '玄黑与土黄调锦袍', 'head': '黑色进贤冠'},
    'sima_zhao': {},
    'simashi': {'age': 45, 'look': '面容深沉，目光阴鸷，短须', 'dress': '素青与月白调锦袍', 'head': '黑色进贤冠'},
    'simazhao': {'age': 42, 'look': '面容深沉含威，短须，目光审视', 'dress': '素青与月白调锦袍', 'head': '黑色进贤冠'},
    'simayan': {'age': 28, 'look': '面容丰满，眉目开朗有帝王气度，短须', 'dress': '素青与月白调织锦袍，外披大氅', 'head': '黑色进贤冠'},
    'sunhao': {'age': 32, 'look': '面容乖张暴戾，眉目凶狠，短须', 'dress': '青碧与赭褐调锦袍', 'head': '黑色进贤冠'},
    'caozhen': {'age': 42, 'look': '面容沉稳，短须，体格健壮', 'dress': '玄黑战袍外罩札甲', 'head': '铁灰色帻巾'},
    'caoshuang': {'age': 35, 'look': '面容骄矜浮华，短须，目光游移', 'dress': '玄黑与土黄调锦袍', 'head': '黑色进贤冠'},
    'caozhang': {'age': 32, 'look': '鬓须微黄，面容勇壮，体格魁梧', 'dress': '玄黑战袍外罩轻甲', 'head': '铁灰色帻巾'},
    'caohong': {'age': 42, 'look': '面容豪迈，虬髯，体格壮实', 'dress': '玄黑战袍外罩皮甲', 'head': '铁灰色帻巾'},
    'xiahouyuan': {'age': 55, 'look': '面容悍急，花白短须，目光如鹰', 'dress': '玄黑战袍外罩旧札甲', 'head': '铁灰色帻巾'},
    'haozhao': {'age': 40, 'look': '面容坚毅朴讷，短须', 'dress': '玄黑战袍外罩厚甲', 'head': '铁灰色帻巾'},
    'caimao': {'age': 45, 'look': '面容精明，短须，体态轻捷', 'dress': '玄黑与土黄调轻甲战袍（水军都督）', 'head': '黑色幅巾'},
    'yujin': {'age': 55, 'look': '须发斑白，面容治军严整，神态端重', 'dress': '玄黑战袍外罩旧札甲', 'head': '铁灰色帻巾'},
    'lidian': {'age': 42, 'look': '面容儒雅好学，短须，神态温和', 'dress': '玄黑与土黄调儒将袍', 'head': '黑色幅巾'},
    'lejin': {'age': 45, 'look': '面容悍勇，短须，身形精悍', 'dress': '玄黑战袍外罩轻甲', 'head': '铁灰色帻巾'},
    'xuhuang': {'age': 48, 'look': '面容沉稳刚毅，短须，仪表整肃', 'dress': '玄黑战袍外罩札甲', 'head': '铁灰色帻巾'},
    'pangde': {'age': 42, 'look': '面容悍勇决绝，虬髯，目光决然', 'dress': '玄黑战袍外罩轻甲', 'head': '铁灰色帻巾'},
    'xunyou': {'age': 50, 'look': '面容温润多谋，短须，目光含蓄', 'dress': '玄黑与土黄调儒袍', 'head': '黑色幅巾'},
    'wanglang': {'age': 62, 'look': '白须老臣，面容丰润，神态端方', 'dress': '玄黑与土黄调官袍', 'head': '黑色进贤冠'},
    'huaxin': {'age': 58, 'look': '老臣面容，短须花白，神态严谨', 'dress': '玄黑与土黄调官袍', 'head': '黑色进贤冠'},
    'chenqun': {'age': 48, 'look': '面容端谨，短须，目光制度化的一板一眼', 'dress': '玄黑与土黄调官袍', 'head': '黑色幅巾'},
    'jianggan': {'age': 40, 'look': '面容促狭，山羊须，目光游移带笑', 'dress': '青碧与赭褐调袍服', 'head': '黑色幅巾'},
    'kanze': {'age': 45, 'look': '文士清瘦，短须，目光聪敏', 'dress': '青碧与赭褐调儒袍', 'head': '黑色幅巾'},
    'liuqi': {'age': 30, 'look': '面容清秀带病气，眉目忧悒，无须', 'dress': '铁灰与褐调素袍', 'head': '黑色幅巾'},
    'mizhu': {'age': 50, 'look': '面容殷实谦和，短须，体态富态', 'dress': '赭褐色交领锦袍，料子厚实', 'head': '褐色幅巾'},
    'mifang': {'age': 40, 'look': '面容怯懦游移，短须，眼神不定', 'dress': '玄黑与赭红调袍服外罩轻甲', 'head': '褐色帻巾'},
    'yan_yan': {},
    'chengpu': {'age': 58, 'look': '苍髯老将，面容沉稳，古铜肤色', 'dress': '青碧战袍外罩旧甲', 'head': '铁灰色帻巾'},
    'handang': {'age': 55, 'look': '三世老将，苍髯，古铜肤色，面容坚毅', 'dress': '青碧战袍外罩旧甲', 'head': '铁灰色帻巾'},
    'zhoutai': {'age': 45, 'look': '浑身疤迹的面容，虬髯，目光悍忠', 'dress': '青碧战袍外罩旧甲，甲下露出疤痕的胸颈', 'head': '铁灰色帻巾'},
    'lingtong': {'age': 30, 'look': '年轻少将，面容锐气，短须', 'dress': '青碧战袍外罩轻甲', 'head': '青灰色帻巾'},
    'xusheng': {'age': 40, 'look': '面容稳健，短须，目光机敏', 'dress': '青碧战袍外罩轻甲', 'head': '铁灰色帻巾'},
    'dingfeng': {'age': 55, 'look': '老将面容，苍髯，目光悍勇', 'dress': '青碧战袍外罩轻甲', 'head': '铁灰色帻巾'},
    'guyong': {'age': 55, 'look': '寡言持重，短须花白，面容沉静', 'dress': '青碧色交领官袍', 'head': '黑色幅巾'},
    'zhugeke': {'age': 42, 'look': '面容聪明外露，眉目倨傲，短须', 'dress': '青碧与赭褐调锦袍', 'head': '黑色进贤冠'},
    'lukkan': {'age': 42, 'look': '面容英挺儒雅，短须，目光沉稳', 'dress': '青碧与赭褐调战袍外罩轻甲', 'head': '铁灰色帻巾'},
    'panzhang': {'age': 45, 'look': '面容贪悍，短须，目光势利', 'dress': '青碧战袍外罩皮甲', 'head': '褐色帻巾'},
    'zhuran': {'age': 42, 'look': '面容坚忍，短须', 'dress': '青碧战袍外罩轻甲', 'head': '铁灰色帻巾'},
    'lu_kang': {},
    'dongcheng': {'age': 52, 'look': '忠愤老臣，长须花白，眉宇忧愤', 'dress': '深绛与玄黑调官袍', 'head': '黑色进贤冠'},
    'shenpei': {'age': 50, 'look': '面容沉毅忠直，短须，目光刚烈', 'dress': '铁灰与褐调袍服', 'head': '黑色幅巾'},
    'huangzu': {'age': 52, 'look': '老将面容倨傲，短须花白', 'dress': '青碧与赭褐调袍服外罩皮甲', 'head': '褐色帻巾'},
    'taoqian': {'age': 60, 'look': '温厚长者，长须花白，面容和善', 'dress': '铁灰与褐调宽袖袍', 'head': '黑色幅巾'},
    'zhangxiu': {'age': 38, 'look': '面容英悍，短须，北地枪王气质', 'dress': '铁灰与褐调战袍外罩轻甲', 'head': '铁灰色帻巾'},
    'chen_gong': {},
    'mengda': {'age': 42, 'look': '面容机变，短须，目光游移', 'dress': '玄黑与赭红调袍服', 'head': '黑色幅巾'},
    'wangping': {'age': 42, 'look': '面容沉毅朴讷，短须，行伍气质', 'dress': '玄黑与赭红调战袍外罩旧甲', 'head': '铁灰色帻巾'},
    'liaohua': {'age': 58, 'look': '苍髯老兵，面容坚韧，目光阅尽世事', 'dress': '玄黑与赭红调战袍外罩旧甲', 'head': '铁灰色帻巾'},
    'madai': {'age': 38, 'look': '面容英悍，短须', 'dress': '玄黑与赭红调战袍外罩轻甲', 'head': '铁灰色帻巾'},
    'jiangwan': {'age': 45, 'look': '面容温厚有度，短须，执政者沉稳', 'dress': '玄黑与赭红调官袍', 'head': '黑色幅巾'},
    'feiyi': {'age': 45, 'look': '面容聪敏圆融，短须', 'dress': '玄黑与赭红调官袍', 'head': '黑色幅巾'},
    'dongyun': {'age': 48, 'look': '面容端方刚正，短须', 'dress': '玄黑与赭红调官袍', 'head': '黑色幅巾'},
    'yangyi': {'age': 45, 'look': '面容急切精干，短须', 'dress': '玄黑与赭红调官袍', 'head': '黑色幅巾'},
    'liyan': {'age': 50, 'look': '面容自负精明，短须', 'dress': '玄黑与赭红调官袍外罩轻甲', 'head': '黑色幅巾'},
    'zhugezhan': {'age': 32, 'look': '年轻文官，眉目清俊，短须极淡', 'dress': '玄黑与赭红调官袍', 'head': '黑色幅巾'},
    'guanquan? huquan': {},
    'yanghu': {'age': 45, 'look': '儒雅都督，面容温和，短须，目光深远', 'dress': '素青与月白调儒将袍', 'head': '灰色纶巾'},
    'wangjun': {'age': 62, 'look': '白须老将，面容豪迈，目光坚定', 'dress': '素青与月白调战袍外罩轻甲', 'head': '铁灰色帻巾'},
    'duyu': {'age': 48, 'look': '清瘦儒将，短须，目光博学而锐利', 'dress': '素青与月白调儒袍外罩轻甲', 'head': '黑色幅巾'},
    'jianyong': {'age': 50, 'look': '面容诙谐温厚，短须', 'dress': '玄黑与赭红调袍服', 'head': '黑色幅巾'},
    'sunqian': {'age': 45, 'look': '面容谦和，短须，使者气质', 'dress': '玄黑与赭红调袍服', 'head': '黑色幅巾'},
    'liufeng': {'age': 28, 'look': '年轻武将，面容刚猛，无须', 'dress': '玄黑与赭红调战袍外罩轻甲', 'head': '铁灰色帻巾'},
}

# 兜底：脚本内 key 疏漏时用 id 直查
OVERRIDE.update({
    'chegong': {}, 'chen_gong': {}, 'simazhao2': {},
    'yan_yan': {}, 'lukang': {}, 'lu_kang': {},
})

# 角色修正（覆盖关键词误判）
ROLE_FIX = {
    'zhanghe': 'general', 'lvmeng': 'general', 'weiyan': 'general', 'wenchou': 'general',
    'chengong': 'strategist', 'dengai': 'general', 'duyu': 'general', 'guanping': 'general',
    'guansuo': 'general', 'liufeng': 'general', 'caozhang': 'general', 'zhoucang': 'general',
    'dongcheng': 'civil', 'lijue': 'general', 'guosi': 'general', 'sunqian': 'civil',
    'simashi': 'strategist', 'simazhao': 'strategist', 'simahui': 'mystic',
    'mizhu': 'merchant', 'liubiao': 'ruler', 'chengpu': 'general', 'zhoutai': 'general',
    'panzhang': 'general', 'zhangxiu': 'general', 'huangquan': 'civil', 'kanze': 'civil',
}

ROLE_DESC['woman'] = ('女子', '', '')

ROLE_KEYWORDS = [
    ('mystic', ['道', '方士', '太平道', '掷杯']),
    ('physician', ['神医']),
    ('ruler', ['帝', '君主', '开国之君', '霸主', '诸侯', '州牧', '旧主', '首领', '后主', '末帝', '一统', '称帝']),
    ('strategist', ['谋', '策', '计', '丞相', '执政', '托孤']),
    ('general', ['将', '武', '先锋', '宿将', '统帅', '水军', '护主', '断后', '破', '斩', '征', '守', '劫营', '都督', '都尉', '校尉']),
    ('civil', ['文臣', '文官', '侍中', '司徒', '学者', '说客', '文采', '司空', '尚书', '学者']),
]


def classify_role(p):
    text = p['tagline'] + p['bio'] + p['name']
    for role, kws in ROLE_KEYWORDS:
        if any(k in text for k in kws):
            return role
    return 'civil'


def parse_age(p):
    m = re.match(r'(\d{3})\D+(\d{3})', p.get('life') or '')
    if m:
        b, d = int(m.group(1)), int(m.group(2))
        if 130 <= b <= 260 and 140 <= d <= 300 and d > b:
            return max(25, min(55, round(b + (d - b) * 0.62)))
    return 45


def build_prompt(p, role, age, look, head, dress, prop):
    female = p['id'] in FEMALE
    gender = '女子' if female else '男性'
    if role == 'woman':
        faction_desc = f'{p["faction"]}的女子'
    else:
        faction_desc = ROLE_DESC[role][0]
    color = FACTION_COLOR.get(p['faction'], '铁灰与褐')
    parts = [
        '写实电影感人像摄影，半身正面肖像',
        f'人物为东汉末年{faction_desc}{p["name"]}（{p["zi"] if p["zi"] and p["zi"] != "无" else "无字"}），约{age}岁{gender}。',
    ]
    if look:
        parts.append(f'相貌：{look}。')
    parts.append(f'穿着：{dress}，衣料为麻、绢与旧皮革，颜色以{color}为主，有穿着与岁月痕迹。')
    parts.append(f'{"发式与妆饰" if female else "头戴"}：{head}。')
    if prop:
        parts.append(f'{prop}。')
    parts.append('神态：符合其身份阅历的自然神态。')
    parts.append(BOILERPLATE)
    return ''.join(parts)


def main():
    entries = []
    for p in people:
        ov = OVERRIDE.get(p['id']) or {}
        role = ov.get('role') or ROLE_FIX.get(p['id']) or ('woman' if p['id'] in FEMALE else classify_role(p))
        if role == 'woman':
            role_key = 'woman'
        else:
            role_key = role
        age = ov.get('age') or parse_age(p)
        look = ov.get('look', '')
        if role == 'woman' and not look:
            look = '眉目温婉的年轻女子，乌发，肌肤细腻，面容清丽'
        desc = ROLE_DESC[role_key]
        head = ov.get('head') or (desc[1] if not (role_key == 'woman' or p['id'] in FEMALE) else '低髻插素银珠钗，妆容淡雅')
        dress = ov.get('dress') or (desc[2] if role_key != 'woman' else '素色交领右衽深衣，料子轻软，腰束素带')
        prompt = build_prompt(p, role_key, age, look, head, dress, ov.get('prop', ''))
        entries.append({'id': p['id'], 'name': p['name'], 'role': role, 'age': age,
                        'prompt': prompt, 'version': VERSION})
    out = root / 'content' / 'portraits.json'
    out.write_text(json.dumps({'meta': {'version': VERSION, 'count': len(entries)},
                               'people': entries}, ensure_ascii=False, indent=1))
    print(f'wrote {out} with {len(entries)} portraits')


if __name__ == '__main__':
    main()
