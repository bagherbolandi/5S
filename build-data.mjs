import {readFile,writeFile} from 'node:fs/promises';
const config=JSON.parse(await readFile(new URL('./data/configuration.json',import.meta.url),'utf8'));
const result=config.area_templates.map(a=>{
 if(a.proposed_s1_to_s5_focus.length!==5)throw new Error(`Expected five dimensions: ${a.proposed_code}`);
 return {code:`DRAFT-${a.proposed_code}-v1`,area_code:a.proposed_code,title:a.user_label,status:'draft',origin:'design_focus_not_excel_extraction',version:1,questions:a.proposed_s1_to_s5_focus.map((focus,i)=>({id:`${a.proposed_code}-S${i+1}-01`,s:i+1,focus,text:`آیا وضعیت «${focus}» در ${a.user_label} مطابق معیار مصوب این محل است؟`,weight:1,acceptance_criteria:null,score_rubric:null,evidence_policy:null,na_allowed:false,criticality:null,publication_blocker:'Complete and approve question-specific rubric, criteria, evidence and applicability.'}))};
});
await writeFile(new URL('./data/checklists.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(`${result.length} draft checklists / ${result.reduce((n,x)=>n+x.questions.length,0)} draft items`);

