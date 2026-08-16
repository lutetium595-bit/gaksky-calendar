const express=require('express');
const path=require('path');
const jwt=require('jsonwebtoken');
const {Pool}=require('pg');
require('dotenv').config();

const app=express();
const PORT=process.env.PORT||3000;
const {ADMIN_PASSWORD,JWT_SECRET,DATABASE_URL}=process.env;
if(!ADMIN_PASSWORD||!JWT_SECRET||!DATABASE_URL){
  console.error('ADMIN_PASSWORD, JWT_SECRET, DATABASE_URL 환경 변수를 설정하세요.');
  process.exit(1);
}
const pool=new Pool({connectionString:DATABASE_URL,ssl:process.env.NODE_ENV==='production'?{rejectUnauthorized:false}:false});

async function initDb(){
  await pool.query(`CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    end_date TEXT,
    time TEXT NOT NULL DEFAULT '',
    cat TEXT NOT NULL DEFAULT '기타',
    title TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  // 기존 데이터베이스도 자동으로 업그레이드: 기존 일정은 하루 일정으로 유지
  await pool.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS end_date TEXT');
  await pool.query("UPDATE events SET end_date=date WHERE end_date IS NULL OR end_date='' ");
  console.log('PostgreSQL events 테이블 준비 완료');
}

app.use(express.json({limit:'100kb'}));
function auth(req,res,next){try{const h=req.headers.authorization||'';const t=h.startsWith('Bearer ')?h.slice(7):'';req.user=jwt.verify(t,JWT_SECRET);next()}catch{return res.status(401).json({error:'관리자 로그인이 필요합니다.'})}}
const dateRe=/^\d{4}-\d{2}-\d{2}$/;
function valid(b){
  const start=b?.date;
  const end=b?.end_date||start;
  return !!(b&&typeof start==='string'&&dateRe.test(start)&&typeof end==='string'&&dateRe.test(end)&&end>=start&&typeof b.title==='string'&&b.title.trim());
}
function clean(b){const date=b.date;const end_date=b.end_date||date;return {date,end_date,time:String(b.time||'').slice(0,20),cat:String(b.cat||'기타').slice(0,30),title:b.title.trim().slice(0,60),detail:String(b.detail||'').slice(0,300)}}
const cols='id,date,end_date,time,cat,title,detail';

app.get('/api/events',async(req,res)=>{try{const r=await pool.query(`SELECT ${cols} FROM events ORDER BY date ASC,time ASC,created_at ASC`);res.json(r.rows)}catch(e){console.error(e);res.status(500).json({error:'일정을 불러오지 못했습니다.'})}});
app.post('/api/login',(req,res)=>{if(String(req.body?.password||'')!==ADMIN_PASSWORD)return res.status(401).json({error:'비밀번호가 올바르지 않습니다.'});res.json({token:jwt.sign({role:'admin'},JWT_SECRET,{expiresIn:'12h'})})});
app.get('/api/me',auth,(req,res)=>res.json({ok:true}));
app.post('/api/events',auth,async(req,res)=>{if(!valid(req.body))return res.status(400).json({error:'시작일, 종료일, 제목을 확인하세요. 종료일은 시작일보다 빠를 수 없습니다.'});try{const v=clean(req.body),id=Date.now().toString(36)+Math.random().toString(36).slice(2,8);const r=await pool.query(`INSERT INTO events(id,date,end_date,time,cat,title,detail) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING ${cols}`,[id,v.date,v.end_date,v.time,v.cat,v.title,v.detail]);res.status(201).json(r.rows[0])}catch(e){console.error(e);res.status(500).json({error:'일정 저장에 실패했습니다.'})}});
app.put('/api/events/:id',auth,async(req,res)=>{if(!valid(req.body))return res.status(400).json({error:'시작일, 종료일, 제목을 확인하세요. 종료일은 시작일보다 빠를 수 없습니다.'});try{const v=clean(req.body);const r=await pool.query(`UPDATE events SET date=$1,end_date=$2,time=$3,cat=$4,title=$5,detail=$6 WHERE id=$7 RETURNING ${cols}`,[v.date,v.end_date,v.time,v.cat,v.title,v.detail,req.params.id]);if(!r.rowCount)return res.status(404).json({error:'일정을 찾을 수 없습니다.'});res.json(r.rows[0])}catch(e){console.error(e);res.status(500).json({error:'일정 수정에 실패했습니다.'})}});
app.delete('/api/events/:id',auth,async(req,res)=>{try{const r=await pool.query('DELETE FROM events WHERE id=$1',[req.params.id]);if(!r.rowCount)return res.status(404).json({error:'일정을 찾을 수 없습니다.'});res.json({ok:true})}catch(e){console.error(e);res.status(500).json({error:'일정 삭제에 실패했습니다.'})}});

app.use(express.static(__dirname));
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'index.html')));
initDb().then(()=>app.listen(PORT,()=>console.log(`Server running on ${PORT}`))).catch(e=>{console.error('DB 연결 실패:',e);process.exit(1)});
