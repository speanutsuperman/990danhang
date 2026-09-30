const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const app = express();

const DATABASE_URL = process.env.DATABASE_URL;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN;

app.use(cors({
  origin: ALLOW_ORIGIN,
  credentials: true
}));
app.use(express.json());

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 自动建应用表
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS apps (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      desc TEXT,
      status TEXT DEFAULT 'pending',
      create_time TIMESTAMP DEFAULT now()
    )
  `);
})();

// 用户提交应用
app.post('/api/submit', async (req, res) => {
  try {
    const { title, url, desc } = req.body;
    const ret = await pool.query(`INSERT INTO apps(title,url,desc) VALUES($1,$2,$3) RETURNING *`,[title,url,desc]);
    res.json({ok:true, data:ret.rows[0]});
  }catch(e){
    res.json({ok:false, msg:e.message});
  }
});

// 首页读取已审核通过应用
app.get('/api/list', async (req, res) => {
  const ret = await pool.query(`SELECT * FROM apps WHERE status='pass' ORDER BY id DESC`);
  res.json({ok:true, list:ret.rows});
});

// 管理员审核接口
app.post('/api/audit', async (req, res) => {
  const {token, id, status} = req.body;
  if(token !== ADMIN_TOKEN) return res.status(403).json({ok:false,msg:"权限不足"});
  await pool.query(`UPDATE apps SET status=$1 WHERE id=$2`,[status,id]);
  res.json({ok:true});
});

// 管理员获取全部列表
app.get('/api/admin/list', async (req, res) => {
  const token = req.headers['x-admin-token'];
  if(token !== ADMIN_TOKEN) return res.status(403).json({ok:false,msg:"权限不足"});
  const ret = await pool.query(`SELECT * FROM apps ORDER BY id DESC`);
  res.json({ok:true, list:ret.rows});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>{
  console.log(`服务启动端口${PORT}`);
})
