[**第三方 DockerHub 镜像服务列表**](https://github.com/cmliu/CF-Workers-docker.io?tab=readme-ov-file#%E7%AC%AC%E4%B8%89%E6%96%B9-dockerhub-%E9%95%9C%E5%83%8F%E6%9C%8D%E5%8A%A1)

# CF-Workers-docker.io：Docker仓库镜像代理工具

这个项目是一个基于 Cloudflare Workers 的 Docker 镜像代理工具。它能够中转对 Docker 官方镜像仓库的请求，解决一些访问限制和加速访问的问题。

## 部署方式

- **Workers** 部署：复制 [_worker.js](https://github.com/cmliu/CF-Workers-docker.io/blob/main/_worker.js) 代码，`保存并部署`即可
- **Pages** 部署：`Fork` 后 `连接GitHub` 一键部署即可

## 如何使用？

例如您的Workers项目域名为：`docker.fxxk.dedyn.io`；

### 1.官方镜像路径前面加域名
```shell
docker pull docker.fxxk.dedyn.io/stilleshan/frpc:latest
```
```shell
docker pull docker.fxxk.dedyn.io/library/nginx:stable-alpine3.19-perl
```

### 2.一键设置镜像加速
修改文件 `/etc/docker/daemon.json`（如果不存在则创建）
```shell
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": ["https://docker.fxxk.dedyn.io"]  # 请替换为您自己的Worker自定义域名
}
EOF
sudo systemctl daemon-reload
sudo systemctl restart docker
```

## 变量说明
| 变量名 | 示例 | 必填 | 备注 | 
|--|--|--|--|
| URL302 | https://t.me/CMLiussss |❌| 主页302跳转 |
| URL | https://www.baidu.com/ |❌| 主页伪装(设为`nginx`则伪装为nginx默认页面) |
| UA | netcraft |❌| 支持多元素, 元素之间使用空格或换行作间隔 |




# 第三方 DockerHub 镜像服务

**注意:**
- 以下内容仅做镜像服务的整理与搜集，未做任何安全性检测和验证。
- 使用前请自行斟酌，并根据实际需求进行必要的安全审查。
- 本列表中的任何服务都不做任何形式的安全承诺或保证。

| DockerHub 镜像仓库 | 镜像加地址 |
| ------------------ | ----------- |
| [bestcfipas镜像服务](https://t.me/bestcfipas/1900) | `https://docker.registry.cyou` |
|  | `https://docker-cf.registry.cyou` |
| [zero_free镜像服务](https://t.me/zero_free/80) | `https://docker.jsdelivr.fyi` |
|  | `https://dockercf.jsdelivr.fyi` |
|  | `https://dockertest.jsdelivr.fyi` |
| [docker proxy](https://dockerpull.com/) | `https://dockerpull.com` |
| [docker proxy](https://dockerproxy.cn/) | `https://dockerproxy.cn` |
| [Docker镜像加速站](https://hub.uuuadc.top/) | `https://hub.uuuadc.top` |
|  | `https://docker.1panel.live` |
|  | `https://hub.rat.dev` |
| [DockerHub 镜像加速代理](https://docker.anyhub.us.kg/) | `https://docker.anyhub.us.kg` |
|  | `https://docker.chenby.cn` |
|  | `https://dockerhub.jobcher.com` |
| [镜像使用说明](https://dockerhub.icu/) | `https://dockerhub.icu` |
| [Docker镜像加速站](https://docker.ckyl.me/) | `https://docker.ckyl.me` |
| [镜像使用说明](https://docker.awsl9527.cn/) | `https://docker.awsl9527.cn` |
| [镜像使用说明](https://docker.hpcloud.cloud/) | `https://docker.hpcloud.cloud` |
| [DaoCloud 镜像站](https://github.com/DaoCloud/public-image-mirror) | `https://docker.m.daocloud.io` |
| [AtomHub 可信镜像仓库平台](https://atomhub.openatom.cn/) (只包含基础镜像，共336个) | `https://atomhub.openatom.cn` |





# 鸣谢

[muzihuaner](https://github.com/muzihuaner)、[V2ex网友](https://global.v2ex.com/t/1007922)、[ciiiii](https://github.com/ciiiii/cloudflare-docker-proxy)、[ChatGPT](https://chatgpt.com/)、[白嫖哥](https://t.me/bestcfipas/1900)、[zero_free频道](https://t.me/zero_free/80)、[dongyubin](https://github.com/cmliu/CF-Workers-docker.io/issues/8)、[kiko923](https://github.com/cmliu/CF-Workers-docker.io/issues/5)

