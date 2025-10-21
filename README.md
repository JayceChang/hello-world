# hello-world

单日天气卡片（纯静态）

这是一个不依赖后端与构建工具的前端页面，基于 Open‑Meteo 与 OpenStreetMap Nominatim，展示“当天”的天气卡片。默认尝试使用浏览器定位；若定位不可用或被拒绝，可手动输入城市名称检索。

特性
- 显示城市、日期、天气图标/描述、当前温度、最高/最低、降水概率、最大风速、日出/日落时间
- 默认中文文案，同时保留英文映射（方便未来切换）
- 移动端优先的简洁卡片样式，柔和配色，响应式
- 加载与错误状态（定位失败、网络错误、未找到城市），可重试
- 无障碍：键盘可操作、aria-live 状态提示、可聚焦按钮

使用方式
1) 直接打开
- 直接双击 index.html 用浏览器打开即可查看卡片与搜索功能。
- 注意：部分浏览器在 file:// 打开时不允许地理定位（geolocation）。此时可手动输入城市名进行查询。

2) 本地静态服务器（推荐，定位更可靠）
- VS Code 用户：安装 Live Server 插件，右键 index.html -> Open with Live Server
- 或者在项目根目录运行一个简单的 HTTP 服务器：
  - Python 3: python3 -m http.server 5173
  - 然后访问 http://localhost:5173

文件说明
- index.html：页面结构与容器
- styles.css：主题色变量、卡片与响应式样式
- app.js：业务逻辑（定位、城市搜索、天气请求、渲染、无障碍）

数据来源
- 天气（免 Key）：Open-Meteo
  https://api.open-meteo.com/
- 城市到经纬度 & 逆地理：OpenStreetMap Nominatim
  https://nominatim.openstreetmap.org/

交互提示
- 回车键提交搜索；Tab 键在输入框与按钮间切换；按钮支持聚焦态
- “/” 快捷键可快速聚焦搜索输入

隐私与配额
- 该页面在浏览器端直接请求第三方接口，不收集个人信息
- Nominatim 与 Open‑Meteo 皆有使用频率限制，请避免频繁刷新

许可证
- 仅用于演示用途，API 的使用以各自服务条款为准

---

深色极简渐变壁纸生成脚本

本仓库同时提供一个用于生成深色、极简渐变风格桌面壁纸的 Python 脚本（基于 Pillow）。支持常见分辨率预设、自定义尺寸、配色、渐变角度、颗粒（grain）、暗角（vignette）以及可选轻微模糊。

安装
- Python 3.9+
- 在仓库根目录执行：
  - python -m venv .venv && source .venv/bin/activate
  - pip install -r requirements.txt

基础用法（示例）
- 生成 4K（3840×2160）默认配色、35° 渐变、适度颗粒与暗角：
  - python scripts/generate_wallpaper.py --preset 4k --start "#0B1220" --end "#1A2233" --angle 35 --grain 0.06 --vignette 0.2 --out output/wallpaper-4k.png

常用参数
- --preset {4k,1440p,1080p,ultrawide}：常见分辨率预设（如 4k=3840x2160）
- --width, --height：自定义分辨率；与 --preset 同时提供时，以具体宽高为准
- --start, --end：起止颜色（十六进制），如 #0B1220
- --angle：渐变角度（默认 35）
- --grain：颗粒强度 0~1（默认 0.06），数值越大颗粒越明显
- --vignette：暗角强度 0~1（默认 0.2），略微压暗边缘以突出中心
- --blur：可选高斯模糊半径（默认 0 关闭）。建议在开启颗粒前做轻微模糊以减少带状条纹
- --seed：整数，用于固定噪声以便复现；不传则随机
- --out：输出 PNG 路径（默认 output/wallpaper-4k.png）

更多风格示例
- 冷调蓝紫：
  - python scripts/generate_wallpaper.py --preset 4k --start "#0E0B19" --end "#1C1630" --angle 25 --grain 0.04 --vignette 0.18 --out output/wallpaper-purple-4k.png
- 深海青蓝（超宽 21:9）：
  - python scripts/generate_wallpaper.py --preset ultrawide --start "#0B1F1F" --end "#16333A" --angle 45 --grain 0.08 --vignette 0.25 --out output/wallpaper-teal-ultrawide.png
- 暖色极简（1440p，轻微模糊）：
  - python scripts/generate_wallpaper.py --preset 1440p --start "#0F0A0A" --end "#2A1E1B" --angle 30 --grain 0.05 --vignette 0.2 --blur 0.7 --out output/wallpaper-warm-1440p.png

说明
- 默认输出为 PNG（sRGB，8-bit），保存到 output/ 目录。首次运行会自动创建该目录。
- 参数错误会给出提示并退出；如需完全自定义尺寸，请同时传入 --width 与 --height。
- 若需结果可复现，请传入 --seed；同一参数与种子将得到完全一致的噪声纹理。
