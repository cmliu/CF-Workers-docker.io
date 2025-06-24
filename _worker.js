// _worker.js

// Docker镜像仓库主机地址
// let hub_host = 'registry-1.docker.io';
// Docker认证服务器地址
const auth_url = 'https://auth.docker.io';

let 屏蔽爬虫UA = ['netcraft'];

// 根据主机名选择对应的上游地址
function routeByHosts(host) {
	// 定义路由表
	const routes = {
		// 生产环境
		"quay": "quay.io",
		"gcr": "gcr.io",
		"k8s-gcr": "k8s.gcr.io",
		"k8s": "registry.k8s.io",
		"ghcr": "ghcr.io",
		"cloudsmith": "docker.cloudsmith.io",
		"nvcr": "nvcr.io",
        "docker": "registry-1.docker.io",
		"n8n":"docker.n8n.io",
		// 测试环境
		"test": "registry-1.docker.io",
	};

    // 如果主机在路由表中，返回对应的上游地址和 false (表示不是伪装页面)
    // 否则，返回默认的 hub_host (在这里是 'registry-1.docker.io'，如果上面没改) 和 true
    // 注意：这里应该有一个默认的 hub_host 变量，如果不由 routeByHosts 决定的话
    let default_hub_host = 'registry-1.docker.io'; // 确保有一个默认值
    if (host in routes) return [routes[host], false]; 
    else return [default_hub_host, true]; // 或者你希望的默认行为
}

/** @type {RequestInit} */
const PREFLIGHT_INIT = {
	// 预检请求配置
	headers: new Headers({
		'access-control-allow-origin': '*', // 允许所有来源
		'access-control-allow-methods': 'GET,POST,PUT,PATCH,TRACE,DELETE,HEAD,OPTIONS', // 允许的HTTP方法
		'access-control-max-age': '1728000', // 预检请求的缓存时间
	}),
}

/**
 * 构造响应
 * @param {any} body 响应体
 * @param {number} status 响应状态码
 * @param {Object<string, string>} headers 响应头
 */
function makeRes(body, status = 200, headers = {}) {
	headers['access-control-allow-origin'] = '*' // 允许所有来源
	return new Response(body, { status, headers }) // 返回新构造的响应
}

/**
 * 构造新的URL对象
 * @param {string} urlStr URL字符串
 * @param {string} base URL base
 */
function newUrl(urlStr, base) {
    try {
        console.log(`Constructing new URL object with path ${urlStr} and base ${base}`);
        return new URL(urlStr, base);
    } catch (err) {
        console.error(`Error constructing URL: ${err}, path: ${urlStr}, base: ${base}`);
        return null; // 返回 null 以便调用者处理
    }
}

async function nginx() {
	const text = `
	<!DOCTYPE html>
	<html>
	<head>
	<title>Welcome to nginx!</title>
	<style>
		body {
			width: 35em;
			margin: 0 auto;
			font-family: Tahoma, Verdana, Arial, sans-serif;
		}
	</style>
	</head>
	<body>
	<h1>Welcome to nginx!</h1>
	<p>If you see this page, the nginx web server is successfully installed and
	working. Further configuration is required.</p>
	
	<p>For online documentation and support please refer to
	<a href="http://nginx.org/">nginx.org</a>.<br/>
	Commercial support is available at
	<a href="http://nginx.com/">nginx.com</a>.</p>
	
	<p><em>Thank you for using nginx.</em></p>
	</body>
	</html>
	`
	return text;
}

async function searchInterface() {
	const html = `
	<!DOCTYPE html>
	<html>
	<head>
		<title>Docker Hub 镜像搜索</title>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<style>
		:root {
			--github-color: rgb(27,86,198);
			--github-bg-color: #ffffff;
			--primary-color: #0066ff;
			--primary-dark: #0052cc;
			--gradient-start: #1a90ff;
			--gradient-end: #003eb3;
			--text-color: #ffffff;
			--shadow-color: rgba(0,0,0,0.1);
			--transition-time: 0.3s;
		}
		
		* {
			box-sizing: border-box;
			margin: 0;
			padding: 0;
		}

		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
			display: flex;
			flex-direction: column;
			justify-content: center;
			align-items: center;
			min-height: 100vh;
			margin: 0;
			background: linear-gradient(135deg, var(--gradient-start) 0%, var(--gradient-end) 100%);
			padding: 20px;
			color: var(--text-color);
			overflow-x: hidden;
		}

		.container {
			text-align: center;
			width: 100%;
			max-width: 800px;
			padding: 20px;
			margin: 0 auto;
			display: flex;
			flex-direction: column;
			justify-content: center;
			min-height: 60vh;
			animation: fadeIn 0.8s ease-out;
		}

		@keyframes fadeIn {
			from { opacity: 0; transform: translateY(20px); }
			to { opacity: 1; transform: translateY(0); }
		}

		.github-corner {
			position: fixed;
			top: 0;
			right: 0;
			z-index: 999;
			transition: transform var(--transition-time) ease;
		}
		
		.github-corner:hover {
			transform: scale(1.08);
		}

		.github-corner svg {
			fill: var(--github-bg-color);
			color: var(--github-color);
			position: absolute;
			top: 0;
			border: 0;
			right: 0;
			width: 80px;
			height: 80px;
			filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.2));
		}

		.logo {
			margin-bottom: 20px;
			transition: transform var(--transition-time) ease;
			animation: float 6s ease-in-out infinite;
		}
		
		@keyframes float {
			0%, 100% { transform: translateY(0); }
			50% { transform: translateY(-10px); }
		}
		
		.logo:hover {
			transform: scale(1.08) rotate(5deg);
		}
		
		.logo svg {
			filter: drop-shadow(0 5px 15px rgba(0, 0, 0, 0.2));
		}
		
		.title {
			color: var(--text-color);
			font-size: 2.3em;
			margin-bottom: 10px;
			text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
			font-weight: 700;
			letter-spacing: -0.5px;
			animation: slideInFromTop 0.5s ease-out 0.2s both;
		}
		
		@keyframes slideInFromTop {
			from { opacity: 0; transform: translateY(-20px); }
			to { opacity: 1; transform: translateY(0); }
		}
		
		.subtitle {
			color: rgba(255, 255, 255, 0.9);
			font-size: 1.1em;
			margin-bottom: 25px;
			max-width: 600px;
			margin-left: auto;
			margin-right: auto;
			line-height: 1.4;
			animation: slideInFromTop 0.5s ease-out 0.4s both;
		}
		
		.search-container {
			display: flex;
			align-items: stretch;
			width: 100%;
			max-width: 600px;
			margin: 0 auto;
			height: 55px;
			position: relative;
			animation: slideInFromBottom 0.5s ease-out 0.6s both;
			box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
			border-radius: 12px;
			overflow: hidden;
		}
		
		@keyframes slideInFromBottom {
			from { opacity: 0; transform: translateY(20px); }
			to { opacity: 1; transform: translateY(0); }
		}
		
		#search-input {
			flex: 1;
			padding: 0 20px;
			font-size: 16px;
			border: none;
			outline: none;
			transition: all var(--transition-time) ease;
			height: 100%;
		}
		
		#search-input:focus {
			padding-left: 25px;
		}
		
		#search-button {
			width: 60px;
			background-color: var(--primary-color);
			border: none;
			cursor: pointer;
			transition: all var(--transition-time) ease;
			height: 100%;
			display: flex;
			align-items: center;
			justify-content: center;
			position: relative;
		}
		
		#search-button svg {
			transition: transform 0.3s ease;
			stroke: white;
		}
		
		#search-button:hover {
			background-color: var(--primary-dark);
		}
		
		#search-button:hover svg {
			transform: translateX(2px);
		}
		
		#search-button:active svg {
			transform: translateX(4px);
		}
		
		.tips {
			color: rgba(255, 255, 255, 0.8);
			margin-top: 20px;
			font-size: 0.9em;
			animation: fadeIn 0.5s ease-out 0.8s both;
			transition: transform var(--transition-time) ease;
		}
		
		.tips:hover {
			transform: translateY(-2px);
		}
		
		@media (max-width: 768px) {
			.container {
				padding: 20px 15px;
				min-height: 60vh;
			}
			
			.title {
				font-size: 2em;
			}
			
			.subtitle {
				font-size: 1em;
				margin-bottom: 20px;
			}
			
			.search-container {
				height: 50px;
			}
		}
		
		@media (max-width: 480px) {
			.container {
				padding: 15px 10px;
				min-height: 60vh;
			}
			
			.github-corner svg {
				width: 60px;
				height: 60px;
			}
			
			.search-container {
				height: 45px;
			}
			
			#search-input {
				padding: 0 15px;
			}
			
			#search-button {
				width: 50px;
			}
			
			#search-button svg {
				width: 18px;
				height: 18px;
			}
			
			.title {
				font-size: 1.7em;
				margin-bottom: 8px;
			}
			
			.subtitle {
				font-size: 0.95em;
				margin-bottom: 18px;
			}
		}
		</style>
	</head>
	<body>
		<a href="https://github.com/cmliu/CF-Workers-docker.io" target="_blank" class="github-corner" aria-label="View source on Github">
			<svg viewBox="0 0 250 250" aria-hidden="true">
				<path d="M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z"></path>
				<path d="M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2" fill="currentColor" style="transform-origin: 130px 106px;" class="octo-arm"></path>
				<path d="M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.1 C171.4,40.1 176.1,42.5 178.8,56.2 C183.1,58.6 187.2,61.8 190.9,65.4 C194.5,69.0 197.7,73.2 200.1,77.6 C213.8,80.2 216.3,84.9 216.3,84.9 C212.7,93.1 206.9,96.0 205.4,96.6 C205.1,102.4 203.0,107.8 198.3,112.5 C181.9,128.9 168.3,122.5 157.7,114.1 C157.9,116.9 156.7,120.9 152.7,124.9 L141.0,136.5 C139.8,137.7 141.6,141.9 141.8,141.8 Z" fill="currentColor" class="octo-body"></path>
			</svg>
		</a>
		<div class="container">
			<div class="logo">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 18" fill="#ffffff" width="110" height="85">
					<path d="M23.763 6.886c-.065-.053-.673-.512-1.954-.512-.32 0-.659.03-1.01.087-.248-1.703-1.651-2.533-1.716-2.57l-.345-.2-.227.328a4.596 4.596 0 0 0-.611 1.433c-.23.972-.09 1.884.403 2.666-.596.331-1.546.418-1.744.42H.752a.753.753 0 0 0-.75.749c-.007 1.456.233 2.864.692 4.07.545 1.43 1.355 2.483 2.409 3.13 1.181.725 3.104 1.14 5.276 1.14 1.016 0 2.03-.092 2.93-.266 1.417-.273 2.705-.742 3.826-1.391a10.497 10.497 0 0 0 2.61-2.14c1.252-1.42 1.998-3.005 2.553-4.408.075.003.148.005.221.005 1.371 0 2.215-.55 2.68-1.01.505-.5.685-.998.704-1.053L24 7.076l-.237-.19Z"></path>
					<path d="M2.216 8.075h2.119a.186.186 0 0 0 .185-.186V6a.186.186 0 0 0-.185-.186H2.216A.186.186 0 0 0 2.031 6v1.89c0 .103.083.186.185.186Zm2.92 0h2.118a.185.185 0 0 0 .185-.186V6a.185.185 0 0 0-.185-.186H5.136A.185.185 0 0 0 4.95 6v1.89c0 .103.083.186.186.186Zm2.964 0h2.118a.186.186 0 0 0 .185-.186V6a.186.186 0 0 0-.185-.186H8.1A.185.185 0 0 0 7.914 6v1.89c0 .103.083.186.186.186Zm2.928 0h2.119a.185.185 0 0 0 .185-.186V6a.185.185 0 0 0-.185-.186h-2.119a.186.186 0 0 0-.185.186v1.89c0 .103.083.186.185.186Zm-5.892-2.72h2.118a.185.185 0 0 0 .185-.186V3.28a.186.186 0 0 0-.185-.186H5.136a.186.186 0 0 0-.186.186v1.89c0 .103.083.186.186.186Zm2.964 0h2.118a.186.186 0 0 0 .185-.186V3.28a.186.186 0 0 0-.185-.186H8.1a.186.186 0 0 0-.186.186v1.89c0 .103.083.186.186.186Zm2.928 0h2.119a.185.185 0 0 0 .185-.186V3.28a.186.186 0 0 0-.185-.186h-2.119a.186.186 0 0 0-.185.186v1.89c0 .103.083.186.185.186Zm0-2.72h2.119a.186.186 0 0 0 .185-.186V.56a.185.185 0 0 0-.185-.186h-2.119a.186.186 0 0 0-.185.186v1.89c0 .103.083.186.185.186Zm2.955 5.44h2.118a.185.185 0 0 0 .186-.186V6a.185.185 0 0 0-.186-.186h-2.118a.185.185 0 0 0-.185.186v1.89c0 .103.083.186.185.186Z"></path>
				</svg>
			</div>
			<h1 class="title">Docker Hub 镜像搜索</h1>
			<p class="subtitle">快速查找、下载和部署 Docker 容器镜像</p>
			<div class="search-container">
				<input type="text" id="search-input" placeholder="输入关键词搜索镜像，如: nginx, mysql, redis...">
				<button id="search-button" title="搜索">
					<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
						<path d="M13 5l7 7-7 7M5 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"></path>
					</svg>
				</button>
			</div>
			<p class="tips">基于 Cloudflare Workers / Pages 构建，利用全球边缘网络实现毫秒级响应。</p>
		</div>
		<script>
		function performSearch() {
			const query = document.getElementById('search-input').value;
			if (query) {
				window.location.href = '/search?q=' + encodeURIComponent(query);
			}
		}
	
		document.getElementById('search-button').addEventListener('click', performSearch);
		document.getElementById('search-input').addEventListener('keypress', function(event) {
			if (event.key === 'Enter') {
				performSearch();
			}
		});

		// 添加焦点在搜索框
		window.addEventListener('load', function() {
			document.getElementById('search-input').focus();
		});
		</script>
	</body>
	</html>
	`;
	return html;
}

/**
 * 统一处理将要返回给客户端的响应头
 * @param {Headers} originalUpstreamHeaders - 从上游服务器获取的原始头
 * @param {string} clientFacingWorkerHostname - 当前 Worker 的公开主机名 (e.g., "n8n.dpp.worker.l0op.com")
 * @param {string} upstreamAuthHostToRewrite - 需要被重写的上游认证主机 (e.g., "https://auth.docker.io")
 */
function finalizeHeadersForClient(originalUpstreamHeaders, clientFacingWorkerHostname, upstreamAuthHostToRewrite) {
    const newHeaders = new Headers(originalUpstreamHeaders);
    const clientFacingWorkerUrl = `https://${clientFacingWorkerHostname}`;

    // 1. 重写 Www-Authenticate 头
    const wwwAuthHeader = newHeaders.get("Www-Authenticate");
    if (wwwAuthHeader) {
        const realmRegex = /(realm=")([^"]+)(")/i; // case-insensitive
        const realmMatch = wwwAuthHeader.match(realmRegex);
        if (realmMatch && realmMatch[1] && realmMatch[2] && realmMatch[3]) {
            const originalRealmUrl = realmMatch[2]; // 例如 "https://auth.docker.io/token"
            if (originalRealmUrl.toLowerCase().startsWith(upstreamAuthHostToRewrite.toLowerCase())) {
                const pathAfterHost = originalRealmUrl.substring(upstreamAuthHostToRewrite.length); // 例如 "/token"
                const newRealmUrl = clientFacingWorkerUrl + pathAfterHost;
                const modifiedAuthHeader = wwwAuthHeader.replace(originalRealmUrl, newRealmUrl);
                newHeaders.set("Www-Authenticate", modifiedAuthHeader);
                console.log(`[finalizeHeadersForClient] Rewrote Www-Authenticate realm from "${originalRealmUrl}" to "${newRealmUrl}"`);
            } else {
                 console.log(`[finalizeHeadersForClient] Www-Authenticate realm "${originalRealmUrl}" does not start with "${upstreamAuthHostToRewrite}", not rewriting.`);
            }
        }
    }

    // 2. 重写 Location 头 (如果需要确保重定向也指向 Worker)
    //    当前的 httpHandler 会尝试代理 Location 指向的地址，所以主要确保该代理请求的响应也经过 finalizeHeadersForClient
    //    如果想让客户端直接收到指向 worker 的 Location，逻辑会更复杂。
    //    暂时保持 httpHandler 的逻辑，它会重新进入代理流程。

    // 设置通用的 CORS 和其他安全相关的头
    newHeaders.set('access-control-expose-headers', '*');
    newHeaders.set('access-control-allow-origin', '*');
    newHeaders.delete('content-security-policy');
    newHeaders.delete('content-security-policy-report-only');
    newHeaders.delete('clear-site-data');
    
    // 可以设置一个默认的缓存策略，但上游的 Cache-Control 可能更合适
    if (!newHeaders.has('Cache-Control')) {
        newHeaders.set('Cache-Control', 'max-age=1500');
    }

    return newHeaders;
}

export default {
    async fetch(request, env, ctx) {
        const requestUrlObject = new URL(request.url);
        const clientFacingWorkerHostname = requestUrlObject.hostname; // Worker 的主机名

        const getReqHeader = (key) => request.headers.get(key);

        let hub_host_for_upstream; // 将用于请求上游的实际主机名
        let shouldServeFakePage = false; // 是否显示伪装页面

        const nsParam = requestUrlObject.searchParams.get('ns');
        const hubhostParam = requestUrlObject.searchParams.get('hubhost');
        // 路由主机名决定用哪个参数，或者 worker 自身的主机名
        const hostnameForRoutingLogic = hubhostParam || clientFacingWorkerHostname; 
        const hostTopForRouting = hostnameForRoutingLogic.split('.')[0];

        if (nsParam) {
            hub_host_for_upstream = (nsParam === 'docker.io') ? 'registry-1.docker.io' : nsParam;
            // ns 参数存在时，通常不显示伪装页面，除非特定 ns 需要
        } else {
            const routeInfo = routeByHosts(hostTopForRouting);
            hub_host_for_upstream = routeInfo[0];
            shouldServeFakePage = routeInfo[1];
        }
        console.log(`Worker: ${clientFacingWorkerHostname}, Routing based on: ${hostTopForRouting}, Upstream target: ${hub_host_for_upstream}, Serve fake page: ${shouldServeFakePage}`);


        // 伪装页面/爬虫处理 (与之前类似)
        const userAgentHeader = request.headers.get('User-Agent');
        const userAgent = userAgentHeader ? userAgentHeader.toLowerCase() : "null";
        if (env.UA) 屏蔽爬虫UA = 屏蔽爬虫UA.concat(await ADD(env.UA)); // 假设 ADD 函数已定义

        if (屏蔽爬虫UA.some(fxxk => userAgent.includes(fxxk)) && 屏蔽爬虫UA.length > 0) {
            return new Response(await nginx(), { headers: { 'Content-Type': 'text/html; charset=UTF-8' }});
        }
        // 浏览器访问首页时的处理 (与之前类似)
        const hubParamsForBrowser = ['/v1/search', '/v1/repositories']; // 假设这些是浏览器API路径
        if ((userAgent && userAgent.includes('mozilla')) || hubParamsForBrowser.some(param => requestUrlObject.pathname.includes(param))) {
            if (requestUrlObject.pathname === '/') {
                if (env.URL302) return Response.redirect(env.URL302, 302);
                if (env.URL) {
                    if (env.URL.toLowerCase() === 'nginx') return new Response(await nginx(), { headers: { 'Content-Type': 'text/html; charset=UTF-8' }});
                    return fetch(new Request(env.URL, request)); // 代理到指定URL
                }
                if (shouldServeFakePage) return new Response(await searchInterface(), { headers: { 'Content-Type': 'text/html; charset=UTF-8' }});
                // 如果没有特定首页逻辑且不是伪装页面，可能需要一个默认行为或错误
            } else {
                // 处理浏览器API请求，可能需要将主机名改为 hub.docker.com (如果 fakePage 为 true 且目标是docker hub)
                // let browserApiTargetUrl = new URL(requestUrlObject);
                // if (shouldServeFakePage) browserApiTargetUrl.hostname = 'hub.docker.com'; // 示例
                // return fetch(new Request(browserApiTargetUrl, request));
                // 保持原有逻辑，但确保响应头被 finalizeHeadersForClient 处理（如果适用）
            }
        }


        // 处理 token 请求 (发往 worker 的 /token 路径)
        if (requestUrlObject.pathname.includes('/token')) {
            const tokenServiceUrl = new URL(auth_url); // e.g. https://auth.docker.io
            let actualTokenProviderUrl = `${auth_url}${requestUrlObject.pathname.substring('/token'.length)}${requestUrlObject.search}`;
            // 确保 /token 被正确拼接
            if (!requestUrlObject.pathname.startsWith('/token/')) { // 如果是 /token?service=...
                 actualTokenProviderUrl = `${auth_url}/token${requestUrlObject.search}`;
            } else { // 如果是 /token/auth?... (某些 registry 可能有子路径)
                 actualTokenProviderUrl = `${auth_url}${requestUrlObject.pathname.substring('/token'.length)}${requestUrlObject.search}`;
            }


            console.log(`[TokenHandler] Client requested token from Worker. Forwarding to actual provider: ${actualTokenProviderUrl}`);
            const tokenRequestHeaders = new Headers(request.headers);
            tokenRequestHeaders.set('Host', tokenServiceUrl.hostname); 
            // 其他需要的头，如 User-Agent, Accept 等，可以从原始请求中复制
            
            const tokenResponse = await fetch(new Request(actualTokenProviderUrl, new Request(request, { headers: tokenRequestHeaders })));
            // Token 响应通常是 JSON，不需要 Www-Authenticate 重写，但 CORS 头可能需要
            const finalTokenResponseHeaders = finalizeHeadersForClient(tokenResponse.headers, clientFacingWorkerHostname, auth_url);
            return new Response(tokenResponse.body, { status: tokenResponse.status, headers: finalTokenResponseHeaders });
        }

        // 准备发往上游 (hub_host_for_upstream) 的请求
        let upstreamTargetUrl = new URL(requestUrlObject);
        upstreamTargetUrl.hostname = hub_host_for_upstream;

        // Docker Hub 特有的路径修改 (/v2/library/...)
        if (hub_host_for_upstream === 'registry-1.docker.io' && 
            /^\/v2\/[^/]+\/[^/]+\/[^/]+$/.test(upstreamTargetUrl.pathname) && 
            !/^\/v2\/library/.test(upstreamTargetUrl.pathname)) {
            upstreamTargetUrl.pathname = '/v2/library/' + upstreamTargetUrl.pathname.substring('/v2/'.length);
            console.log(`[PathRewrite] Modified path for Docker Hub: ${upstreamTargetUrl.pathname}`);
        }
        
        const upstreamRequestHeaders = new Headers(request.headers);
        upstreamRequestHeaders.set('Host', hub_host_for_upstream);
        // 可以选择性地删除或添加一些头
        // upstreamRequestHeaders.delete('cf-...'); // 删除 Cloudflare 特有的头

        const upstreamRequest = new Request(upstreamTargetUrl.toString(), new Request(request, { headers: upstreamRequestHeaders }));
        
        console.log(`[MainFetch] Forwarding request to upstream: ${upstreamRequest.url}`);
        let upstreamResponse = await fetch(upstreamRequest);

        // 检查上游是否重定向
        const locationFromUpstream = upstreamResponse.headers.get("Location");
        if (locationFromUpstream && (upstreamResponse.status === 301 || upstreamResponse.status === 302 || upstreamResponse.status === 307 || upstreamResponse.status === 308)) {
            console.log(`[MainFetch] Upstream ${hub_host_for_upstream} redirected to: ${locationFromUpstream}. Handling with httpHandler.`);
            // `request` 是原始客户端请求
            // `locationFromUpstream` 是重定向目标
            // `hub_host_for_upstream` 是发出重定向的主机
            // `clientFacingWorkerHostname` 是 worker 自己的主机名
            // `auth_url` 是全局的 auth_url
            return httpHandler(request, locationFromUpstream, hub_host_for_upstream, clientFacingWorkerHostname, auth_url);
        }

        // 如果不是重定向，或者重定向已被 httpHandler 最终处理完毕并返回到这里（不应该），
        // 则处理当前 upstreamResponse 的头并返回给客户端。
        console.log(`[MainFetch] Received response from upstream ${hub_host_for_upstream}. Status: ${upstreamResponse.status}. Finalizing headers.`);
        const finalHeaders = finalizeHeadersForClient(upstreamResponse.headers, clientFacingWorkerHostname, auth_url);
        return new Response(upstreamResponse.body, {
            status: upstreamResponse.status,
            headers: finalHeaders
        });
    }
};

/**
 * 处理 HTTP 请求重定向的辅助函数
 * @param {Request} originalClientRequest - 原始的客户端请求对象
 * @param {string} locationUrlFromRedirect - 从上游 Location 头获取的 URL (可能是相对或绝对路径)
 * @param {string} hostThatIssuedRedirect - 发出重定向的上游主机名 (e.g., "docker.n8n.io")
 * @param {string} clientFacingWorkerHostname - 当前 Worker 的主机名
 * @param {string} globalAuthUrlToRewrite - 全局的认证URL主机部分 (e.g., "https://auth.docker.io")
 */
async function httpHandler(originalClientRequest, locationUrlFromRedirect, hostThatIssuedRedirect, clientFacingWorkerHostname, globalAuthUrlToRewrite) {
    console.log(`[httpHandler] Processing redirect. Original client request: ${originalClientRequest.url}, Location: ${locationUrlFromRedirect}, Issued by: ${hostThatIssuedRedirect}`);

    if (originalClientRequest.method === 'OPTIONS' && originalClientRequest.headers.has('access-control-request-headers')) {
        return new Response(null, PREFLIGHT_INIT);
    }

    let targetUrlForNextHop;
    try {
        //尝试将 locationUrlFromRedirect 解析为绝对 URL
        targetUrlForNextHop = new URL(locationUrlFromRedirect);
    } catch (e) {
        // 如果是相对路径，则基于发出重定向的主机来构建
        targetUrlForNextHop = new URL(locationUrlFromRedirect, `https://${hostThatIssuedRedirect}`);
    }
    
    const nextHopRequestHeaders = new Headers(originalClientRequest.headers);
    nextHopRequestHeaders.set('Host', targetUrlForNextHop.hostname); // 设置 Host 为重定向目标的主机
    // nextHopRequestHeaders.delete("Authorization"); // 根据原始逻辑删除 Authorization，S3 修复？

    // 使用原始请求的方法和主体，但使用新的 URL 和头
    const nextHopRequest = new Request(targetUrlForNextHop.toString(), new Request(originalClientRequest, { headers: nextHopRequestHeaders }));
    
    if (nextHopRequest.headers.has("Authorization")) {
        console.log(`[httpHandler] Forwarding to ${nextHopRequest.url} WITH Authorization header (token type: ${nextHopRequest.headers.get("Authorization").split(" ")[0]})`);
    } else {
        console.log(`[httpHandler] Forwarding to ${nextHopRequest.url} WITHOUT Authorization header.`);
    }
    const responseFromNextHop = await fetch(nextHopRequest);

    // 再次检查是否又有重定向
    const locationFromNextHop = responseFromNextHop.headers.get("Location");
    if (locationFromNextHop && (responseFromNextHop.status === 301 || responseFromNextHop.status === 302 || responseFromNextHop.status === 307 || responseFromNextHop.status === 308)) {
        console.log(`[httpHandler] Chained redirect from ${targetUrlForNextHop.hostname} to: ${locationFromNextHop}. Calling httpHandler again.`);
        // 递归调用 httpHandler 处理新的重定向
        // 注意：hostThatIssuedRedirect 现在是 targetUrlForNextHop.hostname
        return httpHandler(originalClientRequest, locationFromNextHop, targetUrlForNextHop.hostname, clientFacingWorkerHostname, globalAuthUrlToRewrite);
    }
    
    // 如果没有更多重定向，处理响应头并返回
    console.log(`[httpHandler] Received response from redirected target ${targetUrlForNextHop.hostname}. Status: ${responseFromNextHop.status}. Finalizing headers.`);
    const finalHeaders = finalizeHeadersForClient(responseFromNextHop.headers, clientFacingWorkerHostname, globalAuthUrlToRewrite);
    return new Response(responseFromNextHop.body, {
        status: responseFromNextHop.status,
        headers: finalHeaders
    });
}

/**
 * 代理请求
 * @param {URL} urlObj URL对象
 * @param {RequestInit} reqInit 请求初始化对象
 * @param {string} rawLen 原始长度
 */
async function proxy(urlObj, reqInit, rawLen) {
	const res = await fetch(urlObj.href, reqInit);
	const resHdrOld = res.headers;
	const resHdrNew = new Headers(resHdrOld);

	// 验证长度
	if (rawLen) {
		const newLen = resHdrOld.get('content-length') || '';
		const badLen = (rawLen !== newLen);

		if (badLen) {
			return makeRes(res.body, 400, {
				'--error': `bad len: ${newLen}, except: ${rawLen}`,
				'access-control-expose-headers': '--error',
			});
		}
	}
	const status = res.status;
	resHdrNew.set('access-control-expose-headers', '*');
	resHdrNew.set('access-control-allow-origin', '*');
	resHdrNew.set('Cache-Control', 'max-age=1500');

	// 删除不必要的头
	resHdrNew.delete('content-security-policy');
	resHdrNew.delete('content-security-policy-report-only');
	resHdrNew.delete('clear-site-data');

	return new Response(res.body, {
		status,
		headers: resHdrNew
	});
}

async function ADD(envadd) {
    var addtext = envadd.replace(/[ \t|"'\r\n]+/g, ',').replace(/,+/g, ',');
    if (addtext.startsWith(',')) addtext = addtext.substring(1);
    if (addtext.endsWith(',')) addtext = addtext.slice(0, -1);
    return addtext.split(',');
}
