(()=>{'use strict';
const time=document.getElementById('clockTime'),date=document.getElementById('clockDate');
const timeFormat=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
const dateFormat=new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',weekday:'long',day:'numeric',month:'long',year:'numeric'});
let timer;
function tick(){clearTimeout(timer);const now=new Date();time.textContent=timeFormat.format(now);date.textContent=dateFormat.format(now);timer=setTimeout(tick,1000-Date.now()%1000);}
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTimeout(timer);else tick();});
tick();
})();
