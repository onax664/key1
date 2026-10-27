(() => {
 'use strict';
 const el=id=>document.getElementById(id),status=message=>el('fish-points-status').textContent=message;
 if(!window.supabase){el('fish-points').textContent='—';status('Không tải được tài khoản. Hãy tải lại trang.');return;}
 const client=window.supabase.createClient(window.ONAX_CONFIG.SUPABASE_URL,window.ONAX_CONFIG.SUPABASE_KEY);
 let revision=0,user=null,configured=false,busy=false;
 const taskStatus=message=>el('fish-task-status').textContent=message;
 function controls(){
  el('fish-task-start').disabled=busy||!configured||!user;
  el('fish-reward-key').disabled=busy||!configured||!user;
  el('fish-key-claim').disabled=busy||!configured||!user;
 }
 async function taskRequest(body,token){
  const response=await fetch(window.ONAX_CONFIG.SUPABASE_URL+'/functions/v1/fish-link4m',{
   method:'POST',headers:{apikey:window.ONAX_CONFIG.SUPABASE_KEY,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)
  }).catch(()=>{throw new Error('Chưa kết nối được nhiệm vụ. Hãy thử lại sau.');});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||'Nhiệm vụ chưa được kích hoạt.');
  return data;
 }
 async function refresh(){
  const run=++revision;
  el('fish-points-refresh').disabled=true;
  try{
   const {data,error}=await client.auth.getSession();if(error)throw error;
   user=data.session?.user||null;
   if(run!==revision)return;
   el('fish-points-login').hidden=!!user;el('fish-points-refresh').hidden=!user;controls();
   if(!user){el('fish-points').textContent='—';status('Đăng nhập để xem điểm và nhận điểm vào tài khoản.');return;}
   const wallet=await client.from('fish_wallets').select('points').eq('user_id',user.id).maybeSingle();
   if(run!==revision)return;if(wallet.error)throw wallet.error;
   el('fish-points').textContent=wallet.data?String(wallet.data.points):'—';
   status(wallet.data?'Điểm được lưu trong tài khoản của bạn.':'Tài khoản chưa có ví điểm.');
  }catch{if(run===revision){el('fish-points').textContent='—';status('Không tải được điểm. Hãy thử lại.');}}
  finally{if(run===revision)el('fish-points-refresh').disabled=false;}
 }
 el('fish-points-refresh').addEventListener('click',refresh);
 el('fish-task-start').addEventListener('click',async()=>{
  busy=true;controls();taskStatus('Đang tạo nhiệm vụ…');
  try{
   const {data,error}=await client.auth.getSession();if(error)throw error;
   if(!data.session)throw new Error('Bạn cần đăng nhập để mở nhiệm vụ.');
   const task=await taskRequest({action:'start',device:window.fishDeviceId()},data.session.access_token),url=new URL(task.url);
   if(url.protocol!=='https:'||!/(^|\.)link4m\.(com|co|net|org)$/i.test(url.hostname))throw new Error('Đường dẫn nhiệm vụ không hợp lệ.');
   taskStatus('Đang chuyển đến Link4M…');
   window.location.assign(url.href);
  }catch(e){taskStatus(e.message||'Không tạo được nhiệm vụ.');}
  finally{busy=false;controls();}
 });
 el('fish-key-form').addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!user||!configured||!event.currentTarget.reportValidity())return;
  busy=true;controls();taskStatus('Đang kiểm tra key…');
  try{
   const {data,error}=await client.rpc('fish_claim_link4m_key',{candidate:el('fish-reward-key').value.trim().toUpperCase()});
   if(error)throw error;
   el('fish-points').textContent=String(data);el('fish-reward-key').value='';el('fish-task-link-wrap').hidden=true;
   taskStatus('Đã nhận 2 điểm vào tài khoản.');
  }catch(e){taskStatus(e.message||'Không nhận được điểm. Hãy thử lại.');}
  finally{busy=false;controls();}
 });
 taskRequest({action:'ready'}).then(data=>{
  configured=!!data.ready;
  el('fish-task-config').textContent=configured?'Mở nhiệm vụ để lấy key.':'Nhiệm vụ chưa được kích hoạt. Hãy quay lại sau.';controls();
 }).catch(()=>{el('fish-task-config').textContent='Nhiệm vụ chưa được kích hoạt. Hãy quay lại sau.';controls();});
 client.auth.onAuthStateChange(()=>setTimeout(refresh,0));
 refresh();
})();
