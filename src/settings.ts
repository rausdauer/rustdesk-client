export type Settings = {idServer:string;relayServer:string;serverKey:string};
export function origin(value:string):string {
  const u = new URL(value.includes('://') ? value : `https://${value}`);
  if (!['https:','wss:','http:','ws:'].includes(u.protocol) || u.username || u.password || u.search || u.hash || !['','/'].includes(u.pathname)) throw new Error('Enter a server origin only, for example https://desk.example.com.');
  if (['http:','ws:'].includes(u.protocol) && !['localhost','127.0.0.1','[::1]'].includes(u.hostname)) throw new Error('Use HTTPS/WSS for servers outside localhost.');
  return u.href.replace(/\/$/,'');
}
export function validate(raw:Settings):Settings {
  const idServer=origin(raw.idServer.trim()), relayServer=origin(raw.relayServer.trim()), serverKey=raw.serverKey.trim();
  let bytes:string;try{bytes=atob(serverKey);}catch{throw new Error('The public key must be a base64-encoded Ed25519 public key.');}
  if(bytes.length!==32) throw new Error('The public key must decode to 32 bytes. Copy id_ed25519.pub from your server.');
  return {idServer,relayServer,serverKey};
}
