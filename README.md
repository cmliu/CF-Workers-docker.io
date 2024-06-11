# CF-Workers-docker.io 项目

## 项目简介

这个项目是一个基于 Cloudflare Workers 的 Docker 镜像代理工具。它能够中转对 Docker 官方镜像仓库 `registry-1.docker.io` 的请求，解决一些访问限制和加速访问的问题。

## 功能说明

- **请求代理**：通过 Cloudflare Workers 代理对 Docker 官方镜像仓库的请求，提升访问速度和稳定性。
- **预检请求**：处理跨域预检请求，确保跨域资源共享 (CORS) 的正常工作。
- **路径修改**：自动处理和修改包含 `%2F` 和 `%3A` 的请求路径，确保请求能够正确解析。
- **Token 请求**：代理对 `auth.docker.io` 的 token 请求，获取访问镜像仓库的权限。
- **响应头修改**：自动修改 `Www-Authenticate` 头和 `Location` 头，确保响应中的链接正确。
- **缓存机制**：为请求设置缓存时间，减少重复请求，提升访问效率。

## 使用方法

1. **部署到 Cloudflare Workers**：
   - 将本项目的代码复制到你的 Cloudflare Workers 中。

2. **测试和验证**：
   - 使用 Docker 客户端拉取镜像，验证代理是否生效。
   - 你可以使用类似 `docker pull <your-workers-domain>/<image>` 的方式来测试。

## 代码说明

- `PREFLIGHT_INIT`：用于配置预检请求的响应头，允许所有来源和常见的 HTTP 方法。
- `makeRes`：构造响应对象，设置响应头以允许跨域访问。
- `newUrl`：构造新的 URL 对象，处理异常情况。
- `fetch` 方法：核心逻辑，处理请求路径的修改、token 请求、响应头的修改等。

# 鸣谢

感谢 [V2ex](https://global.v2ex.com/t/1007922) 的网友提供源码。本项目的开发得益于他们的贡献。

