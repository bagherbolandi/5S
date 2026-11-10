export const SCHEMA_VERSION=1;
export function key(company,site='') {return `${company}/${site}`;}
export function initialState(config) {
  return {schemaVersion:SCHEMA_VERSION,inventories:Object.fromEntries(config.company_area_selections.map(x=>[key(x.company_code),{selected:[...x.selected_area_codes],status:x.status==='confirmed_by_user'?'confirmed':'unconfigured',revision:1}])),history:[]};
}
export function scope(config,company,site='') {
  const c=config.companies.find(x=>x.proposed_code===company);
  if(!c)throw new Error('شرکت معتبر نیست.');
  if(site&&!c.sites_or_children.some(x=>x.proposed_code===site&&x.type==='site'))throw new Error('سایت معتبر نیست یا نوع آن هنوز تأیید نشده است.');
  return c;
}
export function inventory(state,company,site='') {return state.inventories[key(company,site)]||{selected:[],status:'unconfigured',revision:0};}
export function validateSelection(config,state,company,site,selected) {
  scope(config,company,site);
  if(!Array.isArray(selected)||new Set(selected).size!==selected.length)throw new Error('انتخاب‌ها باید یکتا باشند.');
  const known=new Set(config.area_templates.map(x=>x.proposed_code));
  if(selected.some(x=>!known.has(x)))throw new Error('عنوان ناشناخته در انتخاب‌ها وجود دارد.');
  if(site) {
    const parent=inventory(state,company);
    if(parent.status!=='confirmed')throw new Error('ابتدا فهرست شرکت را تأیید کنید.');
    if(selected.some(x=>!parent.selected.includes(x)))throw new Error('سایت فقط می‌تواند از موارد تأییدشده شرکت انتخاب کند.');
  }
}
export function confirmInventory(config,state,{company,site='',selected,reason='',expectedRevision}) {
  validateSelection(config,state,company,site,selected);
  const old=inventory(state,company,site);
  if(expectedRevision!==old.revision)throw new Error('این فهرست تغییر کرده است؛ دوباره بارگذاری کنید.');
  if(!selected.length&&!reason.trim())throw new Error('برای تأیید فهرست خالی، دلیل بنویسید.');
  if(old.status==='confirmed'&&old.selected.some(x=>!selected.includes(x))&&!reason.trim())throw new Error('برای حذف مورد از فهرست تأییدشده، دلیل بنویسید.');
  if(!site) {
    for(const [k,v] of Object.entries(state.inventories)) {
      if(k.startsWith(company+'/')&&k!==key(company)&&v.status==='confirmed'&&v.selected.some(x=>!selected.includes(x)))throw new Error('این مورد در سایت فعال است؛ ابتدا فهرست سایت را اصلاح کنید.');
    }
  }
  const next=structuredClone(state);
  next.inventories[key(company,site)]={selected:[...selected],status:'confirmed',revision:old.revision+1};
  next.history.push({company,site,before:old,after:next.inventories[key(company,site)],reason:reason.trim(),at:new Date().toISOString(),source:'local_prototype'});
  return next;
}
export function validateState(config,value) {
  if(!value||value.schemaVersion!==SCHEMA_VERSION||!value.inventories||typeof value.inventories!=='object'||Array.isArray(value.inventories)||!Array.isArray(value.history))throw new Error('قالب فایل تنظیمات معتبر نیست.');
  for(const h of value.history) {
    if(!h||typeof h!=='object'||typeof h.company!=='string'||typeof h.site!=='string'||typeof h.reason!=='string'||typeof h.at!=='string')throw new Error('ساختار سابقه تغییرات معتبر نیست.');
    scope(config,h.company,h.site);
  }
  for(const [k,v] of Object.entries(value.inventories)) {
    const parts=k.split('/');
    if(parts.length!==2||!v||!['confirmed','unconfigured'].includes(v.status)||!Number.isInteger(v.revision)||v.revision<0)throw new Error('ساختار دامنه یا نسخه نامعتبر است.');
    validateSelection(config,value,parts[0],parts[1],v.selected);
    if(v.status==='unconfigured'&&v.selected.length)throw new Error('دامنه پیکربندی‌نشده نمی‌تواند انتخاب قطعی داشته باشد.');
  }
  return structuredClone(value);
}
export function score(items) {
  if(!items.length)return {status:'unavailable',value:null,answered:0,total:0};
  let n=0,d=0,answered=0;
  for(const i of items) {
    if(!Number.isFinite(i.weight)||i.weight<=0)throw new Error('وزن نامعتبر است.');
    if(i.na) {if(i.naApproved&&i.naAllowed&&i.reason?.trim())answered++;continue;}
    if(i.value===null||i.value===undefined)continue;
    if(!Number.isInteger(i.value)||i.value<0||i.value>4)throw new Error('امتیاز باید عدد صحیح صفر تا چهار باشد.');
    answered++;n+=i.weight*i.value;d+=i.weight*4;
  }
  return {status:answered<items.length?'incomplete':d===0?'unavailable':'complete',value:answered<items.length||d===0?null:100*n/d,answered,total:items.length};
}

