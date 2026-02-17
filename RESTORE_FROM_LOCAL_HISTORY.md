# 从 Local History（时间线）恢复 3 天前版本

本说明帮助您以 **Cursor / VS Code 的 Local History（时间线）** 为“真理来源”，把指定文件恢复到约 3 天前的状态。

> **说明**：AI 无法访问您本机的 Local History，只能根据当前代码查漏补缺。真正按“3 天前完整版”还原，需要您自己在编辑器中用时间线恢复。

---

## 已通过 Cursor Local History 恢复（最近一次操作）

以下文件已从 `%APPDATA%\Cursor\User\History` 中的快照恢复为“今天开工前”的稳定版本：

| 文件 | 使用的历史快照 | 说明 |
|------|----------------|------|
| **app/frontend/src/AOITracker.js** | `70d23fc0/sHwe.js`（最早时间戳） | session_id、sendEvent、raw/eye/mouse 上报、Tobii 启停、session_start/end |
| **app/frontend/src/components/AddNewPerson.js** | `1b0328e4/XXy2.js` | 姓名 + 出生日期查重、重复时弹窗与 Lookup |
| **app/api/routes/export.js** | `-274457f/OM7t.js` | raw_data.csv、eye/mouse 拆分、Summary 生成与 ZIP 导出 |

**CaseContext.js、NewCase.js**：在 Cursor 的 History 中**未找到**对应条目，未做恢复；当前仓库中的版本已保留。若您本地时间线中有这两份文件的更早版本，请在编辑器中手动用 Timeline 恢复。

---

## 1. 用 Local History 恢复核心文件

1. 在 Cursor 中打开要恢复的文件。
2. 在左侧 **Timeline**（时间线）或 **Local History** 中找到约 **3 天前**（或您确认的稳定保存点）的版本。
3. 对比当前版本与历史版本，选择“**Restore Contents**”或“**Compare with File**”后粘贴需要的片段。

建议优先恢复这些文件到 3 天前版本：

| 文件 | 建议恢复内容 |
|------|----------------|
| **app/frontend/src/AOITracker.js** | 所有数据记录（raw / eye / mouse）、sendEvent 字段、与 CSV 导出相关的逻辑 |
| **app/frontend/src/components/AddNewPerson.js** | “姓名 + 出生日期”双重查重、弹窗警告文案与逻辑 |
| **app/frontend/src/components/NewCase.js** | 同上：姓名 + DOB 查重与弹窗（若 3 天前与 AddNewPerson 一致） |
| **app/api/routes/export.js** | 导出 ZIP 内应包含的 CSV 列表（raw_data、eye_data、mouse_data、各 Summary） |
| **app/frontend/src/context/CaseContext.js** | 默认 Case 的加载/选中逻辑（若 3 天前有“一打开就有演示案例”的行为） |

若时间线中出现以下文件名，也可按需恢复（当前仓库中未发现对应文件，可能曾改名或删除）：

- **DataLogger.js**、**ReportGenerator.js**（若 3 天前存在）

---

## 2. 当前代码库已具备的逻辑（供对比）

恢复时可与当前实现对照，避免重复劳动或漏掉 3 天前的差异：

- **AOITracker.js**
  - 已发送：`mouse_aoi`、`mouse_click`、`eye_aoi`、`left_eye_x/y`、`right_eye_x/y`、坐标等；session 开始时已设置 `window.AOI_CURRENT_SESSION_ID` 和 `localStorage.setItem('aoi_session_id', ...)`，供导出与 `useAOILogging` 使用。
- **AddNewPerson.js / NewCase.js**
  - 已实现：按“姓名 + 出生日期”查重；重复时提示：“A person with the same name and date of birth already exists.” 并打开 Lookup 弹窗。
- **export.js**
  - 已实现：在 `generateRawEyeMouseData` 中生成 `raw_data.csv`、`eye_data.csv`、`mouse_data.csv`、`Eye_Summary.csv`、`Mouse_Summary.csv`，并与现有 AOI_Summary 一起打入 ZIP。
- **默认 Case**
  - `CaseContext.js` 当前逻辑：取 API 返回的 case 列表的**第一项**作为默认选中；无前端写死的“演示案例”，需数据库有数据（例如运行 `python app/wizard.py` 做 seed）。

若 3 天前有不同设计（例如不同的导出列、不同的默认 Case 规则），以 Local History 为准恢复即可。

---

## 3. 完整性校验（恢复后建议做一遍）

- **CSV 导出列表**  
  导出一个 ZIP，确认其中包含：
  - 各业务表 CSV（由 Prisma 导出）；
  - **AOI_logs/** 下：会话 CSV、**raw_data.csv**、**eye_data.csv**、**mouse_data.csv**、**AOI_Summary.csv**、**Eye_Summary.csv**、**Mouse_Summary.csv**（有数据时才会生成 eye/mouse 及对应 Summary）。
- **前端启动**  
  - `package.json` 路径：**app/frontend/package.json**  
  - 在 **app/frontend** 下执行：`npm install` → `npm start`，确认无“找不到文件”等报错、页面与 3 天前行为一致。

---

## 4. 可能被误删的“隐藏”逻辑（建议在时间线里扫一眼）

- **useAOILogging.js**：若 3 天前有对 session_id、event_type 或上报字段的改动，可对比恢复。
- **ExportDataDialog.js**：确认导出时是否传 `session_id`（当前在 App.js 中从 `window.AOI_CURRENT_SESSION_ID` 读取并传给导出接口）。
- **CaseContext.js / CaseSelector.js**：若有“默认测试 Case”“演示案例”的加载或 mock，在时间线中确认并恢复。
- **useEffect / 状态**：在 AOITracker、AddNewPerson、NewCase 中检查是否有被删掉的 `useEffect`、状态或监听器（例如与 AOI session、导出、查重相关的）。

完成上述恢复与校验后，即可尽量贴近您“3 天前最完整、最满意”的版本；若有具体文件或函数名，可按同一流程在时间线中逐个对比恢复。
