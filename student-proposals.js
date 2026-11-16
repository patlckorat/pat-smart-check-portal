(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const make = (tag, text) => Object.assign(document.createElement(tag), {textContent:text || ''});
  const button = (text, run) => {
    const b = make('button', text);
    b.type = 'button';
    b.onclick = async () => {
      b.disabled = true;
      try {await run();} catch(e) {message.textContent = e.message;}
      finally {b.disabled = false;}
    };
    return b;
  };
  const teacher = !!byId('shiftArea');
  const host = teacher ? byId('shiftArea') : byId('schedule');
  if (!host) return;
  const panel = make('section');
  panel.className = 'card';
  if (teacher) host.prepend(panel); else host.after(panel);
  const message = make('p');
  message.setAttribute('role','status');
  const list = make('div');
  let records = [];
  const today = () => new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Bangkok'}).format(new Date());
  const time = iso => iso ? new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit'}).format(new Date(iso)) : '';
  async function api(action, data = {}) {
    const auth = teacher ? {session_token:JSON.parse(sessionStorage.getItem('pat_teacher_session_v1') || '{}').token} : {id_token:window.liff.getIDToken()};
    const response = await fetch(PAT_CONFIG.appsScriptUrl,{method:'POST',body:new URLSearchParams({payload:JSON.stringify({action:(teacher?'teacher.':'student.')+'proposal.'+action,...auth,...data})})});
    const result = await response.json();
    if (!result.ok) throw Error(result.error || 'ทำรายการไม่สำเร็จ');
    return result.data;
  }
  const field = (label,type) => {
    const wrap=make('label',label), input=make('input');
    input.type=type; wrap.append(input);
    return [wrap,input];
  };
  async function punch(p,kind) {
    const pos=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,()=>reject(Error('รับพิกัดไม่ได้ กรุณาอนุญาตตำแหน่งแล้วลองอีกครั้ง')),{enableHighAccuracy:true,timeout:18000,maximumAge:0}));
    const r=await api('punch',{id:p.id,work_date:p.work_date,event_type:kind,latitude:pos.coords.latitude,longitude:pos.coords.longitude,accuracy_m:pos.coords.accuracy});
    return time(kind==='IN'?r.check_in:r.check_out);
  }
  async function load() {
    records=await api('list');
    render();
  }
  const form=make('div');
  let selected = new Map();
  const [dateLabel,date]=field('วันที่','date'), [startLabel,start]=field('เวลาเข้า','time'), [endLabel,end]=field('เวลาออก','time');
  const reason=make('textarea'), reasonLabel=make('label','เหตุผลกรณีย้อนหลัง');
  reasonLabel.append(reason);
  const type=make('select');
  type.add(new Option('ทำงาน','WORK')); type.add(new Option('วันหยุด','OFF'));
  const typeLabel=make('label','ประเภทวัน'); typeLabel.append(type);
  const basket=make('div');
  function edit(d) {
    form.hidden=false; date.value=d;
    const p=selected.get(d) || records.find(p=>p.work_date===d && p.status==='PENDING');
    type.value=p?.day_type || 'WORK'; start.value=p?.start_time || '07:00'; end.value=p?.end_time || '16:00'; reason.value=p?.reason || '';
    type.onchange(); form.scrollIntoView({block:'nearest'});
  }
  type.onchange=()=>{startLabel.hidden=endLabel.hidden=type.value==='OFF';};
  date.onchange=()=>{if(date.value) edit(date.value);};
  function current() {
    if(!date.value || type.value==='WORK' && (!start.value || !end.value)) throw Error('กรุณาระบุวันที่และเวลา');
    return {work_date:date.value,day_type:type.value,start_time:start.value,end_time:end.value,reason:reason.value,version:records.find(p=>p.work_date===date.value && p.status==='PENDING')?.version};
  }
  function showBasket() {basket.textContent='วันที่ที่เลือก '+[...selected.keys()].join(', ');}
  async function submit(combined) {
    const row=current();
    if(combined && (row.work_date!==today() || row.day_type!=='WORK')) throw Error('กรุณาเลือกกะทำงานของวันนี้');
    const batch = combined ? [row] : [...new Map([...selected,[row.work_date,row]]).values()];
    let saved=0;
    try {
      for(const item of batch) {
        const p=await api('submit',item);
        saved++; selected.delete(item.work_date); showBasket();
        if(combined) message.textContent='ส่งกะแล้ว · เช็คอินสำเร็จ '+await punch(p,'IN');
      }
      if(!combined) message.textContent='ส่งให้ครูตรวจแล้ว '+saved+' วัน';
    } catch(e) {message.textContent=(combined && saved?'ส่งกะแล้ว · เช็คอินไม่สำเร็จ · ': 'ส่งสำเร็จ '+saved+' วัน · ')+e.message;}
    await load();
  }
  if(!teacher) {
    form.hidden=true;
    form.append(dateLabel,typeLabel,startLabel,endLabel,reasonLabel,button('เก็บวันนี้และเลือกวันเพิ่ม',()=>{const p=current();selected.set(p.work_date,p);showBasket();}),basket,button('ส่งให้ครูตรวจ',()=>submit(false)),button('เสนอกะวันนี้และเช็คอิน',()=>submit(true)));
    panel.append(button('เสนอตารางกะของฉัน',async()=>{await load();edit(today());}),form);
    host.addEventListener('click',async event=>{
      const cell=event.target.closest('.calendar-day.empty');
      if(!cell) return;
      const month=host.querySelector('.calendar-heading h2')?.textContent.split(' ');
      const months='มกราคม กุมภาพันธ์ มีนาคม เมษายน พฤษภาคม มิถุนายน กรกฎาคม สิงหาคม กันยายน ตุลาคม พฤศจิกายน ธันวาคม'.split(' ');
      if(!month || !months.includes(month[0])) return;
      try {await load(); edit([Number(month[1])-543,String(months.indexOf(month[0])+1).padStart(2,'0'),cell.querySelector('.day-number').textContent.padStart(2,'0')].join('-'));} catch(e){message.textContent=e.message;}
    });
  }
  if(!teacher && byId('attendanceArea')) {
    const quick=button('เสนอกะวันนี้และเช็คอิน',async()=>{
      await load(); edit(today());
      message.textContent='ตรวจเวลาของวันนี้ แล้วกดเสนอกะวันนี้และเช็คอิน';
    });
    const schedule=byId('schedule');
    byId('attendanceArea').append(quick);
    const updateQuick=()=>{quick.hidden=!schedule.querySelector('.calendar-day.today.empty');};
    new MutationObserver(updateQuick).observe(schedule,{childList:true,subtree:true});
    updateQuick();
  }
  const priority=button('เช็คอินแล้ว รออนุมัติกะ',async()=>{await load();render(true);});
  if(teacher) panel.append(make('h2','กะที่นักเรียนเสนอ'),priority);
  panel.append(button(teacher?'ดูคำขอเสนอกะทั้งหมด':'ดูสถานะกะที่เสนอ',load),message,list);
  async function review(rows,decision,note) {
    let saved=0;
    try {for(const p of rows) {await api('review',{id:p.id,version:p.version,decision,note});saved++;}}
    finally {message.textContent='ตรวจแล้ว '+saved+' วัน'; await load();}
  }
  function render(onlyIn=false) {
    list.replaceChildren();
    const names={PENDING:'รอครูอนุมัติ',APPLYING:'กำลังบันทึก · กดอนุมัติเพื่อดำเนินการต่อ',APPROVED:'อนุมัติแล้ว',REJECTED:'ปฏิเสธ'};
    if(teacher) priority.textContent='เช็คอินแล้ว รออนุมัติกะ ('+records.filter(p=>p.check_in).length+')';
    const choices=[];
    if(teacher && !onlyIn) list.append(make('p','ถึงวันทำงานแล้ว · รออนุมัติ '+records.filter(p=>p.work_date<=today() && p.day_type==='WORK').length+' รายการ'));
    for(const p of records.filter(p=>!onlyIn || p.check_in).sort((a,b)=>Number(!!b.check_in)-Number(!!a.check_in)||a.work_date.localeCompare(b.work_date))) {
      const box=make('article');
      box.append(make('strong',[teacher?p.name:'',p.work_date,p.day_type==='OFF'?'วันหยุด':p.start_time+'–'+p.end_time].filter(Boolean).join(' · ')),make('p',[names[p.status],p.store||p.store_id,p.room||p.class_id,p.center,p.check_in?'เข้า '+time(p.check_in):'',p.check_out?'ออก '+time(p.check_out):'',p.reason,p.note].filter(Boolean).join(' · ')));
      if(teacher) {
        const [label,check]=field('เลือกวันนี้','checkbox'); choices.push([check,p]); box.append(label,button('อนุมัติวันนี้',()=>review([p],'APPROVED','')),button('ปฏิเสธ',async()=>{const note=prompt('เหตุผลที่ปฏิเสธ'); if(note) await review([p],'REJECTED',note);}));
      } else if(p.status==='PENDING') {
        if(!p.check_in) box.append(button('แก้ไขคำขอ',()=>edit(p.work_date)));
        if(p.day_type==='WORK' && !p.check_out) box.append(button(p.check_in?'เช็คเอาต์เลิกงาน':'เช็คอินเข้างาน',async()=>{const stamp=await punch(p,p.check_in?'OUT':'IN');message.textContent='ลงเวลาสำเร็จ '+stamp+' · กะรอครูอนุมัติ';await load();}));
      }
      list.append(box);
    }
    if(teacher && choices.length) list.prepend(button('อนุมัติวันที่เลือก',async()=>{const rows=choices.filter(([c])=>c.checked).map(([,p])=>p);if(rows.length)await review(rows,'APPROVED','');}));
    if(!list.children.length) list.append(make('p','ไม่มีคำขอในรายการนี้'));
  }
  const visible=teacher?host:byId('studentActions');
  async function sync() {
    panel.hidden=visible.hidden;
    if(!visible.hidden) try {await load();} catch(e){message.textContent=e.message;}
  }
  new MutationObserver(sync).observe(visible,{attributes:true,attributeFilter:['hidden']});
  sync();
})();


