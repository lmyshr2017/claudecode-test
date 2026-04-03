# 工时记录工具 · 设计文档

**创建日期**：2026-04-03
**状态**：已批准
**对应 PRD**：v1.1
**对应技术文档**：v1.0

---

## 一、项目概述

个人工时记录工具，帮助员工自主记录每日上下班时间与加班时长。数据存储于 Supabase 云端，支持多设备同步，按自定义统计周期汇总加班数据。

**项目目录**：`D:/code-my/hn-web`
**部署目标**：Vercel（前端静态）+ Supabase（数据库 + Auth）

---

## 二、技术选型（已确认）

| 层级 | 技术 |
|------|------|
| 前端框架 | Vue 3 + Vite |
| UI 组件 | Vant 4（移动端，主题色定制） |
| 路由 | Vue Router 4 |
| 状态管理 | Pinia |
| 数据层 | Supabase JS SDK（直连，无 Hono 中间层） |
| 认证 | Supabase Auth（邮箱登录） |
| 图表 | 纯 SVG（轻量，无第三方图表库） |
| 部署 | Vercel |

**架构决策**：前端直接调用 Supabase JS SDK，跳过 Hono 后端层。安全由 Supabase RLS 在数据库层强制保障（用户只能读写自己的数据）。

---

## 三、目录结构

```
hn-web/
├── public/
│   ├── manifest.json          # PWA 基础配置
│   └── icons/                 # PWA 图标（192 / 512）
├── src/
│   ├── api/                   # Supabase SDK 操作封装
│   │   ├── auth.js            # 登录、注册、登出、profile 读写
│   │   ├── records.js         # 工时记录 CRUD + upsert
│   │   └── settings.js        # 用户设置读取 / 更新
│   ├── components/
│   │   ├── CalendarView.vue   # 月历视图（色块标记已记录日期）
│   │   ├── RecordSheet.vue    # 底部弹窗表单（新增 / 编辑 / 删除）
│   │   ├── StatCard.vue       # 概览数据卡片
│   │   └── BarChart.vue       # 每日加班柱状图（SVG 实现）
│   ├── pages/
│   │   ├── LoginPage.vue      # 登录 / 注册
│   │   ├── DashboardPage.vue  # 数据总览
│   │   ├── RecordsPage.vue    # 日历视图记录页
│   │   └── SettingsPage.vue   # 设置页
│   ├── router/
│   │   └── index.js           # 路由配置 + 登录守卫
│   ├── stores/
│   │   ├── auth.js            # 用户认证状态
│   │   ├── records.js         # 工时记录状态 + 统计计算
│   │   └── settings.js        # 用户配置状态 + 当期周期计算
│   ├── utils/
│   │   ├── supabase.js        # createClient 初始化
│   │   ├── dateUtils.js       # 周期计算、进度计算、日历日期生成
│   │   └── calcOT.js          # 加班时长计算（0.5h 精度）
│   ├── App.vue                # 底部 TabBar + RouterView
│   └── main.js
├── docs/
│   └── superpowers/specs/     # 设计文档存放目录
├── .env.local                 # Supabase 密钥（不入 git）
├── .env.example               # 环境变量模板（入 git）
├── vite.config.js
├── vercel.json
└── package.json
```

---

## 四、数据库设计（Supabase）

### 表结构

```sql
-- 用户昵称扩展表
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nickname    text,
  created_at  timestamptz default now()
);

-- 工时记录表
create table public.records (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  start_time  time,
  end_time    time,
  ot_hours    numeric(4,1) not null default 0,
  note        text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique(user_id, date)
);

-- 用户设置表
create table public.settings (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  std_hours        numeric(3,1) not null default 8,
  period_start_day smallint not null default 25,
  period_end_day   smallint not null default 24,
  updated_at       timestamptz default now()
);
```

### Row Level Security

```sql
-- profiles
alter table public.profiles enable row level security;
create policy "用户只能操作自己的 profile"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- records
alter table public.records enable row level security;
create policy "用户只能操作自己的记录"
  on public.records for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- settings
alter table public.settings enable row level security;
create policy "用户只能操作自己的设置"
  on public.settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 索引
create index idx_records_user_date on public.records(user_id, date desc);
```

---

## 五、状态管理设计（Pinia Stores）

### `stores/auth.js`

**状态**：`user`（Supabase Auth User 对象）、`profile`（`{ nickname }`）、`loading`

**动作**：
- `fetchUser()` — 应用启动时调用，从 Supabase 恢复登录态
- `login(email, password)` — 登录，成功后拉取 profile
- `register(email, password, nickname)` — 注册，同时写入 profiles 表
- `logout()` — 登出，清除本地状态
- `fetchProfile()` — 拉取昵称等扩展信息

### `stores/settings.js`

**状态**：`stdHours`（默认 8）、`periodStartDay`（默认 25）、`periodEndDay`（默认 24）、`loading`

**计算属性**：
- `currentPeriod` — 根据今天日期 + 配置返回 `{ start: "2026-03-25", end: "2026-04-24" }`

**动作**：
- `fetchSettings()` — 登录后拉取，不存在时写入默认值（upsert）
- `updateSettings(patch)` — 更新指定字段，乐观更新本地状态

### `stores/records.js`

**状态**：`records`（`Map<dateString, RecordObject>`）、`loading`

**计算属性**（依赖 `settingsStore.currentPeriod`）：
- `currentPeriodRecords` — 当期所有记录数组（按日期排序）
- `totalOTHours` — 当期加班总时长
- `recordedDays` — 当期已记录天数
- `avgOTHours` — 平均每日加班（totalOTHours / recordedDays，0 时显示 `--`）
- `maxOTDay` — 加班最长单日 `{ date, ot_hours }`
- `periodProgress` — 当前日期在周期内的进度百分比（0-100）

**动作**：
- `fetchByRange(start, end)` — 拉取指定日期范围的记录，写入 Map
- `upsert(record)` — 新增或更新记录，乐观更新 Map
- `remove(date)` — 删除记录，乐观更新 Map

---

## 六、工具函数设计

### `utils/calcOT.js`

```javascript
/**
 * 根据上下班时间和标准工时计算加班时长
 * @param {string} startTime  "09:00"
 * @param {string} endTime    "21:00"
 * @param {number} stdHours   8
 * @returns {number} 加班时长（小时，0.5 步进）
 */
export function calcOTHours(startTime, endTime, stdHours = 8)
```

- 跨天班次（endTime < startTime）自动加 24h 处理
- 结果取 `Math.round(ot * 2) / 2`（0.5h 精度）
- 任意一个时间为空时返回 0

### `utils/dateUtils.js`

```javascript
// 根据今天日期和周期配置，计算当前所在统计周期的起止日期
export function getCurrentPeriodRange(startDay, endDay)

// 根据指定年月和周期配置，计算该月对应的统计周期
export function getPeriodRange(year, month, startDay, endDay)

// 计算当前日期在统计周期中的进度百分比
export function calcPeriodProgress(start, end)

// 生成月历所需的 42 个格子（6行×7列）
// 每格包含：date(Date对象)、inCurrentMonth(bool)、inPeriod(bool)
export function getCalendarDates(year, month, periodStart, periodEnd)

// 格式化日期为 "YYYY-MM-DD" 字符串
export function formatDate(date)

// 格式化统计周期显示文本，如 "3月25日 — 4月24日"
export function formatPeriodLabel(start, end)
```

---

## 七、页面设计

### 7.1 登录页 `LoginPage.vue`

- 顶部：产品 Logo + 名称"工时"（大号加粗，暖黑色）
- Tab 切换：登录 / 注册
- 登录表单：邮箱、密码
- 注册表单：昵称、邮箱、密码（≥6位）
- 主按钮：Amber 品牌色，圆角饱满
- 错误提示：Vant Toast 展示

### 7.2 总览页 `DashboardPage.vue`

**Hero 区块**（`#18181B` 深炭色背景，无渐变）：
- 顶部行：当期周期文字（次级白色）+ 右侧设置图标
- 中央：当期加班总时长（超大字号，白色，Amber 单位"h"）
- 底部行：3 个小指标（已记录天数 / 日均加班 / 最长单日）

**卡片区**（米白背景）：
- 周期进度卡片：细线进度条（Amber），左右显示起止日期，中间显示百分比
- 柱状图卡片：标题"本期每日加班"，SVG 柱状图，加班日 Amber 色，零值暖灰
- 历史周期列表：每行显示周期区间标签 + 加班总时长；点击某行后向下展开，展示该期每日记录列表（日期 + 加班时长 + 备注摘要），同一行再次点击收起；展开时同步拉取该期记录（`fetchByRange`）

### 7.3 记录页 `RecordsPage.vue`

- 顶部：`← 2026年4月 →` 月份切换
- 右上角：`+` 按钮（快速录入今日）
- 月历 7 列网格：
  - 格内：日期数字（当月）/ 暗淡数字（补位日）
  - 色块：绿色小圆点（有加班记录）/ 暖灰小圆点（已记录无加班）/ 无标记（未记录）
  - 不在统计周期内的日期：灰色，不可点击
- 点击日期：底部滑出 `RecordSheet`

**RecordSheet 表单**：
- 标题：日期（如"4月3日 周五"）
- 字段：上班时间（时间选择器）、下班时间（时间选择器）、加班时长（步进器，0.5步进）、备注（文本输入，限100字）
- 自动计算：两个时间填写完毕后，加班时长字段实时更新（可手动覆盖）
- 跨天班次处理：当下班时间早于上班时间时，弹出 Vant Dialog 提示"下班时间早于上班时间，是否按跨天处理？"，用户确认后按 +24h 计算加班时长
- 操作按钮：保存（Amber）/ 删除（红色文字，已有记录时显示）
- 删除二次确认：Vant Dialog

### 7.4 设置页 `SettingsPage.vue`

分组卡片布局：

**账号信息**
- 昵称 + 账号（邮箱）展示
- 退出登录（红色文字）

**工时配置**
- 标准工时：数字步进，默认 8h
- 统计周期：起始日 + 结束日独立输入框（1-28）
- 实时预览文字："每月 25 日 — 次月 24 日"
- 保存按钮

**数据**
- 云同步状态：最后同步时间 + 手动同步按钮
- 数据导出：CSV 导出，支持全部 / 当前周期 / 自定义范围

---

## 八、视觉设计系统

### 色彩

| 用途 | 色值 | 说明 |
|------|------|------|
| 品牌主色 | `#D97706` | Amber，温暖有能量，避免蓝紫 |
| 深色文字 | `#1C1917` | 暖黑 |
| 次级文字 | `#78716C` | 暖灰 |
| 页面背景 | `#F8F7F4` | 米白微暖 |
| 卡片背景 | `#FFFFFF` | |
| Hero 背景 | `#18181B` | 深炭色，纯色无渐变 |
| 加班标记 | `#16A34A` | 绿色 |
| 正常出勤 | `#D4D0C8` | 暖灰 |
| 危险操作 | `#DC2626` | 红色 |

### 卡片规范
- `border-radius: 16px`
- `border: 1px solid #F0EDE8`（细线代替阴影）
- 内边距：`20px`

### Vant 主题定制（CSS 变量覆盖）
```css
:root {
  --van-primary-color: #D97706;
  --van-button-primary-background: #D97706;
  --van-button-primary-border-color: #D97706;
  --van-slider-active-background: #D97706;
  --van-tabs-bottom-bar-color: #D97706;
}
```

### 排版
- 数据大字：`font-size: 2.5rem; font-weight: 800`
- 卡片标题：`font-size: 0.875rem; color: #78716C`
- 正文：`font-size: 1rem; color: #1C1917`

---

## 九、路由设计

```
/login          LoginPage       guest-only（已登录跳 /dashboard）
/               → redirect /dashboard
/dashboard      DashboardPage   requiresAuth
/records        RecordsPage     requiresAuth
/settings       SettingsPage    requiresAuth
```

底部 TabBar（App.vue）：总览 / 记录 / 设置（3 个 Tab，登录页不显示）

---

## 十、开发实现顺序（方案二：数据驱动）

1. **项目初始化**：`npm create vite`，安装依赖，配置 vite.config.js、vercel.json
2. **基础设施**：`.env.local`、`supabase.js`、工具函数（`calcOT.js`、`dateUtils.js`）
3. **Pinia Stores**：auth → settings → records（含所有 computed）
4. **API 封装层**：`api/auth.js`、`api/records.js`、`api/settings.js`
5. **路由 + 守卫**：`router/index.js`，TabBar 骨架（`App.vue`）
6. **登录页**：`LoginPage.vue`（登录 + 注册 Tab）
7. **设置页**：`SettingsPage.vue`（统计周期配置最关键，优先实现）
8. **记录页**：`RecordsPage.vue` + `CalendarView.vue` + `RecordSheet.vue`
9. **总览页**：`DashboardPage.vue` + `StatCard.vue` + `BarChart.vue`
10. **CSV 导出**、PWA manifest、收尾优化

---

## 十一、环境变量

```bash
# .env.local（不入 git）
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

```bash
# .env.example（入 git，模板）
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## 十二、非功能需求确认

- 响应时间：操作响应 < 500ms（Supabase 直连，国内延迟约 200-400ms）
- 数据量：支持 3 年以上记录（约 1000 条），单次查询按周期拉取，不全量加载
- 兼容性：优先移动端浏览器，兼容桌面端
- 安全：RLS 数据库层隔离 + 路由守卫双重保障，anon key 仅有 RLS 约束下的权限
