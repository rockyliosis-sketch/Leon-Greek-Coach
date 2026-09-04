# -*- coding: utf-8 -*-
"""单元数据文件共用的构造小助手。acc = 手写题额外接受的写法。"""
def I(page, tag, orig, q, ans, dis, zh, tip, acc=()):
    return dict(page=page, tag=tag, orig=orig, q=q, ans=ans, dis=dis, zh=zh, tip=tip, acc=list(acc))
