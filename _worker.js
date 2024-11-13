let hub_host = 'registry-1.docker.io';
const auth_url = 'https://auth.docker.io';
let workers_url = 'https://xxx/';
let 屏蔽爬虫UA = ['netcraft'];

const routes = {
    "quay": "quay.io",
    "gcr": "gcr.io",
    "k8s-gcr": "k8s.gcr.io",
    "k8s": "registry.k8s.io",
    "ghcr": "ghcr.io",
    "cloudsmith": "docker.cloudsmith.io",
    "nvcr": "nvcr.io",
    "test": "registry-1.docker.io",
};

const PREFLIGHT_INIT = {
    headers: new Headers({
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,POST,PUT,PATCH,TRACE,DELETE,HEAD,OPTIONS',
        'access-control-max-age': '1728000',
    }),
};

function makeRes(body, status = 200, headers = {}) {
    headers['access-control-allow-origin'] = '*';
    return new Response(body, { status, headers });
}

function newUrl(urlStr) {
    try {
        return new URL(urlStr);
    } catch (err) {
        return null;
    }
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isUUID(uuid) {
    return uuidRegex.test(uuid);
}

async function nginx() {
    const text = `...`; // Nginx欢迎页的HTML内容
    return text;
}

async function searchInterface() {
    const text = `...`; // Docker Hub搜索界面的HTML内容
    return text;
}

export default {
    async fetch(request, env, ctx) {
        const getReqHeader = (key) => request.headers.get(key);
        const url = new URL(request.url);
        const userAgent = request.headers.get('User-Agent')?.toLowerCase() || "null";
        if (env.UA) 屏蔽爬虫UA = 屏蔽爬虫UA.concat(await ADD(env.UA));
        workers_url = `https://${url.hostname}`;
        const pathname = url.pathname;
        const ns = url.searchParams.get('ns');
        const hostname = url.searchParams.get('hubhost') || url.hostname;
        const hostTop = hostname.split('.')[0];

        let checkHost;
        if (ns) {
            hub_host = ns === 'docker.io' ? 'registry-1.docker.io' : ns;
        } else {
            checkHost = routes[hostTop] ? [routes[hostTop], false] : [hub_host, true];
            hub_host = checkHost[0];
        }

        const fakePage = checkHost ? checkHost[1] : false;
        console.log(`域名头部: ${hostTop}\n反代地址: ${hub_host}\n伪装首页: ${fakePage}`);
        const isUuid = isUUID(pathname.split('/')[1].split('/')[0]);

        if (屏蔽爬虫UA.some(fxxk => userAgent.includes(fxxk)) && 屏蔽爬虫UA.length > 0) {
            return new Response(await nginx(), {
                headers: {
                    'Content-Type': 'text/html; charset=UTF-8',
                },
            });
        }

        const conditions = [
            isUuid,
            pathname.includes('/_'),
            pathname.includes('/r/'),
            pathname.includes('/v2/user'),
            pathname.includes('/v2/orgs'),
            pathname.includes('/v2/_catalog'),
            pathname.includes('/v2/categories'),
            pathname.includes('/v2/feature-flags'),
            pathname.includes('search'),
            pathname.includes('source'),
            pathname === '/',
            pathname === '/favicon.ico',
            pathname === '/auth/profile',
        ];

        if (conditions.some(condition => condition) && (fakePage === true || hostTop == 'docker')) {
            if (env.URL302) {
                return Response.redirect(env.URL302, 302);
            } else if (env.URL) {
                if (env.URL.toLowerCase() == 'nginx') {
                    return new Response(await nginx(), {
                        headers: {
                            'Content-Type': 'text/html; charset=UTF-8',
                        },
                    });
                } else return fetch(new Request(env.URL, request));
            } else if (pathname == '/') {
                return new Response(await searchInterface(), {
                    headers: {
                        'Content-Type': 'text/html; charset=UTF-8',
                    },
                });
            }

            const newUrl = new URL("https://registry.hub.docker.com" + pathname + url.search);
            const headers = new Headers(request.headers);
            headers.set('Host', 'registry.hub.docker.com');

            const newRequest = new Request(newUrl, {
                method: request.method,
                headers: headers,
                body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.blob() : null,
                redirect: 'follow'
            });

            return fetch(newRequest);
        }

        if (!/%2F/.test(url.search) && /%3A/.test(url.toString())) {
            url.pathname = url.pathname.replace(/%3A(?=.*?&)/, '%3Alibrary%2F');
            console.log(`handle_url: ${url}`);
        }

        if (url.pathname.includes('/token')) {
            const token_parameter = {
                headers: {
                    'Host': 'auth.docker.io',
                    'User-Agent': getReqHeader("User-Agent"),
                    'Accept': getReqHeader("Accept"),
                    'Accept-Language': getReqHeader("Accept-Language"),
                    'Accept-Encoding': getReqHeader("Accept-Encoding"),
                    'Connection': 'keep-alive',
                    'Cache-Control': 'max-age=0'
                }
            };
            const token_url = auth_url + url.pathname + url.search;
            return fetch(new Request(token_url, request), token_parameter);
        }

        if (hub_host == 'registry-1.docker.io' && /^\/v2\/[^/]+\/[^/]+\/[^/]+$/.test(url.pathname) && !/^\/v2\/library/.test(url.pathname)) {
            url.pathname = '/v2/library/' + url.pathname.split('/v2/')[1];
            console.log(`modified_url: ${url.pathname}`);
        }

        url.hostname = hub_host;

        const parameter = {
            headers: {
                'Host': hub_host,
                'User-Agent': getReqHeader("User-Agent"),
                'Accept': getReqHeader("Accept"),
                'Accept-Language': getReqHeader("Accept-Language"),
                'Accept-Encoding': getReqHeader("Accept-Encoding"),
                'Connection': 'keep-alive',
                'Cache-Control': 'max-age=0'
            },
            cacheTtl: 3600
        };

        if (request.headers.has("Authorization")) {
            parameter.headers.Authorization = getReqHeader("Authorization");
        }

        let original_response = await fetch(new Request(url, request), parameter);
        let original_response_clone = original_response.clone();
        let original_text = original_response_clone.body;
        let response_headers = original_response.headers;
        let new_response_headers = new Headers(response_headers);
        let status = original_response.status;

        if (new_response_headers.get("Www-Authenticate")) {
            let auth = new_response_headers.get("Www-Authenticate");
            let re = new RegExp(auth_url, 'g');
            new_response_headers.set("Www-Authenticate", response_headers.get("Www-Authenticate").replace(re, workers_url));
        }

        if (new_response_headers.get("Location")) {
            return httpHandler(request, new_response_headers.get("Location"));
        }

        return new Response(original_text, {
            status,
            headers: new_response_headers
        });
    }
};

function httpHandler(req, pathname) {
    const reqHdrRaw = req.headers;

    if (req.method === 'OPTIONS' && reqHdrRaw.has('access-control-request-headers')) {
        return new Response(null, PREFLIGHT_INIT);
    }

    let rawLen = '';
    const reqHdrNew = new Headers(reqHdrRaw);
    const refer = reqHdrNew.get('referer');
    let urlStr = pathname;
    const urlObj = newUrl(urlStr);

    const reqInit = {
        method: req.method,
        headers: reqHdrNew,
        redirect: 'follow',
        body: req.body
    };
    return proxy(urlObj, reqInit, rawLen);
}

async function proxy(urlObj, reqInit, rawLen) {
    const res = await fetch(urlObj.href, reqInit);
    const resHdrOld = res.headers;
    const resHdrNew = new Headers(resHdrOld);

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

    resHdrNew.delete('content-security-policy');
    resHdrNew.delete('content-security-policy-report-only');
    resHdrNew.delete('clear-site-data');

    return new Response(res.body, {
        status,
        headers: resHdrNew
    });
}

async function ADD(envadd) {
    let addtext = envadd.replace(/[	 |"'\r\n]+/g, ',').replace(/,+/g, ',');
    if (addtext.charAt(0) == ',') addtext = addtext.slice(1);
    if (addtext.charAt(addtext.length - 1) == ',') addtext = addtext.slice(0, addtext.length - 1);
    const add = addtext.split(',');
    return add;
}
