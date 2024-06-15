const dockerHub = "https://registry-1.docker.io"; // Docker Hub 的 URL

// 定义路由表
const routes = {
	// 生产环境
	"quay": "https://quay.io",
	"gcr": "https://gcr.io",
	"k8s-gcr": "https://k8s.gcr.io",
	"k8s": "https://registry.k8s.io",
	"ghcr": "https://ghcr.io",
	"cloudsmith": "https://docker.cloudsmith.io",
	
	// 测试环境
	"test": dockerHub,
};

// 根据主机名选择对应的上游地址
function routeByHosts(host) {
	if (host in routes) {
		return routes[host];
	}

	if (MODE == "debug") {
		return TARGET_UPSTREAM; // 调试模式返回目标上游
	}

	return ""; // 如果没有匹配到，返回空字符串
}

export default {
	// 处理请求
	async fetch(request, env, ctx) {
		const url = new URL(request.url); // 解析请求 URL
		const hostName = url.hostname.split('.')[0]; // 获取主机名的第一部分
		console.log(hostName);
		const upstream = routeByHosts(hostName); // 获取上游地址
		if (upstream === "") {
			// 如果没有匹配到上游地址，返回 404
			return new Response(
			JSON.stringify({
				routes: routes,
			}),{
				status: 404,
			});
		}
		const isDockerHub = upstream == dockerHub; // 检查是否是 Docker Hub
		const authorization = request.headers.get("Authorization"); // 获取请求头中的授权信息
		if (url.pathname == "/v2/") {
			const newUrl = new URL(upstream + "/v2/");
			const headers = new Headers();
			if (authorization) {
				headers.set("Authorization", authorization); // 如果有授权信息，设置授权头
			}
			// 检查是否需要认证
			const resp = await fetch(newUrl.toString(), {
				method: "GET",
				headers: headers,
				redirect: "follow",
			});
			if (resp.status === 401) {
				if (MODE == "debug") {
					headers.set(
					"Www-Authenticate",
					`Bearer realm="http://${url.host}/v2/auth",service="cloudflare-docker-proxy"`
					);
				} else {
					headers.set(
					"Www-Authenticate",
					`Bearer realm="https://${url.hostname}/v2/auth",service="cloudflare-docker-proxy"`
					);
				}
				return new Response(JSON.stringify({ message: "UNAUTHORIZED" }), {
					status: 401,
					headers: headers,
				});
			} else {
				return resp; // 返回上游响应
			}
		}
		// 获取 token
		if (url.pathname == "/v2/auth") {
			const newUrl = new URL(upstream + "/v2/");
			const resp = await fetch(newUrl.toString(), {
				method: "GET",
				redirect: "follow",
			});
			if (resp.status !== 401) {
				return resp;
			}
			const authenticateStr = resp.headers.get("WWW-Authenticate");
			if (authenticateStr === null) {
				return resp;
			}
			const wwwAuthenticate = parseAuthenticate(authenticateStr);
			let scope = url.searchParams.get("scope");
			// 自动补全 DockerHub 的 library 镜像
			// 例如：repository:busybox:pull => repository:library/busybox:pull
			if (scope && isDockerHub) {
				let scopeParts = scope.split(":");
				if (scopeParts.length == 3 && !scopeParts[1].includes("/")) {
					scopeParts[1] = "library/" + scopeParts[1];
					scope = scopeParts.join(":");
				}
			}
			return await fetchToken(wwwAuthenticate, scope, authorization);
		}
		// 重定向 DockerHub 的 library 镜像
		// 例如：/v2/busybox/manifests/latest => /v2/library/busybox/manifests/latest
		if (isDockerHub) {
			const pathParts = url.pathname.split("/");
			if (pathParts.length == 5) {
				pathParts.splice(2, 0, "library");
				let redirectUrl = new URL(url);
				redirectUrl.pathname = pathParts.join("/");
				return Response.redirect(redirectUrl.toString(), 301);
			}
		}
		// 转发请求
		const newUrl = new URL(upstream + url.pathname);
		const newReq = new Request(newUrl, {
			method: request.method,
			headers: request.headers,
			redirect: "follow",
		});
		return await fetch(newReq);
	}
};

// 解析 Www-Authenticate 头
function parseAuthenticate(authenticateStr) {
	// 示例：Bearer realm="https://auth.ipv6.docker.com/token",service="registry.docker.io"
	// 匹配 =" 后的字符串，直到 " 结束
	const re = /(?<=\=")(?:\\.|[^"\\])*(?=")/g;
	const matches = authenticateStr.match(re);
	if (matches == null || matches.length < 2) {
		throw new Error(`invalid Www-Authenticate Header: ${authenticateStr}`);
	}
	return {
		realm: matches[0],
		service: matches[1],
	};
}

// 获取 token
async function fetchToken(wwwAuthenticate, scope, authorization) {
	const url = new URL(wwwAuthenticate.realm);
	if (wwwAuthenticate.service.length) {
		url.searchParams.set("service", wwwAuthenticate.service);
	}
	if (scope) {
		url.searchParams.set("scope", scope);
	}
	const headers = new Headers();
	if (authorization) {
		headers.set("Authorization", authorization);
	}
	return await fetch(url, { method: "GET", headers: headers });
}
