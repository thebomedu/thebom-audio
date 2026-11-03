/* THE BOM - per-unit learning steps (development branch only) */
(function(){
  const byId=id=>document.getElementById(id);
  let bookId=null,unit=1,draft=[],original=[];
  const clone=v=>JSON.parse(JSON.stringify(v));
  const safe=s=>E(String(s??''));
  const rows=()=>[...document.querySelectorAll('#bomUnitStepRows .bom-unit-step')];
  const defaultSteps=()=>clone(getBook(bookId)?.steps||[]);
  const override=(u)=> (cache.book_unit_steps||[]).find(x=>x.book_id===bookId&&x.unit===Number(u));
  const effective=u=>clone(override(u)?.steps||defaultSteps());
  const progressExists=u=>(cache.assignments||[]).filter(a=>a.book_id===bookId).some(a=>(cache.progress||[]).some(p=>p.assignment_id===a.id&&p.unit===Number(u)));
  function collect(){
    if(!byId('bomUnitStepRows'))return;
    draft=rows().map(el=>({...el._original,name:el.querySelector('.bom-us-name').value.trim(),desc:el.querySelector('.bom-us-desc').value.trim(),page:el.querySelector('.bom-us-page').value.trim(),kind:el.querySelector('.bom-us-kind').value}));
  }
  function draw(){
    const root=byId('bomUnitStepRows');if(!root)return;root.replaceChildren();
    draft.forEach((s,i)=>{
      const el=document.createElement('div');el.className='item bom-unit-step';el._original={...s};
      el.innerHTML='<div class="row between"><b>STEP '+(i+1)+'</b><div class="row"><button type="button" class="btn secondary bom-up">↑</button><button type="button" class="btn secondary bom-down">↓</button><button type="button" class="btn danger bom-remove">삭제</button></div></div><div class="field"><label>단계 이름</label><input class="bom-us-name"></div><div class="field"><label>학습 안내</label><textarea class="bom-us-desc" rows="2" style="width:100%"></textarea></div><div class="field"><label>페이지</label><input class="bom-us-page"></div><div class="field"><label>연결 유형</label><select class="bom-us-kind"><option value="">일반 학습</option><option value="word">단어 음원</option><option value="reading">리딩 음원</option><option value="classcard">클래스카드</option></select></div>';
      root.appendChild(el);
      el.querySelector('.bom-us-name').value=s.name||'';el.querySelector('.bom-us-desc').value=s.desc||'';el.querySelector('.bom-us-page').value=s.page||'';el.querySelector('.bom-us-kind').value=s.kind||'';
      el.querySelector('.bom-up').onclick=()=>{collect();if(i>0){[draft[i-1],draft[i]]=[draft[i],draft[i-1]];draw()}};
      el.querySelector('.bom-down').onclick=()=>{collect();if(i<draft.length-1){[draft[i+1],draft[i]]=[draft[i],draft[i+1]];draw()}};
      el.querySelector('.bom-remove').onclick=()=>{collect();if(draft.length===1)return alert('최소 한 단계가 필요합니다.');draft.splice(i,1);draw()};
    });
    byId('bomUnitStatus').textContent=override(unit)?'✏️ 개별 학습 과정 적용 중':'🌱 교재 기본 학습 과정 적용 중';
  }
  function changeUnit(){unit=Number(byId('bomUnitSelect').value);draft=effective(unit);original=clone(draft);draw()}
  window.bomOpenUnitSteps=function(id){
    if(!getBook(id))return alert('교재를 찾을 수 없습니다.');
    bookId=id;const b=getBook(id);
    byId('bomUnitStepsModal')?.remove();
    const wrap=document.createElement('div');wrap.id='bomUnitStepsModal';
    wrap.style.cssText='position:fixed;inset:0;z-index:1150;background:#14281cc9;display:flex;align-items:center;justify-content:center;padding:12px';
    wrap.innerHTML='<div class="card" style="width:min(760px,100%);max-height:94vh;overflow:auto"><h2>'+safe(b.title)+' · Unit별 학습 과정</h2><p class="muted">기본 과정은 모든 Unit에 적용되며, 원하는 Unit만 개별 편집합니다. 이 기능은 새 데이터베이스 테이블 배포 후 저장할 수 있습니다.</p><div class="row"><div class="field"><label>Unit 선택</label><select id="bomUnitSelect"></select></div><div class="field"><label>복사할 Unit</label><select id="bomUnitCopyFrom"></select></div></div><p id="bomUnitStatus" class="muted"></p><div class="row"><button class="btn secondary" id="bomUnitCopy">다른 Unit에서 복사</button><button class="btn secondary" id="bomUnitRestore">교재 기본으로 복원</button></div><div id="bomUnitStepRows"></div><div class="row"><button class="btn secondary" id="bomUnitAdd">+ 단계 추가</button><button class="btn" id="bomUnitSave">이 Unit 저장</button><button class="btn secondary" id="bomUnitClose">닫기</button></div></div>';
    document.body.appendChild(wrap);
    for(let i=1;i<=b.units;i++)for(const select of [byId('bomUnitSelect'),byId('bomUnitCopyFrom')]){const option=document.createElement('option');option.value=i;option.textContent='Unit '+i;select.appendChild(option)}
    byId('bomUnitSelect').onchange=()=>{collect();if(JSON.stringify(draft)!==JSON.stringify(original)&&!confirm('저장하지 않은 변경 사항을 버릴까요?')){byId('bomUnitSelect').value=unit;return}changeUnit()};
    byId('bomUnitCopy').onclick=()=>{collect();const from=Number(byId('bomUnitCopyFrom').value);if(!confirm('Unit '+from+'의 학습 과정을 복사할까요? 저장 전까지 적용되지 않습니다.'))return;draft=effective(from);draw()};
    byId('bomUnitAdd').onclick=()=>{collect();draft.push({name:'',desc:'',page:'',kind:''});draw()};
    byId('bomUnitClose').onclick=()=>wrap.remove();
    byId('bomUnitRestore').onclick=async()=>{if(progressExists(unit)&&JSON.stringify(effective(unit).map(s=>s.name))!==JSON.stringify(defaultSteps().map(s=>s.name)))return alert('이 Unit에 학생 학습 기록이 있어 단계 구성이 달라지는 기본 과정 복원을 제한합니다.');if(!confirm('이 Unit을 교재 기본 과정으로 복원할까요?'))return;try{const {error}=await sb.from('book_unit_steps').delete().eq('book_id',bookId).eq('unit',unit);if(error)throw error;await loadData();changeUnit();alert('교재 기본 과정으로 복원했습니다.')}catch(e){alert('저장할 수 없습니다. Unit별 학습 과정 테이블이 배포됐는지 확인해 주세요.\n'+e.message)}};
    byId('bomUnitSave').onclick=async()=>{
      collect();if(!draft.length||draft.some(x=>!x.name))return alert('모든 단계 이름을 입력해 주세요.');
      if(progressExists(unit)&&JSON.stringify(draft.map(s=>s.name))!==JSON.stringify(original.map(s=>s.name)))return alert('이미 학생의 학습 기록이 있는 Unit은 단계 수·순서·이름 변경을 제한합니다. 설명과 페이지는 수정할 수 있습니다.');
      try{const {error}=await sb.from('book_unit_steps').upsert({book_id:bookId,unit,steps:draft},{onConflict:'book_id,unit'});if(error)throw error;await loadData();changeUnit();alert('Unit '+unit+' 학습 과정이 저장됐습니다.')}catch(e){alert('저장할 수 없습니다. Unit별 학습 과정 테이블이 배포됐는지 확인해 주세요.\n'+e.message)}
    };
    changeUnit();
  };
})();
