import HTML from './docker.html';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const host = request.headers.get("host");
    
    const registryHost = "registry-1.docker.io";
    const authHost = "auth.docker.io";
    const productionHost = "production.cloudflare.docker.com";

    // 处理认证请求
    if (url.pathname.startsWith('/token')) {
      const headers = new Headers(request.headers);
      headers.set('host', authHost);
      
      const authUrl = `https://${authHost}${url.pathname}${url.search}`;
      const authRequest = new Request(authUrl, {
        method: request.method,
        headers: headers,
        body: request.body,
        redirect: "follow",
      });

      const response = await fetch(authRequest);
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('access-control-allow-origin', host);
      responseHeaders.set('access-control-allow-headers', 'Authorization');
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    }
    
    // 处理 registry v2 请求
    if (url.pathname.startsWith('/v2/')) {
      const headers = new Headers(request.headers);
      headers.set('host', registryHost);
      
      const registryUrl = `https://${registryHost}${url.pathname}${url.search}`;
      const registryRequest = new Request(registryUrl, {
        method: request.method,
        headers: headers,
        body: request.body,
        redirect: "follow",
      });

      const response = await fetch(registryRequest);
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('access-control-allow-origin', host);
      responseHeaders.set('access-control-allow-headers', 'Authorization');

      // 修改认证头，将认证请求指向主域名
      const wwwAuth = responseHeaders.get('www-authenticate');
      if (wwwAuth) {
        const newWwwAuth = wwwAuth
          .replace('https://auth.docker.io', `https://${host}`)
          .replace('https://auth.hub.docker.com', `https://${host}`);
        responseHeaders.set('www-authenticate', newWwwAuth);
      }

      // 修改重定向地址
      const location = responseHeaders.get('location');
      if (location) {
        const newLocation = location
          .replace('https://production.cloudflare.docker.com', `https://${host}`);
        responseHeaders.set('location', newLocation);
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    }

    // 处理默认请求
    return new Response(HTML.replace(/{{host}}/g, host), {
      status: 200,
      headers: {
        "content-type": "text/html"
      }
    });
  }
}
