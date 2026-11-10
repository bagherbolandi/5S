import {initialState,inventory,key,scope,confirmInventory,validateState,validateSelection,score} from './domain.js';
const $=s=>document.querySelector(s);
const storageKey='holding-5s-prototype-v1';
const fmt=new Intl.NumberFormat('fa-IR');
const statusText={confirmed:'فهرست موجود تأییدشده',unconfigured:'پیکربندی نشده'};
let config,checklists,state,drafts={},selected=[],currentCompany,currentSite='',baseRevision=0,answers={};
function notify(message,error=false){$('#feedback').textContent=message;$('#feedback').className=error?'error':'';}
function node(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
function validateBundle(value){
  const valid=validateState(config,value.state);
  if(!value.drafts||typeof value.drafts!=='object'||Array.isArray(value.drafts))throw new Error('ساختار پیش‌نویس نامعتبر است.');
  for(const [k,v] of Object.entries(value.drafts)){
    const [company,site,...extra]=k.split('/');
    if(extra.length||site===undefined||!Array.isArray(v))throw new Error('پیش‌نویس نامعتبر است.');
    scope(config,company,site);
    // Stale site drafts remain editable after company changes; confirmation checks the subset.
    validateSelection(config,valid,company,'',v);
  }
  return {state:valid,drafts:structuredClone(value.drafts)};
}
function readStored(){const raw=localStorage.getItem(storageKey);return raw?validateBundle(JSON.parse(raw)):null;}
function persist(nextState=state,nextDrafts=drafts){
  localStorage.setItem(storageKey,JSON.stringify({state:nextState,drafts:nextDrafts}));
  state=nextState;drafts=nextDrafts;
}
function download(name,body,type){const url=URL.createObjectURL(new Blob([body],{type}));const a=node('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function switchView(id){document.querySelectorAll('main>section').forEach(x=>x.hidden=x.id!==id);document.querySelectorAll('nav button').forEach(x=>{if(x.dataset.view===id)x.setAttribute('aria-current','page');else x.removeAttribute('aria-current');});$('#heading').textContent=document.querySelector(`[data-view="${id}"]`).textContent;}
function renderDashboard(){
  const inv=inventory(state,currentCompany,currentSite);
  const cards=[['شرکت‌های هلدینگ',fmt.format(config.companies.length)],['موارد دامنه انتخابی',inv.status==='confirmed'?fmt.format(inv.selected.length):'—'],['امتیاز ارزیابی','ثبت نشده']];
  $('#cards').replaceChildren(...cards.map(([label,value])=>{const e=node('div',undefined,'card');e.append(node('span',label),node('strong',value));return e;}));
  $('#companies-summary').replaceChildren(...config.companies.map(c=>{const v=inventory(state,c.proposed_code),tr=node('tr');[c.name,v.status==='confirmed'?fmt.format(v.selected.length):'—',statusText[v.status],'ارزیابی نشده'].forEach(x=>tr.append(node('td',x)));return tr;}));
}
function allowed(){return currentSite?new Set(inventory(state,currentCompany).selected):new Set(config.area_templates.map(x=>x.proposed_code));}
function renderAreas(){
  const valid=allowed(),q=$('#search').value.trim();
  const inv=inventory(state,currentCompany,currentSite);
  $('#inventory-state').textContent=`${statusText[inv.status]} · نسخه ${fmt.format(inv.revision)} · ${drafts[key(currentCompany,currentSite)]?'پیش‌نویس ذخیره‌شده بارگذاری شده':'انتخاب‌ها تا تأیید، پیش‌نویس‌اند'}`;
  const groups=[];
  for(const group of ['ستادی','عملیاتی']){
    const wrap=node('div');wrap.append(node('h3',group));
    const groupButton=node('button',`انتخاب همه ${group}`);groupButton.type='button';groupButton.addEventListener('click',()=>{selected=[...new Set([...selected,...config.area_templates.filter(x=>x.user_group===group&&valid.has(x.proposed_code)).map(x=>x.proposed_code)])];renderAreas();});wrap.append(groupButton);
    const grid=node('div',undefined,'area-grid');
    config.area_templates.filter(x=>x.user_group===group&&x.user_label.includes(q)).forEach(a=>{
      const label=node('label',undefined,'area-item'),input=node('input');input.type='checkbox';input.value=a.proposed_code;input.checked=selected.includes(a.proposed_code);input.disabled=!valid.has(a.proposed_code);
      input.addEventListener('change',()=>{selected=input.checked?[...selected,a.proposed_code]:selected.filter(x=>x!==a.proposed_code);renderAreas();});
      label.append(input,node('span',a.user_label));if(input.disabled)label.title='ابتدا این عنوان را در فهرست شرکت تأیید کنید.';grid.append(label);
    });wrap.append(grid);groups.push(wrap);
  }
  $('#area-list').replaceChildren(...groups);$('#selection-count').textContent=`${fmt.format(selected.length)} از ۲۸ عنوان انتخاب شده`;
}
function renderChecklists(){
  const inv=inventory(state,currentCompany,currentSite);
  $('#area-choice').replaceChildren();
  const available=config.area_templates.filter(x=>inv.status==='confirmed'&&inv.selected.includes(x.proposed_code));
  for(const a of available){const opt=node('option',a.user_label);opt.value=a.proposed_code;$('#area-choice').append(opt);}
  if(!available.length){const opt=node('option','ابتدا موارد موجود را تأیید کنید');opt.value='';$('#area-choice').append(opt);}
  $('#area-choice').disabled=!available.length;renderQuestions();
}
function renderQuestions(){
  answers={};const list=checklists.find(x=>x.area_code===$('#area-choice').value);
  if(!list){$('#question-list').replaceChildren();$('#score-preview').textContent='چک‌لیستی در دامنه تأییدشده انتخاب نشده است.';return;}
  $('#question-list').replaceChildren(...list.questions.map(q=>{
    const div=node('div',undefined,'question');div.append(node('h3',`S${q.s} · ${q.focus}`),node('p',q.text),node('small','وضعیت: پیش‌نویس؛ معیار پذیرش اختصاصی هنوز منتشر نشده'));
    const label=node('label','نمره آزمایشی');const select=node('select');const none=node('option','بدون پاسخ');none.value='';select.append(none);
    for(let i=0;i<=4;i++){const opt=node('option',fmt.format(i));opt.value=i;select.append(opt);}
    select.addEventListener('change',()=>{answers[q.id]=select.value===''?null:Number(select.value);renderScore(list);});label.append(select);div.append(label);return div;
  }));renderScore(list);
}
function renderScore(list){
  const result=score(list.questions.map(x=>({value:answers[x.id]??null,weight:1})));
  $('#score-preview').textContent=result.status==='complete'?`امتیاز آزمایشی: ${fmt.format(result.value)}٪ — ذخیره یا ثبت ممیزی نمی‌شود.`:`${fmt.format(result.answered)} از ${fmt.format(result.total)} پاسخ · امتیاز نهایی هنوز موجود نیست.`;
}
function renderHistory(){
  $('#history').replaceChildren(...state.history.slice(-15).reverse().map(h=>node('p',`${String(h.company)} / ${String(h.site||'شرکت')} — ${String(h.reason||'تأیید فهرست')} — ${String(h.at)}`)));
  if(!state.history.length)$('#history').append(node('p','هنوز تغییری در این مرورگر ثبت نشده است.'));
}
function loadScope(){
  const inv=inventory(state,currentCompany,currentSite);selected=[...(drafts[key(currentCompany,currentSite)]||inv.selected)];baseRevision=inv.revision;$('#reason').value='';$('#search').value='';renderAreas();renderDashboard();renderChecklists();renderHistory();
}
function companyChanged(){
  currentCompany=$('#company').value;currentSite='';const c=scope(config,currentCompany);$('#site').replaceChildren();const all=node('option','فهرست شرکت');all.value='';$('#site').append(all);
  for(const s of c.sites_or_children){const opt=node('option',s.name+(s.type!=='site'?' — نوع نامشخص':''));opt.value=s.proposed_code;opt.disabled=s.type!=='site';$('#site').append(opt);}loadScope();
}
async function boot(){
  [config,checklists]=await Promise.all(['data/configuration.json','data/checklists.json'].map(async p=>{const r=await fetch(p);if(!r.ok)throw new Error('خواندن داده‌های اولیه ناموفق بود.');return r.json();}));
  state=initialState(config);
  try{const stored=readStored();if(stored){state=stored.state;drafts=stored.drafts;}}catch{notify('تنظیمات مرورگر قابل خواندن نیست؛ مقدار اولیه نمایش داده شد. فایل پشتیبان را نگه دارید و پیش از ذخیره بررسی کنید.',true);}
  config.companies.forEach(c=>{const opt=node('option',c.name);opt.value=c.proposed_code;$('#company').append(opt);});
  $('#company').addEventListener('change',companyChanged);$('#site').addEventListener('change',()=>{currentSite=$('#site').value;loadScope();});
  document.querySelectorAll('nav button').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));
  $('#search').addEventListener('input',renderAreas);$('#select-all').addEventListener('click',()=>{selected=[...allowed()];renderAreas();});$('#clear').addEventListener('click',()=>{selected=[];renderAreas();});
  $('#save-draft').addEventListener('click',()=>{try{const latest=readStored();const current=latest?.state||state;const ds={...(latest?.drafts||drafts),[key(currentCompany,currentSite)]:selected};persist(current,ds);renderAreas();notify('پیش‌نویس در همین مرورگر ذخیره شد؛ فهرست قطعی تغییر نکرد.');}catch(e){notify(e.message,true);}});
  $('#confirm').addEventListener('click',()=>{try{
    const latest=readStored();const current=latest?.state||state;
    const next=confirmInventory(config,current,{company:currentCompany,site:currentSite,selected,reason:$('#reason').value,expectedRevision:baseRevision});
    const ds={...(latest?.drafts||drafts)};delete ds[key(currentCompany,currentSite)];persist(next,ds);loadScope();notify('فهرست موجود در تنظیمات محلی تأیید شد.');
  }catch(e){notify(e.message,true);}});
  $('#area-choice').addEventListener('change',renderQuestions);
  $('#export').addEventListener('click',()=>download('5s-local-configuration.json',JSON.stringify({state,drafts},null,2),'application/json'));
  $('#csv').addEventListener('click',()=>{
    const inv=inventory(state,currentCompany,currentSite);const c=scope(config,currentCompany,currentSite);const sn=currentSite?c.sites_or_children.find(x=>x.proposed_code===currentSite).name:'سطح شرکت';
    const rows=[['شرکت','دامنه','کد','عنوان','گروه','وضعیت'],...config.area_templates.map(a=>[c.name,sn,a.proposed_code,a.user_label,a.user_group,inv.status!=='confirmed'?'نامشخص':inv.selected.includes(a.proposed_code)?'موجود':'خارج از دامنه'])];
    const csv=rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');download('5s-scope-report.csv','\uFEFF'+csv,'text/csv;charset=utf-8');
  });
  $('#import').addEventListener('change',async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>2000000)throw new Error('فایل بیش از ۲ مگابایت است.');const parsed=validateBundle(JSON.parse(await file.text()));if(!window.confirm('تنظیمات محلی فعلی با این فایل جایگزین شود؟'))return;persist(parsed.state,parsed.drafts);loadScope();notify('پشتیبان معتبر وارد شد.');}catch(e){notify(e.message||'فایل نامعتبر است.',true);}finally{$('#import').value='';}});
  window.addEventListener('storage',e=>{if(e.key===storageKey)notify('تنظیمات در پنجره دیگری تغییر کرد؛ برای دریافت آخرین نسخه صفحه را بارگذاری مجدد کنید.',true);});
  companyChanged();
}
boot().catch(e=>notify(e.message||'بارگذاری سامانه ناموفق بود.',true));

