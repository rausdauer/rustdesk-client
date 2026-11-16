import * as core from '../vendor/core/globals';
import {installKeyboardGrab} from '../vendor/core/keyboard';
import {validate} from './settings';
const $=(id:string)=>document.getElementById(id) as HTMLInputElement;
const canvas=$('screen') as unknown as HTMLCanvasElement;
const ctx=canvas.getContext('2d')!;
let configured=false,authenticated=false,connecting=false,authType='password',selected=0;
let lastError='';
let displays:{width:number;height:number;x:number;y:number}[]=[];
let timer:ReturnType<typeof setTimeout>|undefined;
function status(text:string,error=false){if(error)lastError=text;$('clientStatus').textContent=text;$('clientStatus').classList.toggle('error',error);}
function controls(){ $('connect').disabled=!configured||connecting||authenticated;$('disconnect').disabled=!connecting&&!authenticated;for(const id of ['cad','display'])$(id).disabled=!authenticated; }
function reset(){if(timer)clearTimeout(timer);connecting=false;authenticated=false;core.setKeyboardGrabEntered(false);canvas.hidden=true;$('empty').hidden=false;($('auth') as unknown as HTMLDialogElement).close();controls();}
function disconnect(){core.close();reset();status('Disconnected.');$('resolution').textContent='No active session';}
function dimensions(){const d=displays[selected];if(d&&d.width>0&&d.height>0){canvas.width=d.width;canvas.height=d.height;}}
function showAuth(type:string){authType=type;$('authTitle').textContent=type==='2fa'?'Two-factor code':'Device password';$('credential').value='';$('credential').type=type==='2fa'?'text':'password';core.setKeyboardGrabEntered(false);const d=$('auth') as unknown as HTMLDialogElement;if(!d.open)d.showModal();$('credential').focus();}
(window as any).onGlobalEvent=(raw:string)=>{
 const e=JSON.parse(raw);
 if(e.name==='peer_info'){
  displays=JSON.parse(e.displays||'[]');selected=Number(e.current_display)||0;
  $('display').replaceChildren(...displays.map((d,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=`Monitor ${i+1} · ${d.width}×${d.height}`;return o;}));$('display').value=String(selected);dimensions();
 }
 if(e.name==='login_response'){
  authenticated=true;connecting=false;if(timer)clearTimeout(timer);($('auth') as unknown as HTMLDialogElement).close();controls();status('Connected. Waiting for video…');
 }
 if(e.name==='switch_display'){selected=Number(e.display)||0;$('display').value=String(selected);dimensions();}
 if(e.name==='msgbox'){
  if(['input-password','re-input-password'].includes(e.type)){showAuth('password');status(e.title||'Device password required.');}
  else if(e.type==='error'){const message=[e.title,e.text].filter(Boolean).join(': ');core.close();reset();status(message,true);}
  else status(e.text||e.title||'Connecting…');
 }
 if(e.name==='auth_2fa')showAuth('2fa');
 if(e.name==='on_connection_close'){reset();status(lastError||'Connection closed.',!!lastError);}
 if(e.name==='on_disconnect'){const reason=e.reason||'Remote device disconnected.';core.close();reset();status(reason,true);}
};
(window as any).onVideoFrame=(display:number,frame:any)=>{
 try{if(display!==selected)return;if(canvas.width!==frame.displayWidth||canvas.height!==frame.displayHeight){canvas.width=frame.displayWidth;canvas.height=frame.displayHeight;}ctx.drawImage(frame,0,0);canvas.hidden=false;$('empty').hidden=true;status('Connected · click the desktop to control it');$('resolution').textContent=`${canvas.width} × ${canvas.height}`;}finally{frame.close();}
};
(window as any).onRgba=(display:number,rgba:Uint8Array)=>{
 if(display!==selected)return;const d=displays[selected];if(!d||rgba.length!==d.width*d.height*4)return;
 if(canvas.width!==d.width||canvas.height!==d.height)dimensions();ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba),d.width,d.height),0,0);canvas.hidden=false;$('empty').hidden=true;
};
window.addEventListener('message',e=>{
 if(e.origin!==location.origin||e.source!==parent||e.data?.type!=='configure')return;
 try{if(connecting||authenticated)throw new Error('Disconnect before changing server settings.');const s=validate(e.data.settings);core.configureServers(s.idServer,s.relayServer,s.serverKey);configured=true;controls();status('Ready to connect through your server.');parent.postMessage({type:'configured'},location.origin);}catch(err){parent.postMessage({type:'config-error',message:(err as Error).message},location.origin);}
});
$('connectForm').addEventListener('submit',e=>{
 e.preventDefault();if(!configured||connecting||authenticated)return;
 if(!window.isSecureContext||typeof (window as any).VideoDecoder!=='function'){status('This client requires HTTPS (or localhost) and WebCodecs. Use current desktop Chrome or Edge.',true);return;}
 const id=$('peerId').value.replace(/\s/g,'');if(!/^[A-Za-z0-9_-]+$/.test(id)){status('Enter a RustDesk device ID without a server suffix.',true);return;}
 lastError='';connecting=true;controls();status('Connecting…');
 core.setOption('video_decoder','webcodecs');core.setOption('show_remote_cursor','true');
 const password=$('password').value;$('password').value='';
 window.setByName('session_add_sync',JSON.stringify({id,password}));
 timer=setTimeout(()=>{core.close();reset();status('Connection timed out. Check the ID, WSS proxy, and server public key.',true);},90000);
});
$('disconnect').addEventListener('click',disconnect);
$('authForm').addEventListener('submit',e=>{e.preventDefault();const value=$('credential').value;$('credential').value='';($('auth') as unknown as HTMLDialogElement).close();if(authType==='2fa')core.getConn()?.send2fa(value);else core.getConn()?.login(value);status('Authenticating…');});
$('authCancel').addEventListener('click',disconnect);
$('auth').addEventListener('cancel',disconnect);
$('cad').addEventListener('click',()=>core.getConn()?.ctrlAltDel());
$('display').addEventListener('change',()=>{selected=Number($('display').value);dimensions();core.getConn()?.switchDisplay(selected);});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('viewport').requestFullscreen();}catch{status('Fullscreen is unavailable in this browser.',true);}});
function mouse(e:PointerEvent|WheelEvent,type:string){
 if(!authenticated)return;const rect=canvas.getBoundingClientRect(),d=displays[selected];
 core.getConn()?.sendMouse(JSON.stringify({type,buttons:['left','wheel','right','back','forward'][(e as PointerEvent).button]||'',x:type==='wheel'?-Math.sign((e as WheelEvent).deltaX):Math.floor((e.clientX-rect.left)*canvas.width/rect.width)+(d?.x||0),y:type==='wheel'?-Math.sign((e as WheelEvent).deltaY):Math.floor((e.clientY-rect.top)*canvas.height/rect.height)+(d?.y||0),alt:e.altKey,ctrl:e.ctrlKey,shift:e.shiftKey,command:e.metaKey}));
}
canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.focus();core.setKeyboardGrabEntered(true);canvas.setPointerCapture(e.pointerId);mouse(e,'down');});
canvas.addEventListener('pointermove',e=>mouse(e,'move'));
canvas.addEventListener('pointerup',e=>{mouse(e,'up');if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);});
canvas.addEventListener('pointercancel',e=>mouse(e,'up'));
canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('wheel',e=>{e.preventDefault();mouse(e,'wheel');},{passive:false});
window.addEventListener('keydown',e=>{if(e.key==='Escape'){core.setKeyboardGrabEntered(false);canvas.blur();status(authenticated?'Connected · keyboard released':'Ready');}},true);
canvas.addEventListener('blur',()=>core.setKeyboardGrabEntered(false));
window.addEventListener('beforeunload',()=>core.close());
installKeyboardGrab();
core.init().then(()=>{status('Apply server settings to begin.');parent.postMessage({type:'ready'},location.origin);}).catch(err=>status(`Engine failed to load: ${err.message}`,true));
