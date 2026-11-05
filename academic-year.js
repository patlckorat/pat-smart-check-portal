(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const stateKey = 'pat_academic_year_queue_v1';
  const headers = ['รหัสนักเรียน','คำนำหน้า','ชื่อ','นามสกุล'];
  let data, plan, queue, busy = false;
  const note = text => $('message').textContent = text;
  async function api(action, body={}) {
    const session=JSON.parse(sessionStorage.getItem('pat_teacher_session_v1') || 'null');
    if (!session || session.expires<=Date.now()) throw Error('กรุณาเข้าสู่ระบบจากพื้นที่ครู แล้วเปิดหน้านี้อีกครั้ง');
    const response=await fetch(PAT_CONFIG.appsScriptUrl,{method:'POST',body:new URLSearchParams({payload:JSON.stringify({action:'teacher.year.'+action,session_token:session.token,...body})})});
    if(!response.ok) throw Error('ติดต่อระบบไม่ได้ กรุณาลองอีกครั้ง');
    const result=await response.json();
    if(!result.ok) throw Error(result.error);
    return result.data;
  }
  function persist(){sessionStorage.setItem(stateKey,JSON.stringify(queue));}
  function controls(){
    for(const el of document.querySelectorAll('main select,main input,main button')) el.disabled=busy || (!!queue && !['save','discard'].includes(el.id));
    $('save').hidden=!plan&&!queue;
    $('discard').hidden=!queue;
  }
  async function run(fn){
    if(busy)return; busy=true; controls();
    try{await fn();}catch(e){note(e.message);}finally{busy=false;controls();}
  }
  function invalidate(){plan=null;$('result').replaceChildren();$('save').hidden=true;note('ตรวจรายชื่อหรือห้องก่อนยืนยัน');}
  function options(el,values){el.replaceChildren(...values.map(([id,name])=>new Option(name,id)));}
  function roster(){
    const students=data.students.filter(s=>s.room===$('source').value);
    $('all').checked=false;$('roster').replaceChildren();
    for(const s of students){
      const label=document.createElement('label'), input=document.createElement('input');
      input.type='checkbox';input.value=s.id;label.append(input,' '+s.code+' · '+s.name);$('roster').append(label);
    }
  }
  function rooms(){
    const year=Number($('year').value), promote=$('mode').value==='promote';
    options($('source'),data.rooms.filter(r=>r.year===year-1).map(r=>[r.id,r.name]));
    targets();roster();
    $('fromLabel').hidden=$('selection').hidden=!promote;$('upload').hidden=promote;
    $('dayHelp').textContent=promote?'กรุณาดำเนินการในวันที่ต้องการให้มีผล ระบบจะเปลี่ยนห้องเรียนทันทีเมื่อยืนยันบันทึก ยังไม่รองรับการตั้งวันที่ล่วงหน้าหรือย้อนหลัง':'เลือกวันที่เริ่มฝึกของนักเรียนใหม่ ข้อมูลจะถูกเพิ่มในทะเบียนเมื่อยืนยันบันทึก';
    document.getElementById('dayHelpTitle').textContent=promote?'วันที่มีผลในการเลื่อนชั้น':'วันที่เริ่มฝึกของนักเรียนใหม่';
  }
  function targets(){
    const source=data.rooms.find(r=>r.id===$('source').value);
    options($('target'),data.rooms.filter(r=>r.year===Number($('year').value)&&($('mode').value==='new'||(source&&r.level===source.level+1&&r.education===source.education))).map(r=>[r.id,r.name]));
  }
  async function load(center){
    data=await api('list',{center_id:center});
    options($('center'),data.centers);$('center').value=data.center;
    if(!$('year').value)$('year').value=Math.max(...data.rooms.map(r=>r.year),Number(data.today.slice(0,4))+543)+1;
    $('day').value=data.today;rooms();
    const stored=JSON.parse(sessionStorage.getItem(stateKey)||'null');
    if(stored && stored.actor===data.actor){queue=stored;showQueue();}else{queue=null;invalidate();}
  }
  function showRows(items){
    $('result').replaceChildren(...items.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
  }
  function showQueue(){
    showRows(queue.rows.map(r=>r.code+' · '+r.name+' · '+(r.done?'บันทึกแล้ว':r.started?'รอตรวจผลรายการเดิม':'รอบันทึก')));
    note('บันทึกแล้ว '+queue.rows.filter(r=>r.done).length+' / '+queue.rows.length+' คน · '+queue.label);
  }
  $('center').onchange=()=>run(()=>load($('center').value));
  $('year').onchange=$('mode').onchange=()=>{invalidate();rooms();};
  $('source').onchange=()=>{invalidate();targets();roster();};
  for(const id of ['target','day','roster','file'])$(id).onchange=invalidate;
  $('all').onchange=()=>{invalidate();for(const input of $('roster').querySelectorAll('input'))input.checked=$('all').checked;};
  $('rooms').onclick=()=>run(async()=>{
    invalidate();
    const body={center_id:data.center,year:Number($('year').value)};
    const response=await api('rooms',body);
    showRows(response.names);
    note(response.names.length?'จะสร้าง '+response.names.length+' ห้องในปี '+body.year:'มีห้องครบแล้วในปี '+body.year);
    if(response.names.length)plan={kind:'rooms',body:{...body,revision:response.revision}};
  });
  $('download').onclick=()=>{
    const bytes=PATReportExcel.create([{name:'NEW_STUDENTS',rows:[headers]}]);
    const link=document.createElement('a'),url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
    link.href=url;link.download='PAT_New_Students.xlsx';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  $('preview').onclick=()=>run(async()=>{
    invalidate();let items;
    if($('mode').value==='promote'){
      items=[...$('roster').querySelectorAll('input:checked')].map(el=>({id:el.value}));
    }else{
      if(!$('file').files.length)throw Error('เลือกไฟล์ Excel จากเทมเพลตก่อน');
      const parsed=await PATExcel.read($('file').files[0],'NEW_STUDENTS');
      items=parsed.rows.map(({values:v})=>({code:String(v[headers[0]]).trim(),prefix:String(v[headers[1]]).trim(),first:String(v[headers[2]]).trim(),last:String(v[headers[3]]).trim()}));
    }
    const body={center_id:data.center,source:$('source').value,target:$('target').value,date:$('day').value,mode:$('mode').value};
    const rows=await api('preview',{...body,items});
    const label=$('center').selectedOptions[0].text+' · '+$('target').selectedOptions[0].text+' · '+body.date;
    plan={kind:'students',body,label,rows:rows.map((r,i)=>({...r,item:items[i],op:crypto.randomUUID()}))};
    showRows(rows.map(r=>r.code+' · '+r.name));note(label+' · ตรวจแล้ว '+rows.length+' คน');
  });
  $('save').onclick=()=>run(async()=>{
    if(plan?.kind==='rooms'){
      if(!confirm('สร้างห้องตามรายการที่ตรวจแล้ว?'))return;
      const year=plan.body.year;await api('rooms',{...plan.body,confirm:true});plan=null;await load(data.center);note('เตรียมห้องปี '+year+' แล้ว');return;
    }
    if(!queue){
      if(!plan || !confirm('ยืนยัน '+plan.rows.length+' คน เข้าห้อง '+plan.label+'?'))return;
      queue={actor:data.actor,body:plan.body,label:plan.label,rows:plan.rows};persist();plan=null;
    }
    for(const row of queue.rows){
      if(row.done)continue;
      row.started=true;persist();showQueue();
      await api('apply',{...queue.body,items:[row.item],revision:row.revision||'',operation_id:row.op,confirm:true});
      row.done=true;persist();showQueue();
    }
    const count=queue.rows.length;sessionStorage.removeItem(stateKey);queue=null;await load(data.center);note('บันทึกครบ '+count+' คนแล้ว');
  });
  $('discard').onclick=()=>run(async()=>{
    if(!confirm('ปิดรายการในเครื่องหลังตรวจทะเบียนแล้ว? รายชื่อที่บันทึกสำเร็จยังคงอยู่ในทะเบียน'))return;
    sessionStorage.removeItem(stateKey);queue=null;await load(data.center);
  });
  run(()=>load(''));
})();

