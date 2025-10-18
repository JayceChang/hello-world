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
