(function(){
const enc=new TextEncoder();
function crc(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function zip(files){const parts=[],centers=[];let offset=0;for(const [name,text] of files){const n=enc.encode(name),b=enc.encode(text),sum=crc(b),h=new Uint8Array(30+n.length),v=new DataView(h.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint32(14,sum,true);v.setUint32(18,b.length,true);v.setUint32(22,b.length,true);v.setUint16(26,n.length,true);h.set(n,30);parts.push(h,b);const c=new Uint8Array(46+n.length),d=new DataView(c.buffer);d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(8,0x800,true);d.setUint32(16,sum,true);d.setUint32(20,b.length,true);d.setUint32(24,b.length,true);d.setUint16(28,n.length,true);d.setUint32(42,offset,true);c.set(n,46);centers.push(c);offset+=h.length+b.length;}const size=centers.reduce((n,c)=>n+c.length,0),end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);v.setUint32(12,size,true);v.setUint32(16,offset,true);const all=[...parts,...centers,end],result=new Uint8Array(offset+size+22);let at=0;for(const b of all){result.set(b,at);at+=b.length;}return result;}
const xmlEscape=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
async function create(buffer,students,month,store){
const get=await PATExcel.unzip(buffer),files=[];
for(const name of get.names){if(name.endsWith('/'))continue;let text=await get(name);
if(name==='xl/worksheets/sheet1.xml'){
const doc=new DOMParser().parseFromString(text,'application/xml'),ns=doc.documentElement.namespaceURI,rows=[...doc.getElementsByTagNameNS(ns,'row')];
const data=doc.getElementsByTagNameNS(ns,'sheetData')[0],sample=rows.find(r=>Number(r.getAttribute('r'))===2);if(!sample)throw Error('ต้นแบบไม่มีแถวตัวอย่าง');for(const row of rows)if(Number(row.getAttribute('r'))>1)row.remove();
for(let i=0;i<students.length;i++){const row=sample.cloneNode(true);row.setAttribute('r',String(i+2));for(const cell of [...row.getElementsByTagNameNS(ns,'c')]){const col=cell.getAttribute('r').replace(/[0-9]/g,'');cell.setAttribute('r',col+(i+2));let value={A:students[i].id,B:students[i].name,C:store,D:month}[col];if(value===undefined)value='';cell.setAttribute('t','inlineStr');cell.replaceChildren();const str=doc.createElementNS(ns,'is'),t=doc.createElementNS(ns,'t');t.textContent=value;str.append(t);cell.append(str);}data.append(row);}
const dimension=doc.getElementsByTagNameNS(ns,'dimension')[0];if(dimension)dimension.setAttribute('ref','A1:AI'+Math.max(2,students.length+1));
for(const validation of doc.getElementsByTagNameNS(ns,'dataValidation'))validation.setAttribute('sqref','E2:AI'+Math.max(101,students.length+1));
text=new XMLSerializer().serializeToString(doc);
}
if(name==='xl/tables/table1.xml'){const doc=new DOMParser().parseFromString(text,'application/xml');doc.documentElement.setAttribute('ref','A1:AI'+Math.max(2,students.length+1));for(const node of doc.getElementsByTagNameNS('*','autoFilter'))node.setAttribute('ref','A1:AI'+Math.max(2,students.length+1));text=new XMLSerializer().serializeToString(doc);}
if(name==='xl/worksheets/sheet3.xml'){const doc=new DOMParser().parseFromString(text,'application/xml'),ns=doc.documentElement.namespaceURI,c=[...doc.getElementsByTagNameNS(ns,'c')].find(c=>c.getAttribute('r')==='B2');if(c){c.setAttribute('t','inlineStr');c.replaceChildren();const str=doc.createElementNS(ns,'is'),t=doc.createElementNS(ns,'t');t.textContent='ต้นแบบตามห้องและร้านที่เลือก เดือน '+month+' ร้าน '+store+'; กรอกรหัสกะเฉพาะวันฝึก ช่องวันที่เว้นว่างไว้ให้ครูกรอก';str.append(t);c.append(str);}text=new XMLSerializer().serializeToString(doc);}
files.push([name,text]);}return zip(files);}
window.PATTemplate={create};
})();
