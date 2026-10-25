// Experimental client; not published to npm. Keep secrets server-side.
export class TopClient {
  constructor({baseURL='http://127.0.0.1:3000',apiKey}={}) {
    this.baseURL=baseURL.replace(/\/$/,'');
    this.apiKey=apiKey;
  }
  async request(path, options={}) {
    const response=await fetch(this.baseURL+path,options);
    const body=await response.json();
    if(!response.ok) throw new Error('24GOTOP API '+response.status+': '+(body.error||'Request failed'));
    return body;
  }
  health(){return this.request('/api/health');}
  listPosts({locale='en',category,limit=20}={}) {
    const params=new URLSearchParams({locale,limit:String(limit)});
    if(category) params.set('category',category);
    return this.request('/api/posts?'+params);
  }
  getPost(id){return this.request('/api/posts/'+encodeURIComponent(id));}
  publishPost(post) {
    if(!this.apiKey) throw new Error('apiKey is required for publishing');
    return this.request('/api/posts',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+this.apiKey},body:JSON.stringify(post)});
  }
}
