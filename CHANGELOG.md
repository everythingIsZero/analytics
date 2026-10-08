# Changelog

本仓遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 格式，版本语义按 [SemVer](https://semver.org/lang/zh-CN/)。

## [Unreleased]

## [0.1.1] - 2026-10-08

### Fixed

- `buildScriptTag`：属性值（websiteId/scriptSrc）做 HTML 转义，防引号/尖括号破标签。
- 加 `typesVersions`：兼容经典 `moduleResolution: node` 的 `@hxym18/analytics/react` 子路径类型解析。

## [0.1.0] - 2026-10-08

### Added

- `shouldTrack` / `resolvePathname`：路径门控纯函数，默认拦截 `/s/` `/r/` `/api/`；支持 `allowPrefixes` 白名单与 `denyPrefixes` 覆盖。
- `buildScriptTag`：无框架/静态站内联 Umami 脚本标签。
- `@hxym18/analytics/react` 出口：`UmamiScript`（门控在组件内，命中私有路径返回 null）。
- 常量 `DEFAULT_SCRIPT_SRC` / `DEFAULT_DENY_PREFIXES`。
