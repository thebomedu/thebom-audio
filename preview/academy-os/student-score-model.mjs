import * as M from './model.mjs';
export function recordStudentScore(d,id,score,date=M.today()){
 const s=d.students.find(s=>s.id===id&&s.active);if(!s?.wordTestEnabled||M.isClassDay(d,s,date)===false)throw Error('not_assigned');const max=s.wordTestMax||100;
 if(!Number.isInteger(score)||score<0||score>max)throw Error('invalid_score');const existing=M.dailyRecord(d,id,date);if(existing?.wordScore!=null)throw Error('score_already_recorded');
 const row=M.saveDailyRecord(d,id,date,{...(existing||{units:M.dailyPlan(d,id,date),homework:null,wordMax:max,note:''}),wordScore:score,wordMax:max});row.wordScoreSource='student';return row;
}
