(() => {
'use strict';
const byId=id=>document.getElementById(id);
const status=message=>{byId('fish-auth-status').textContent=message;};
if(!window.supabase){status('Không tải được đăng nhập. Hãy kiểm tra mạng và tải lại trang.');return;}
const client=window.supabase.createClient(window.ONAX_CONFIG.SUPABASE_URL,window.ONAX_CONFIG.SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
let currentUser=null,revision=0,mode='login';
const returnUrl=new URL('./',location.href).href;
const buttons=()=>document.querySelectorAll('.fish-actions button');
async function action(fn){buttons().forEach(b=>b.disabled=true);status('Đang xử lý…');try{await fn();}catch(e){status(e.code==='user_already_exists'||/user already registered/i.test(e.message||'')?'Tên đăng nhập đã tồn tại':e.message||'Có lỗi kết nối. Hãy thử lại.');}finally{buttons().forEach(b=>b.disabled=false);}}
async function showUser(user){
currentUser=user;const run=++revision;
byId('fish-guest').hidden=!!user;byId('fish-member').hidden=!user;
byId('fish-points').textContent='Đang tải…';
byId('fish-user-id').textContent=user?.id||'';
const created=user?.created_at?new Date(user.created_at):null;
const validCreated=created&&!Number.isNaN(created.getTime());
byId('fish-created-at').textContent=validCreated?new Intl.DateTimeFormat('vi-VN',{dateStyle:'long',timeStyle:'short',timeZone:'Asia/Ho_Chi_Minh'}).format(created):user?'Chưa có thông tin':'';
if(validCreated)byId('fish-created-at').dateTime=created.toISOString();else byId('fish-created-at').removeAttribute('datetime');
if(!user){byId('fish-user').textContent='';byId('fish-name-form').hidden=true;return;}
byId('fish-name-form').hidden=true;
const profile=await client.from('fish_usernames').select('username').eq('user_id',user.id).maybeSingle();
if(run!==revision)return;
byId('fish-user').textContent=profile.data?.username||user.user_metadata?.fish_username||(user.email?.endsWith('@accounts.onaxmodz.invalid')?user.email.split('@')[0]:user.email)||'Tài khoản của bạn';
byId('fish-name-form').hidden=!!profile.error||!!profile.data;
const {data,error}=await client.from('fish_wallets').select('points').eq('user_id',user.id).maybeSingle();
if(run!==revision)return;
if(error){byId('fish-points').textContent='Không tải được';status('Không đọc được điểm: '+error.message);return;}
byId('fish-points').textContent=data?String(data.points):'Chưa có ví điểm';
}
function setMode(next){
mode=next;const register=next==='register';
byId('fish-username').required=true;
byId('fish-password').autocomplete=register?'new-password':'current-password';
byId('fish-password').minLength=register?8:1;
byId('fish-password-confirm-label').hidden=!register;
byId('fish-password-confirm').disabled=!register;byId('fish-password-confirm').required=register;
byId('fish-password-confirm').value='';byId('fish-password-confirm').setCustomValidity('');
byId('fish-submit').textContent=register?'Tạo tài khoản':'Đăng nhập';
byId('fish-register').textContent=next==='login'?'Đăng ký':'Quay lại đăng nhập';
status(register?'Nhập lại mật khẩu để xác nhận. Hãy ghi nhớ tên tài khoản và mật khẩu của bạn.':'');
}
async function usernameRequest(body){
const response=await fetch(window.ONAX_CONFIG.SUPABASE_URL+'/functions/v1/fish-username-login',{method:'POST',headers:{'Content-Type':'application/json',apikey:window.ONAX_CONFIG.SUPABASE_KEY},body:JSON.stringify(body)});
const data=await response.json().catch(()=>({}));
if(!response.ok)throw new Error(data.error||'Chưa hoàn tất thiết lập đăng nhập bằng tên tài khoản trong Supabase.');
return data;
}
byId('fish-login-form').addEventListener('submit',e=>{
e.preventDefault();
const confirm=byId('fish-password-confirm');
confirm.setCustomValidity(mode==='register'&&confirm.value!==byId('fish-password').value?'Hai mật khẩu không khớp. Hãy nhập lại.':'');
if(!e.currentTarget.reportValidity())return;
const username=byId('fish-username').value.trim().toLowerCase(),password=byId('fish-password').value;
action(async()=>{
if(mode==='register'){
const settingsResponse=await fetch(window.ONAX_CONFIG.SUPABASE_URL+'/auth/v1/settings',{headers:{apikey:window.ONAX_CONFIG.SUPABASE_KEY}});
if(!settingsResponse.ok)throw new Error('Không kiểm tra được đăng ký. Hãy thử lại.');
const settings=await settingsResponse.json();
if(!settings.mailer_autoconfirm)throw new Error('Đăng ký bằng tên tài khoản chưa được kích hoạt. Hãy thử lại sau hoặc đăng nhập Google.');
const accountEmail=username+'@accounts.onaxmodz.invalid';
const {data,error}=await client.auth.signUp({email:accountEmail,password,options:{emailRedirectTo:returnUrl,data:{fish_username:username}}});
if(error)throw error;byId('fish-password').value='';byId('fish-password-confirm').value='';
if(data.session){await showUser(data.user);status('Đã đăng ký và đăng nhập.');}else{setMode('login');status('Chưa đăng nhập được ngay. Hãy liên hệ quản trị viên để kiểm tra tài khoản.');}
return;
}
let result;
{
result=await client.auth.signInWithPassword({email:username+'@accounts.onaxmodz.invalid',password});
if(result.error?.code==='invalid_credentials'){
try{const tokens=await usernameRequest({username,password});result=await client.auth.setSession(tokens);}
catch{throw new Error('Tên tài khoản hoặc mật khẩu không đúng.');}
}
}
if(result.error)throw result.error;byId('fish-password').value='';await showUser(result.data.user);status('Đã đăng nhập.');
});});
for(const id of ['fish-password','fish-password-confirm'])byId(id).addEventListener('input',()=>byId('fish-password-confirm').setCustomValidity(''));
byId('fish-register').addEventListener('click',()=>setMode(mode==='login'?'register':'login'));
byId('fish-name-form').addEventListener('submit',e=>{e.preventDefault();if(!e.currentTarget.reportValidity())return;action(async()=>{
const {error}=await client.rpc('fish_set_username',{candidate:byId('fish-new-username').value.trim().toLowerCase()});
if(error)throw error;await showUser(currentUser);status('Đã lưu tên tài khoản. Lần sau dùng tên này và mật khẩu để đăng nhập.');
});});
setMode('login');

byId('fish-copy-id').addEventListener('click',async()=>{
const id=currentUser?.id;if(!id)return;
try{await navigator.clipboard.writeText(id);status('Đã sao chép ID người dùng.');}
catch{const range=document.createRange();range.selectNodeContents(byId('fish-user-id'));const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);status('Không sao chép tự động được. ID đã được chọn, bạn nhấn Ctrl+C hoặc giữ để sao chép.');}
});
byId('fish-google').addEventListener('click',()=>action(async()=>{const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:returnUrl}});if(error)throw error;}));
byId('fish-signout').addEventListener('click',()=>action(async()=>{const {error}=await client.auth.signOut();if(error)throw error;await showUser(null);status('Đã đăng xuất.');}));
byId('fish-refresh').addEventListener('click',()=>action(async()=>{await showUser(currentUser);if(byId('fish-points').textContent!=='Không tải được')status('Đã cập nhật.');}));
client.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>{showUser(session?.user??null).catch(e=>status(e.message));},0);});
client.auth.getSession().then(({data,error})=>{if(error)throw error;return showUser(data.session?.user??null);}).catch(e=>status(e.message));
})();
