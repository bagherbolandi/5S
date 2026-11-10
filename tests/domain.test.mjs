import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialState,inventory,confirmInventory,validateState,score} from '../src/domain.js';
const config=JSON.parse(readFileSync(new URL('../data/configuration.json',import.meta.url)));
test('7 companies, 28 unique templates; Noor Plastic confirmed, others unknown',()=>{
 assert.equal(config.companies.length,7);assert.equal(new Set(config.area_templates.map(x=>x.proposed_code)).size,28);
 const state=initialState(config);assert.equal(inventory(state,'C01').selected.length,28);
 for(const c of config.companies.slice(1))assert.equal(inventory(state,c.proposed_code).status,'unconfigured');
});
test('selection isolates companies and does not mutate historical state',()=>{
 const old=initialState(config),next=confirmInventory(config,old,{company:'C02',selected:['A01'],expectedRevision:1});
 assert.equal(inventory(old,'C02').status,'unconfigured');assert.deepEqual(inventory(next,'C02').selected,['A01']);assert.equal(inventory(next,'C01').selected.length,28);assert.equal(next.history.length,1);
});
test('site selection requires confirmed parent, permitted areas and valid company',()=>{
 const state=initialState(config);
 assert.throws(()=>confirmInventory(config,state,{company:'C02',site:'C02-S01',selected:['A01'],expectedRevision:0}));
 const next=confirmInventory(config,state,{company:'C02',selected:['A01'],expectedRevision:1});
 assert.throws(()=>confirmInventory(config,next,{company:'C02',site:'C02-S01',selected:['O01'],expectedRevision:0}));
 assert.throws(()=>confirmInventory(config,next,{company:'C01',site:'C02-S01',selected:['A01'],expectedRevision:0}));
 const site=confirmInventory(config,next,{company:'C02',site:'C02-S01',selected:['A01'],expectedRevision:0});assert.equal(inventory(site,'C02','C02-S02').status,'unconfigured');
 assert.throws(()=>confirmInventory(config,site,{company:'C02',selected:[],reason:'change',expectedRevision:2}));
});
test('unknown, duplicate, empty and stale selections fail explicitly',()=>{
 const state=initialState(config);
 for(const selected of [['X'],['A01','A01'],[]])assert.throws(()=>confirmInventory(config,state,{company:'C02',selected,expectedRevision:1}));
 assert.throws(()=>confirmInventory(config,state,{company:'C01',selected:['A01'],expectedRevision:1}));
 assert.throws(()=>confirmInventory(config,state,{company:'C02',selected:['A01'],expectedRevision:0}));
 assert.equal(inventory(confirmInventory(config,state,{company:'C02',selected:[],reason:'no areas',expectedRevision:1}),'C02').status,'confirmed');
});
test('pending Barna Dar cannot be silently used as site',()=>{
 assert.throws(()=>confirmInventory(config,initialState(config),{company:'C03',site:'C03-S03',selected:[],reason:'test',expectedRevision:0}));
});
test('invalid imported state is rejected; valid state round trips',()=>{
 const state=initialState(config);assert.deepEqual(validateState(config,JSON.parse(JSON.stringify(state))),state);
 const bad=structuredClone(state);bad.inventories['C88/']={selected:[],status:'confirmed',revision:1};assert.throws(()=>validateState(config,bad));
 const malformed=structuredClone(state);malformed.history=[null];assert.throws(()=>validateState(config,malformed));
});
test('draft checklist content cannot be mistaken for published rubrics',()=>{
 const lists=JSON.parse(readFileSync(new URL('../data/checklists.json',import.meta.url)));
 assert.equal(lists.length,28);assert.equal(lists.reduce((n,x)=>n+x.questions.length,0),140);
 for(const list of lists){assert.equal(list.status,'draft');assert.deepEqual(list.questions.map(x=>x.s),[1,2,3,4,5]);for(const q of list.questions){assert.equal(q.score_rubric,null);assert.ok(q.publication_blocker);}}
});
test('weighted score distinguishes missing, zero and approved NA',()=>{
 assert.ok(Math.abs(score([{weight:2,value:3},{weight:1,value:1}]).value-58.3333333333333)<1e-9);
 assert.equal(score([{weight:2,value:3},{weight:1,value:null}]).value,null);
 assert.equal(score([{weight:1,value:0}]).value,0);
 assert.equal(score([{weight:2,value:3},{weight:1,na:true,naAllowed:true,naApproved:true,reason:'not applicable'}]).value,75);
 assert.equal(score([{weight:1,na:true,naAllowed:true,naApproved:true,reason:'not applicable'}]).status,'unavailable');
 assert.equal(score([{weight:1,na:true,naAllowed:true,naApproved:false,reason:'not applicable'}]).status,'incomplete');
 assert.throws(()=>score([{weight:1,value:5}]));
});

