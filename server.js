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
const pool=new Pool({connectionString:DATABASE_URL,ssl: process.env.NODE_ENV==='production'?{rejectUnauthorized:false}:false});

async function initDb(){
  await pool.query(`CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    time TEXT NOT NULL DEFAULT '',
    cat TEXT NOT NULL DEFAULT '기타',
    title TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  console.log('PostgreSQL events 테이블 준비 완료');
}

app.use(express.json({limit:'100kb'}));
function auth(req,res,next){try{const h=req.headers.authorization||'';const t=h.startsWith('Bearer ')?h.slice(7):'';req.user=jwt.verify(t,JWT_SECRET);next()}catch{return res.status(401).json({error:'관리자 로그인이 필요합니다.'})}}
function valid(b){return b&&typeof b.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(b.date)&&typeof b.title==='string'&&b.title.trim()}
function clean(b){return {date:b.date,time:String(b.time||'').slice(0,20),cat:String(b.cat||'기타').slice(0,30),title:b.title.trim().slice(0,60),detail:String(b.detail||'').slice(0,300)}}

app.get('/api/events',async(req,res)=>{try{const r=await pool.query('SELECT id,date,time,cat,title,detail FROM events ORDER BY date ASC,time ASC,created_at ASC');res.json(r.rows)}catch(e){console.error(e);res.status(500).json({error:'일정을 불러오지 못했습니다.'})}});
app.post('/api/login',(req,res)=>{if(String(req.body?.password||'')!==ADMIN_PASSWORD)return res.status(401).json({error:'비밀번호가 올바르지 않습니다.'});res.json({token:jwt.sign({role:'admin'},JWT_SECRET,{expiresIn:'12h'})})});
app.get('/api/me',auth,(req,res)=>res.json({ok:true}));
app.post('/api/events',auth,async(req,res)=>{if(!valid(req.body))return res.status(400).json({error:'날짜와 제목을 입력하세요.'});try{const v=clean(req.body),id=Date.now().toString(36)+Math.random().toString(36).slice(2,8);const r=await pool.query('INSERT INTO events(id,date,time,cat,title,detail) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,date,time,cat,title,detail',[id,v.date,v.time,v.cat,v.title,v.detail]);res.status(201).json(r.rows[0])}catch(e){console.error(e);res.status(500).json({error:'일정 저장에 실패했습니다.'})}});
app.put('/api/events/:id',auth,async(req,res)=>{if(!valid(req.body))return res.status(400).json({error:'날짜와 제목을 입력하세요.'});try{const v=clean(req.body);const r=await pool.query('UPDATE events SET date=$1,time=$2,cat=$3,title=$4,detail=$5 WHERE id=$6 RETURNING id,date,time,cat,title,detail',[v.date,v.time,v.cat,v.title,v.detail,req.params.id]);if(!r.rowCount)return res.status(404).json({error:'일정을 찾을 수 없습니다.'});res.json(r.rows[0])}catch(e){console.error(e);res.status(500).json({error:'일정 수정에 실패했습니다.'})}});
app.delete('/api/events/:id',auth,async(req,res)=>{try{const r=await pool.query('DELETE FROM events WHERE id=$1',[req.params.id]);if(!r.rowCount)return res.status(404).json({error:'일정을 찾을 수 없습니다.'});res.json({ok:true})}catch(e){console.error(e);res.status(500).json({error:'일정 삭제에 실패했습니다.'})}});

app.use(express.static(__dirname));
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'index.html')));
initDb().then(()=>app.listen(PORT,()=>console.log(`Server running on ${PORT}`))).catch(e=>{console.error('DB 연결 실패:',e);process.exit(1)});
