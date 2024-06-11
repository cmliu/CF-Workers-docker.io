# CF-Workers-docker.io 项目

## 项目简介

这个项目是一个基于 Cloudflare Workers 的 Docker 镜像代理工具。它能够中转对 Docker 官方镜像仓库 `registry-1.docker.io` 的请求，解决一些访问限制和加速访问的问题。


## 使用方法

1. **部署到 Cloudflare Workers**：
   - 将本项目的代码复制到你的 Cloudflare Workers 中。

2. **测试和验证**：
   - 使用 Docker 客户端拉取镜像，验证代理是否生效。
   - 你可以使用类似 `docker pull docker.fxxk.dedyn.io/<image>` 的方式来测试。

3. **docker配置**：
   - 修改文件 /etc/docker/daemon.json(不存在则创建) 示例如下
   ```bash
   sudo mkdir -p /etc/docker
   sudo tee /etc/docker/daemon.json <<-'EOF'
   {
     "registry-mirrors": ["https://docker.fxxk.dedyn.io"]  # 大家可以更换为自己的Worker自定义域地址
   }
   EOF
   sudo systemctl daemon-reload
   sudo systemctl restart docker
   ```
   

# 鸣谢

[muzihuaner](https://github.com/muzihuaner)、[V2ex网友](https://global.v2ex.com/t/1007922) 、[ChatGPT](https://chatgpt.com/)

