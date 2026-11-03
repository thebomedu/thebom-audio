/* THE BOM - book-specific steps and library delete (2026-11-04) */
(function(){
  function notifyError(err){ if(typeof fail==='function') fail(err); else alert(err.message||String(err)); }
  function makeModal(title,inner){
    document.getElementById('bomBookStepsModal')?.remove();
    const wrap=document.createElement('div');wrap.id='bomBookStepsModal';
    wrap.style.cssText='position:fixed;inset:0;z-index:1100;background:#14281cc9;display:flex;align-items:center;justify-content:center;padding:12px';
    wrap.innerHTML='<div class="card" style="width:min(700px,100%);max-height:92vh;overflow:auto"><h2>'+E(title)+'</h2>'+inner+'</div>';
    document.body.appendChild(wrap);
  }
  function stepsFromModal(){
    const rows=[...document.querySelectorAll('#bomStepRows .bom-step-row')];
    return rows.map(r=>({...r._bomOriginalStep,name:r.querySelector('.bom-name').value.trim(),desc:r.querySelector('.bom-desc').value.trim(),page:r.querySelector('.bom-page').value.trim()}));
  }
  window.bomStepRow=function(s={name:'',desc:'',page:''}){
    const div=document.createElement('div');div.className='bom-step-row item';
    div._bomOriginalStep={...s};
    div.innerHTML='<div class="row between"><b>학습 단계</b><button type="button" class="btn danger" onclick="this.closest(\'.bom-step-row\').remove()">삭제</button></div><div class="field"><label>단계 제목</label><input class="bom-name" placeholder="예: 동시통역 훈련"></div><div class="field"><label>세부 학습 안내</label><textarea class="bom-desc" rows="3" style="width:100%;padding:10px;border:1px solid #ccc;border-radius:8px" placeholder="한 줄씩 학습 방법을 입력하세요"></textarea></div><div class="field"><label>페이지 / 학습 범위</label><input class="bom-page" placeholder="예: p.4~6"></div>';
    div.querySelector('.bom-name').value=s.name||'';
    div.querySelector('.bom-desc').value=s.desc||'';
    div.querySelector('.bom-page').value=s.page||'';
    document.getElementById('bomStepRows').appendChild(div);
  };
  window.bomOpenBookSteps=function(id){
    const b=getBook(id);if(!b)return alert('교재를 찾지 못했습니다.');
    makeModal(b.title+' · 기본 학습 단계 편집',
      '<p class="muted">이 교재를 배정받은 학생들에게 공통 적용되는 기본 단계입니다. 학생별로 개별 수정한 단계는 유지됩니다. 기존 진도가 있다면 단계 수나 순서 변경에 주의하세요.</p><div id="bomStepRows"></div><div class="row"><button class="btn secondary" onclick="bomStepRow()">+ 단계 추가</button><button class="btn" onclick="bomSaveBookSteps(\''+id+'\')">변경 사항 저장</button><button class="btn secondary" onclick="document.getElementById(\'bomBookStepsModal\').remove()">취소</button></div>');
    (b.steps||[]).forEach(x=>bomStepRow(x));
    if(!(b.steps||[]).length)bomStepRow();
  };
  window.bomSaveBookSteps=async function(id){
    const list=stepsFromModal();
    if(!list.length||list.some(x=>!x.name))return alert('최소 한 단계가 필요하며, 모든 단계의 제목을 입력해야 합니다.');
    const b=getBook(id),old=b.steps||[];
    const changedStructure=list.length!==old.length||list.some((x,i)=>x.name!==old[i]?.name);
    const assigned=(cache.assignments||[]).filter(a=>a.book_id===id);
    if(changedStructure&&assigned.length&&!confirm('이 교재를 배정받은 학생이 '+assigned.length+'명(건) 있습니다. 단계 순서나 개수를 바꾸면 기존 체크 기록의 의미가 달라질 수 있습니다. 계속하시겠습니까?'))return;
    try{const {error}=await sb.from('books').update({steps:list}).eq('id',id);if(error)throw error;document.getElementById('bomBookStepsModal')?.remove();await loadData();render();alert('교재별 기본 학습 단계가 저장됐습니다.');}catch(e){notifyError(e)}
  };
  window.booksView=function(){
    return '<div class="card"><h2>새 교재 등록</h2><p class="muted">새 교재는 기존 8단계 없이 등록됩니다. 등록 후 해당 교재의 「기본 단계 편집」에서 학습 과정을 설정하세요.</p><div class="row">'+field('교재명','bookTitle','text','','placeholder="예: Grammar Level 1"')+'<div class="field"><label>카테고리</label><select id="bookCategory">'+categoryOptions()+'</select></div>'+field('Unit 개수','bookUnits','number',12,'min="1" max="200"')+'</div>'+button('+ 교재 등록','addBook()')+'</div><div class="card"><h2>교재 라이브러리</h2>'+(cache.books||[]).map(b=>'<div class="item row between"><div><b>'+E(b.title)+'</b><p class="muted">'+E(categoryName(b.category_id)||b.category)+' · '+b.units+' Units · '+(b.steps||[]).length+'단계</p></div><div class="row">'+button('교재 정보 수정',"editBookInfo('"+b.id+"')",'secondary')+button('기본 단계 편집',"bomOpenBookSteps('"+b.id+"')",'secondary')+button('교재 삭제',"bomDeleteBook('"+b.id+"')",'danger')+'</div></div>').join('')+'</div>';
  };
  window.addBook=async function(){
    const title=document.getElementById('bookTitle').value.trim(),units=Number(document.getElementById('bookUnits').value),categoryId=document.getElementById('bookCategory').value,category=categoryName(categoryId);
    if(!title||!Number.isInteger(units)||units<1||units>200)return alert('교재명과 Unit 개수를 확인해 주세요.');
    try{const {error}=await sb.from('books').insert({title,category,category_id:categoryId||null,units,steps:[]});if(error)throw error;await loadData();render();alert('교재를 등록했습니다. 이제 「기본 단계 편집」에서 학습 단계를 설정해 주세요.');}catch(e){notifyError(e)}
  };
  window.editBook=function(id){bomOpenBookSteps(id)};
  window.bomDeleteBook=async function(id){
    const b=getBook(id);if(!b)return;
    const assigned=(cache.assignments||[]).filter(a=>a.book_id===id).length;
    const materials=(cache.materials||[]).filter(m=>m.book_id===id).length;
    if(!confirm('「'+b.title+'」 교재를 삭제할까요?\n\n배정 '+assigned+'건과 Unit 자료 '+materials+'건, 관련 학습 진도 및 승인 기록도 함께 영구 삭제됩니다. 이 작업은 되돌릴 수 없습니다.'))return;
    const typed=prompt('실수로 삭제하지 않도록 교재 이름을 정확히 입력해 주세요.\n'+b.title);
    if(typed!==b.title)return alert('교재 이름이 일치하지 않아 삭제를 취소했습니다.');
    try{const {error}=await sb.from('books').delete().eq('id',id);if(error)throw error;await loadData();render();alert('교재가 삭제됐습니다.');}catch(e){notifyError(e)}
  };
})();
