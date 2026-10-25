(function(){
const months=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
function bangkokMonth(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit'}).formatToParts(now).filter(p=>p.type==='year'||p.type==='month').map(p=>p.value).join('-');}
function model(rows,month=bangkokMonth()){
 const [year,m]=month.split('-').map(Number),offset=(new Date(Date.UTC(year,m-1,1)).getUTCDay()+6)%7,count=new Date(Date.UTC(year,m,0)).getUTCDate();
 const byDate=new Map();for(const row of rows){if(!String(row.work_date).startsWith(month+'-'))continue;const list=byDate.get(row.work_date)||[];list.push(row);byDate.set(row.work_date,list);}
 return {month,label:months[m-1]+' '+(year+543),offset,count,byDate};
}
function render(box,rows,month){
 const data=model(rows,month),today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
 box.replaceChildren();const head=el('div','calendar-heading');head.append(el('h2','',data.label),el('span','calendar-caption','ตารางที่ครูยืนยันแล้ว'));box.append(head);
 const legend=el('div','calendar-legend');for(const [cls,label]of [['work','วันทำงาน'],['off','วันหยุด'],['empty','ยังไม่จัดกะ']])legend.append(el('span',cls,label));box.append(legend);
 const grid=el('div','calendar-grid');grid.setAttribute('role','group');grid.setAttribute('aria-label','ปฏิทินกะ '+data.label);
 for(const name of ['จ.','อ.','พ.','พฤ.','ศ.','ส.','อา.'])grid.append(el('div','weekday',name));
 for(let i=0;i<data.offset;i++){const blank=el('div','calendar-blank');blank.setAttribute('aria-hidden','true');grid.append(blank);}
 const details=el('div','day-details');details.hidden=true;details.setAttribute('role','status');let selected=null;
 for(let day=1;day<=data.count;day++){
  const date=data.month+'-'+String(day).padStart(2,'0'),items=data.byDate.get(date)||[],off=items.length&&items.every(r=>r.day_type==='OFF'),cell=el('button','calendar-day '+(!items.length?'empty':off?'off':'work'));
  cell.type='button';cell.append(el('span','day-number',String(day)));if(date===today){cell.classList.add('today');cell.setAttribute('aria-current','date');}
  let description='ยังไม่จัดกะ';if(!items.length)cell.append(el('span','empty-mark','—'));else if(off){description='วันหยุด';cell.append(el('span','day-off','หยุด'));}else{const row=items.find(r=>r.day_type!=='OFF');description=row.start_time+' ถึง '+row.end_time;cell.append(el('span','shift-time',row.start_time),el('span','shift-time',row.end_time));if(row.end_time<row.start_time){cell.append(el('span','overnight','+1 วัน'));description+=' เลิกวันถัดไป';}if(items.length>1)cell.append(el('span','overnight','ดู '+items.length+' รายการ'));}
  cell.setAttribute('aria-label',day+' '+data.label+' '+description);cell.setAttribute('aria-pressed','false');
  cell.onclick=()=>{if(selected){selected.classList.remove('selected');selected.setAttribute('aria-pressed','false');}selected=cell;cell.classList.add('selected');cell.setAttribute('aria-pressed','true');details.replaceChildren(el('h3','',day+' '+data.label));if(!items.length)details.append(el('p','','ยังไม่มีกะที่ครูยืนยันสำหรับวันนี้'));for(const row of items){details.append(el('p','detail-time',row.day_type==='OFF'?'วันหยุด':row.start_time+'–'+row.end_time+(row.end_time<row.start_time?' · เลิกวันถัดไป':'')),el('p','detail-store','รหัสร้าน '+row.store_id));}details.hidden=false;};grid.append(cell);
 }
 const blanks=(7-(data.offset+data.count)%7)%7;for(let i=0;i<blanks;i++){const blank=el('div','calendar-blank');blank.setAttribute('aria-hidden','true');grid.append(blank);}
 box.append(grid,el('p','calendar-help','แตะวันที่เพื่อดูเวลาและรหัสร้าน · +1 วัน หมายถึงเลิกวันถัดไป'),details);
 if(!data.byDate.size)box.append(el('p','calendar-empty','ยังไม่มีกะที่ครูยืนยันในเดือนนี้'));
}
window.PATStudentCalendar={render,model,bangkokMonth};
})();
