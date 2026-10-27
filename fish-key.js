(() => {
 'use strict';
 const el=id=>document.getElementById(id),status=message=>el('fish-key-status').textContent=message;
 const receipt=new URLSearchParams(location.hash.slice(1)).get('receipt');
 if(!receipt){status('Đường dẫn không có key. Hãy mở nhiệm vụ từ mục Nhận điểm.');return;}
 el('fish-key-copy').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(el('fish-key-display').value);status('Đã sao chép key. Quay lại mục Nhận điểm để nhập key.');}
  catch{el('fish-key-display').select();status('Hãy sao chép key đang được chọn.');}
 });
 (async()=>{
  try{
   const response=await fetch(window.ONAX_CONFIG.SUPABASE_URL+'/functions/v1/fish-link4m',{
    method:'POST',headers:{apikey:window.ONAX_CONFIG.SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify({action:'key',receipt})
   });
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(data.error||'Không tải được key.');
   el('fish-key-display').value=data.key;el('fish-key-display-wrap').hidden=false;el('fish-key-copy').hidden=false;
   status('Đã lấy được key. Key chỉ dùng cho tài khoản đã mở nhiệm vụ.');
  }catch(e){status(e.message==='Failed to fetch'?'Không kết nối được key. Hãy thử tải lại trang.':e.message||'Không tải được key.');}
 })();
})();
