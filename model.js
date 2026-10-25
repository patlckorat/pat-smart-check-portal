(function(root){
const months=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
function period(date,level,group){if(date<'2026-06-01'||date>'2027-05-31')return'UNKNOWN';if(level===3){if(date>='2027-04-01')return'UNKNOWN';if(date>='2027-03-01')return'GRADUATION_PROCESS';const a=date<='2026-08-15'||(date>='2026-11-01'&&date<='2026-12-31');return a===(group==='A')?'TRAINING':'STUDY';}const m=Number(date.slice(5,7)),a=[6,7,8,12,1,2].includes(m);return a===(group==='A')?'TRAINING':'STUDY';}
function monthDays(month){const [y,m]=month.split('-').map(Number);return new Date(Date.UTC(y,m,0)).getUTCDate();}
function nextDate(date){return new Date(Date.parse(date+'T00:00:00Z')+86400000).toISOString().slice(0,10);}
function shiftError(s){if(s.type==='OFF')return'';if(s.type!=='WORK')return'ประเภทวันไม่ถูกต้อง';if(!/^\d{2}:\d{2}$/.test(s.start||'')||!/^\d{2}:\d{2}$/.test(s.end||''))return'กรอกเวลาเข้าและเลิกกะ';const mins=t=>Number(t.slice(0,2))*60+Number(t.slice(3));const a=mins(s.start),b=mins(s.end);if(a<0||a>=1440||b<0||b>=1440||Number(s.start.slice(3))>59||Number(s.end.slice(3))>59)return'เวลาไม่ถูกต้อง';if(a===b)return'เวลาเข้าและเลิกต้องไม่เท่ากัน';if((b-a+1440)%1440>16*60)return'กะยาวเกิน 16 ชั่วโมง กรุณาตรวจเวลา';return'';}
root.PAT={months,period,monthDays,nextDate,shiftError};if(typeof module!=='undefined')module.exports=root.PAT;
})(typeof window!=='undefined'?window:globalThis);
