import {validate, type Settings} from './settings';
const $=(id:string)=>document.getElementById(id) as HTMLInputElement;
const frame=$('client') as unknown as HTMLIFrameElement;
let ready=false,active:Settings|undefined;
function status(text:string,error=false){$('settingsStatus').textContent=text;$('settingsStatus').classList.toggle('error',error);}
function apply(){if(ready&&active)frame.contentWindow?.postMessage({type:'configure',settings:active},location.origin);}
window.addEventListener('message',e=>{
 if(e.origin!==location.origin||e.source!==frame.contentWindow)return;
 if(e.data?.type==='ready'){ready=true;apply();}
 if(e.data?.type==='configured')status('Settings applied. Enter a device ID to connect.');
 if(e.data?.type==='config-error')status(String(e.data.message),true);
});
$('settings').addEventListener('submit',e=>{e.preventDefault();try{active=validate({idServer:$('idServer').value,relayServer:$('relayServer').value,serverKey:$('serverKey').value});
 try{if($('remember').checked)localStorage.setItem('rustdesk-portal-settings',JSON.stringify(active));else localStorage.removeItem('rustdesk-portal-settings');}catch{status('Browser storage is unavailable. Settings work for this tab.');}
 apply();if(!ready)status('Settings validated. Waiting for the connection engine…');
}catch(err){status((err as Error).message,true);}});
$('clear').addEventListener('click',()=>{try{localStorage.removeItem('rustdesk-portal-settings');$('remember').checked=false;status('Saved settings cleared. Current tab settings remain active.');}catch{status('Browser storage is unavailable.',true);}});
try{const stored=localStorage.getItem('rustdesk-portal-settings');if(stored){active=validate(JSON.parse(stored));for(const id of ['idServer','relayServer','serverKey'] as const)$(id).value=active[id];$('remember').checked=true;}}catch{status('Saved settings could not be loaded. Enter them again.',true);}
