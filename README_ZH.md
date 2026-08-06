# openIndu Admin

> **语言:** [English](README.md) | 中文

## 项目简介

openIndu Admin 是 [openIndu](https://openindu.com) 开源工业自动化生态平台的统一管理后台。为已认证用户（按角色分级授权）提供集中化的内容管理、用户管理、知识库操作和系统监控界面。

## 技术栈

| 层级          | 技术                             |
| ------------- | -------------------------------- |
| 框架          | React 19                         |
| 语言          | TypeScript 5.6                   |
| 构建工具      | Vite 6                           |
| 样式          | Tailwind CSS 4 + shadcn/ui       |
| 路由          | React Router 7                   |
| 数据获取      | TanStack React Query 5           |
| HTTP 客户端   | Axios                            |
| 地图          | react-simple-maps                |
| 单元测试      | Vitest                           |
| E2E 测试      | Playwright                       |

## 快速开始

### 前置条件

- Node.js 18+
- pnpm（推荐）或 npm
- 已启动的 [openIndu Backend](https://github.com/openIndu/openIndu-backend)（API 在 `localhost:8004`）

### 开发

```bash
# 1. 克隆仓库
git clone https://github.com/openIndu/openIndu-admin.git
cd openIndu-admin

# 2. 安装依赖
npm install

# 3. 启动开发服务器（端口 3001）
npm run dev
```

开发服务器会自动将 `/api` 请求代理到 `http://localhost:8004`。

### 生产构建

```bash
npm run build    # 输出到 dist/
npm run preview  # 预览生产构建
```

### Docker

```bash
docker build -t openindu-admin .
docker run -p 3001:80 openindu-admin
```

## 项目结构

```
openIndu-admin/
├── src/
│   ├── app/
│   │   ├── App.tsx         # 根组件
│   │   ├── routes.tsx      # 路由定义
│   │   ├── pages/          # 页面组件
│   │   └── components/     # 共享 UI 组件
│   ├── api/
│   │   └── index.ts        # API 客户端（Axios 实例）
│   ├── store/
│   │   └── auth.ts         # 认证状态管理
│   ├── lib/
│   │   └── clientIdentity.ts  # 客户端指纹
│   ├── styles/
│   │   └── index.css       # 全局样式（Tailwind）
│   └── main.tsx            # 应用入口
├── e2e/                    # Playwright E2E 测试
├── public/                 # 静态资源
├── Dockerfile
├── nginx.conf              # Nginx 配置（Docker）
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
└── package.json
```

## 许可证

[Apache-2.0](LICENSE)
