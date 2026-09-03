# -*- coding: utf-8 -*-
"""扫描页预处理: 灰度 -> 光照均衡 -> 自适应二值化 -> 去噪"""
import cv2, numpy as np, os

def prep(src, dst, mode='adaptive'):
    img = cv2.imread(src)
    if img is None: return None
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # 去除不均匀光照: 大核形态学背景估计后相除
    bg = cv2.morphologyEx(g, cv2.MORPH_CLOSE,
                          cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (41, 41)))
    norm = cv2.divide(g, bg, scale=255)
    if mode == 'adaptive':
        out = cv2.adaptiveThreshold(norm, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                    cv2.THRESH_BINARY, 35, 15)
    elif mode == 'otsu':
        out = cv2.threshold(cv2.GaussianBlur(norm, (3,3), 0), 0, 255,
                            cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
    else:
        out = norm
    out = cv2.medianBlur(out, 3)
    cv2.imwrite(dst, out)
    return dst
