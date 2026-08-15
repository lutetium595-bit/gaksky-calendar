const express=require('express');const fs=require('fs');const path=require('path');const jwt=require('jsonwebtoken');require('dotenv').config();
const app=express();const PORT=process.env.PORT||3000;const ADMIN_PASSWORD=process.env.ADMIN_PASSWORD;const JWT_SECRET=process.env.JWT_SECRET;
if(!ADMIN_PASSWORD||!JWT_SECRET){console.error('ADMIN_PASSWORD와 JWT_SECRET를 .env에 설정하세요.');process.exit(1)}
const DATA_DIR=path.join(__dirname,'data'), DATA_FILE=path.join(DATA_DIR,'events.json');fs.mkdirSync(DATA_DIR,{recursive:true});if(!fs.existsSync(DATA_FILE))fs.writeFileSync(DATA_FILE,'[]');
app.use(express.json({limit:'100kb'}));
function read(){try{return JSON.parse(fs.readFileSync(DATA_FILE,'utf8'))}catch{return []}}function write(x){fs.writeFileSync(DATA_FILE,JSON.stringify(x,null,2))}
function auth(req,res,next){try{const h=req.headers.authorization||'';const t=h.startsWith('Bearer ')?h.slice(7):'';req.user=jwt.verify(t,JWT_SECRET);next()}catch{return res.status(401).json({error:'관리자 로그인이 필요합니다.'})}}
app.get('/api/events',(req,res)=>res.json(read()));
app.post('/api/login',(req,res)=>{if(String(req.body?.password||'')!==ADMIN_PASSWORD)return res.status(401).json({error:'비밀번호가 올바르지 않습니다.'});res.json({token:jwt.sign({role:'admin'},JWT_SECRET,{expiresIn:'12h'})})});
app.get('/api/me',auth,(req,res)=>res.json({ok:true}));
function valid(b){return b&&/^\d{4}-\d{2}-\d{2}$/.test(b.date)&&typeof b.title==='string'&&b.title.trim()}
app.post('/api/events',auth,(req,res)=>{if(!valid(req.body))return res.status(400).json({error:'날짜와 제목을 입력하세요.'});const a=read();const e={id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),date:req.body.date,time:req.body.time||'',cat:req.body.cat||'기타',title:req.body.title.trim().slice(0,60),detail:String(req.body.detail||'').slice(0,300)};a.push(e);write(a);res.status(201).json(e)});
app.put('/api/events/:id',auth,(req,res)=>{if(!valid(req.body))return res.status(400).json({error:'날짜와 제목을 입력하세요.'});const a=read(),i=a.findIndex(e=>e.id===req.params.id);if(i<0)return res.status(404).json({error:'일정을 찾을 수 없습니다.'});a[i]={...a[i],date:req.body.date,time:req.body.time||'',cat:req.body.cat||'기타',title:req.body.title.trim().slice(0,60),detail:String(req.body.detail||'').slice(0,300)};write(a);res.json(a[i])});
app.delete('/api/events/:id',auth,(req,res)=>{const a=read(),b=a.filter(e=>e.id!==req.params.id);if(a.length===b.length)return res.status(404).json({error:'일정을 찾을 수 없습니다.'});write(b);res.json({ok:true})});
app.use(express.static(__dirname));app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'index.html')));app.listen(PORT,()=>console.log(`http://localhost:${PORT}`));
