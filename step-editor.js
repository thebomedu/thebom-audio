/* THE BOM LEARNING LAB — individual step detail editor. Insert as a script AFTER the original app script. */
function planChanged(){
 const el=document.getElementById('planPanel');if(!el)return;
 const a=(cache.assignments||[]).find(x=>x.id===document.getElementById('planAs')?.value);
 if(!a){el.innerHTML='<p>교재 배정을 먼저 해 주세요.</p>';return}
 el.innerHTML=steps(a).map((s,i)=>`<div class="item row between"><div><b>${i+1}. ${E(s.name)}</b><p class="muted" style="white-space:pre-line">${E(s.desc||'')}</p><p class="muted">${E(s.page||'')}</p></div><div class="row">${button('내용 수정',`editStepDetails('${a.id}',${i})`,'secondary')}${button('↑',`moveStep('${a.id}',${i},-1)`,'secondary')}${button('↓',`moveStep('${a.id}',${i},1)`,'secondary')}${button('삭제',`removeStep('${a.id}',${i})`,'danger')}</div></div>`).join('')+`<div class="row">${field('새 단계 이름','stepName')}${field('학습 안내','stepDesc')}</div>${button('+ 단계 추가',`addStep('${a.id}')`)} ${button('교재 기본으로 복원',`resetSteps('${a.id}')`,'secondary')}`;
}
async function editStepDetails(id,i){
 const a=(cache.assignments||[]).find(x=>x.id===id),old=a&&steps(a)[i];if(!old)return;
 let name=prompt('단계 제목',old.name);if(name===null)return;name=name.trim();if(!name)return msg('제목을 입력해 주세요.');
 let desc=prompt('세부 학습 안내 (줄바꿈 가능)',old.desc||'');if(desc===null)return;
 let page=prompt('페이지 / 학습 범위',old.page||'');if(page===null)return;
 try{const list=structuredClone(steps(a));list[i]={...list[i],name,desc,page};const {error}=await sb.from('assignments').update({custom_steps:list}).eq('id',id);if(error)throw error;await loadData();render();msg('수정 완료! 기존 완료 체크는 유지됩니다.')}catch(e){fail(e)}
}
