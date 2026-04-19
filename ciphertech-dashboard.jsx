import { useState, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const C = {
  bg: "#030d0a", green: "#00ff9d", cyan: "#00e5ff",
  red: "#ff4d6d", amber: "#fbbf24", purple: "#a78bfa",
  textDim: "rgba(0,255,157,0.45)", textFaint: "rgba(0,255,157,0.22)",
  gBorder: "rgba(0,255,157,0.16)",
};
const aColors = [C.green, C.cyan, C.red, C.purple, C.amber];
const initials = ["RK","GH","VX","CP","NV"];
const names = ["Rook","Ghost","Vex","Cipher","Nova"];

const GS = `
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@400;600;700;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
.glass{background:rgba(0,255,157,0.04);backdrop-filter:blur(18px);border:1px solid rgba(0,255,157,0.15);border-radius:12px;position:relative;overflow:hidden;}
.glass::after{content:"";position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(0,255,157,0.3),transparent);pointer-events:none;}
.gsm{background:rgba(0,255,157,0.04);border:1px solid rgba(0,255,157,0.11);border-radius:8px;}
.ni{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;cursor:pointer;color:rgba(0,255,157,0.38);font-size:12px;font-family:'Share Tech Mono',monospace;letter-spacing:.5px;transition:all .2s;margin-bottom:2px;border:1px solid transparent;}
.ni:hover{background:rgba(0,255,157,0.06);color:rgba(0,255,157,0.75);}
.ni.active{background:rgba(0,255,157,0.09);color:#00ff9d;border-color:rgba(0,255,157,0.28);text-shadow:0 0 8px rgba(0,255,157,0.5);}
.btn{background:rgba(0,255,157,0.1);border:1px solid rgba(0,255,157,0.35);color:#00ff9d;border-radius:8px;padding:8px 16px;font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:1px;cursor:pointer;transition:all .2s;text-shadow:0 0 6px rgba(0,255,157,0.4);}
.btn:hover{background:rgba(0,255,157,0.18);box-shadow:0 0 14px rgba(0,255,157,0.15);}
.inp{background:rgba(0,255,157,0.04);border:1px solid rgba(0,255,157,0.22);border-radius:8px;color:#00ff9d;font-family:'Share Tech Mono',monospace;font-size:12px;padding:9px 12px;outline:none;width:100%;transition:border-color .2s;}
.inp::placeholder{color:rgba(0,255,157,0.28);}
.inp:focus{border-color:rgba(0,255,157,0.45);box-shadow:0 0 10px rgba(0,255,157,0.08);}
.pb{height:4px;border-radius:99px;background:rgba(0,255,157,0.08);overflow:hidden;}
.pf{height:100%;border-radius:99px;}
.tag{font-size:10px;padding:2px 7px;border-radius:4px;font-family:'Share Tech Mono',monospace;letter-spacing:.5px;display:inline-block;}
.dots{color:rgba(0,255,157,0.28);cursor:pointer;letter-spacing:2px;font-size:14px;}
.grid-bg{background-image:linear-gradient(rgba(0,255,157,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,157,0.025) 1px,transparent 1px);background-size:40px 40px;}
.scr::-webkit-scrollbar{width:3px;}.scr::-webkit-scrollbar-track{background:transparent;}.scr::-webkit-scrollbar-thumb{background:rgba(0,255,157,0.18);border-radius:99px;}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
@keyframes pulse{0%,100%{box-shadow:0 0 8px rgba(0,255,157,0.3);}50%{box-shadow:0 0 20px rgba(0,255,157,0.7);}}
.fu{animation:fadeUp .3s ease forwards;}
`;

function Logo({ s=1 }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:9*s}}>
      <div style={{width:32*s,height:32*s,borderRadius:7*s,background:"linear-gradient(135deg,#00ff9d,#00e5ff)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 16px rgba(0,255,157,0.4)",fontSize:16*s,fontWeight:900,color:"#000",fontFamily:"'Orbitron',monospace"}}>⌬</div>
      <span style={{fontFamily:"'Orbitron',monospace",fontWeight:700,fontSize:17*s,letterSpacing:3*s,color:C.green,textShadow:"0 0 10px rgba(0,255,157,0.5)"}}>CIPHER<span style={{color:C.cyan}}>TECH</span></span>
    </div>
  );
}

function Av({ i, sz=32 }) {
  const c = aColors[i%5];
  return <div style={{width:sz,height:sz,borderRadius:sz*.25,background:`${c}18`,border:`1px solid ${c}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:sz*.32,fontWeight:700,color:c,fontFamily:"'Share Tech Mono',monospace",flexShrink:0}}>{initials[i%5]}</div>;
}

function Bdg({ label, t="ok" }) {
  const m={ok:[C.green,"rgba(0,255,157,0.1)"],warn:[C.amber,"rgba(251,191,36,0.1)"],err:[C.red,"rgba(255,77,109,0.1)"],info:[C.cyan,"rgba(0,229,255,0.1)"]};
  const [c,bg]=m[t]||m.ok;
  return <span className="tag" style={{color:c,background:bg,border:`1px solid ${c}2a`}}>{label}</span>;
}

function Clock() {
  const [t,setT]=useState(new Date());
  useEffect(()=>{const i=setInterval(()=>setT(new Date()),1000);return()=>clearInterval(i);},[]);
  return (
    <div className="gsm" style={{padding:"5px 11px",textAlign:"right"}}>
      <div style={{color:C.green,fontSize:13,fontFamily:"'Share Tech Mono'",letterSpacing:2}}>{t.toLocaleTimeString("en-GB",{hour12:false})}</div>
      <div style={{color:C.textDim,fontSize:9,letterSpacing:1}}>{t.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</div>
    </div>
  );
}

function TopBar({page}) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",gap:20}}>
        <Logo/>
        <div style={{borderLeft:"1px solid rgba(0,255,157,0.12)",paddingLeft:18}}>
          <div style={{color:C.green,fontSize:16,fontFamily:"'Orbitron',monospace",fontWeight:600,letterSpacing:2}}>ACCESS GRANTED, CIPHER 🔐</div>
          <div style={{color:C.textDim,fontSize:10,letterSpacing:1.5,marginTop:2}}>{page.toUpperCase()} // SECURE WORKSPACE</div>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <Clock/>
        <div style={{position:"relative",cursor:"pointer"}}><span style={{fontSize:18,color:C.green,opacity:.6}}>⚠</span><span style={{position:"absolute",top:-2,right:-2,width:7,height:7,background:C.red,borderRadius:"50%",border:"1px solid #030d0a",boxShadow:`0 0 5px ${C.red}`}}/></div>
        <div className="glass" style={{padding:"6px 12px",display:"flex",alignItems:"center",gap:9,borderRadius:10}}>
          <Av i={3} sz={28}/>
          <div><div style={{color:C.green,fontSize:11,fontFamily:"'Share Tech Mono'",letterSpacing:.5}}>CIPHER</div><div style={{color:C.textDim,fontSize:9,letterSpacing:1}}>ADMIN // LVL 5</div></div>
          <span style={{color:C.textFaint,fontSize:10}}>▾</span>
        </div>
      </div>
    </div>
  );
}

function Sidebar({active,go}) {
  const nav=[{ic:"◈",lb:"Dashboard"},{ic:"⬡",lb:"Analytics"},{ic:"⌬",lb:"Projects"},{ic:"⊛",lb:"Team"},{ic:"▤",lb:"Reports"},{ic:"◎",lb:"Messages"},{ic:"⊙",lb:"Settings"},{ic:"⇥",lb:"Logout"}];
  return (
    <div className="glass" style={{width:185,padding:"14px 9px",flexShrink:0,display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex",justifyContent:"center",marginBottom:14}}><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4}}>{[...Array(9)].map((_,i)=><div key={i} style={{width:5,height:5,borderRadius:"50%",background:"rgba(0,255,157,0.2)"}}/>)}</div></div>
      {nav.map(n=>(
        <div key={n.lb} className={`ni${n.lb===active?" active":""}`} onClick={()=>n.lb!=="Logout"&&go(n.lb)}>
          <span style={{width:14,textAlign:"center",fontSize:13}}>{n.ic}</span><span>{n.lb.toUpperCase()}</span>
        </div>
      ))}
      <div style={{marginTop:"auto",paddingTop:14,borderTop:"1px solid rgba(0,255,157,0.07)"}}>
        <div style={{color:C.textFaint,fontSize:9,letterSpacing:1,marginBottom:7,paddingLeft:4}}>SYS STATUS</div>
        {[{l:"VPN",v:"ACTIVE",c:C.green},{l:"FIREWALL",v:"ACTIVE",c:C.green},{l:"THREAT",v:"MEDIUM",c:C.amber}].map(s=>(
          <div key={s.l} style={{display:"flex",justifyContent:"space-between",padding:"2px 4px"}}><span style={{color:C.textFaint,fontSize:9}}>{s.l}</span><span style={{color:s.c,fontSize:9,letterSpacing:1,textShadow:`0 0 5px ${s.c}`}}>{s.v}</span></div>
        ))}
      </div>
    </div>
  );
}

/* ── LOGIN ── */
function Login({onLogin}) {
  const [loading,setLoading]=useState(false);
  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Share Tech Mono',monospace"}} className="grid-bg">
      <style>{GS}</style>
      <div style={{position:"fixed",inset:0,background:"radial-gradient(ellipse 60% 50% at 50% 50%,rgba(0,255,157,0.05) 0%,transparent 70%)",pointerEvents:"none"}}/>
      <div style={{marginBottom:32,textAlign:"center",position:"relative"}}><Logo s={1.2}/><div style={{color:C.textDim,fontSize:10,letterSpacing:3,marginTop:8}}>SECURE OPERATIONS PLATFORM</div></div>
      <div className="glass fu" style={{width:370,padding:"34px 30px",position:"relative"}}>
        <div style={{textAlign:"center",marginBottom:26}}><div style={{color:C.green,fontSize:20,fontFamily:"'Orbitron',monospace",fontWeight:700,letterSpacing:2,textShadow:"0 0 10px rgba(0,255,157,0.5)"}}>AUTHENTICATE</div><div style={{color:C.textDim,fontSize:11,marginTop:5,letterSpacing:1}}>ENTER CREDENTIALS TO PROCEED</div></div>
        <div style={{marginBottom:12}}><div style={{color:C.textDim,fontSize:10,letterSpacing:1,marginBottom:5}}>◉ OPERATOR ID</div><input className="inp" placeholder="cipher@ciphertech.io"/></div>
        <div style={{marginBottom:22}}><div style={{color:C.textDim,fontSize:10,letterSpacing:1,marginBottom:5}}>🔒 ACCESS KEY</div><input className="inp" type="password" placeholder="••••••••••••"/></div>
        <button className="btn" onClick={()=>{setLoading(true);setTimeout(()=>{setLoading(false);onLogin();},1100);}}
          style={{width:"100%",fontSize:14,padding:"12px",letterSpacing:3,animation:loading?"pulse .6s infinite":"none"}}>
          {loading?"AUTHENTICATING...":"▶  SIGN IN"}
        </button>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:14}}><span style={{color:C.textDim,fontSize:10,cursor:"pointer"}}>FORGOT ACCESS KEY?</span><span style={{color:C.cyan,fontSize:10,cursor:"pointer"}}>REQUEST ACCESS ↗</span></div>
      </div>
      <div style={{marginTop:22,color:C.textFaint,fontSize:9,letterSpacing:2,position:"relative"}}>CIPHERTECH SECURE v5.2.1 // ALL SESSIONS MONITORED</div>
    </div>
  );
}

/* ── DASHBOARD ── */
function Dashboard() {
  const perf=[{m:"Jan",r:8.2,o:72},{m:"Feb",r:9.1,o:78},{m:"Mar",r:11.4,o:85},{m:"Apr",r:10.8,o:80},{m:"May",r:13.2,o:91},{m:"Jun",r:14.5,o:92}];
  const tasks=[{n:"Under Analysis",v:45,c:C.green},{n:"Completed",v:30,c:C.cyan},{n:"Backlog",v:25,c:C.amber}];
  const ops=[{n:"Phantom Network",p:78,c:C.green},{n:"Operation Vortex",p:94,c:C.cyan},{n:"Project ORION",p:52,c:C.amber}];
  return (
    <div className="fu" style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{color:C.green,fontSize:18,fontFamily:"'Orbitron',monospace",fontWeight:700,letterSpacing:2}}>DASHBOARD OVERVIEW <span style={{color:C.textDim,fontSize:10,fontFamily:"'Share Tech Mono'",letterSpacing:1}}>// LIVE</span></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
        {[{l:"REVENUE",v:"$14.5K",s:"+12% this month",c:C.green},{l:"OPS SCORE",v:"92%",s:"Performance index",c:C.cyan},{l:"ACTIVE OPS",v:"312",s:"Across all units",c:C.amber}].map(s=>(
          <div key={s.l} className="glass" style={{padding:"14px 16px"}}>
            <div style={{color:C.textDim,fontSize:10,letterSpacing:1.5,marginBottom:5}}>{s.l}</div>
            <div style={{color:s.c,fontSize:26,fontFamily:"'Orbitron',monospace",fontWeight:700,textShadow:`0 0 12px ${s.c}88`}}>{s.v}</div>
            <div style={{color:C.textFaint,fontSize:10,marginTop:4}}>{s.s}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr 1fr",gap:12}}>
        <div className="glass" style={{padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><div style={{color:C.green,fontSize:12,fontFamily:"'Share Tech Mono'",fontWeight:600}}>PERFORMANCE METRICS</div><span className="dots">···</span></div>
          <ResponsiveContainer width="100%" height={175}>
            <AreaChart data={perf}>
              <defs>
                <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.green} stopOpacity={.3}/><stop offset="100%" stopColor={C.green} stopOpacity={0}/></linearGradient>
                <linearGradient id="ac" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.cyan} stopOpacity={.22}/><stop offset="100%" stopColor={C.cyan} stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,157,0.05)"/>
              <XAxis dataKey="m" tick={{fill:C.textDim,fontSize:10,fontFamily:"'Share Tech Mono'"}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{background:"rgba(3,13,10,0.96)",border:`1px solid ${C.gBorder}`,borderRadius:8,color:C.green,fontSize:11,fontFamily:"'Share Tech Mono'"}}/>
              <Area type="monotone" dataKey="r" stroke={C.green} strokeWidth={2} fill="url(#ag)" name="Revenue $K" dot={{fill:C.green,r:3}}/>
              <Area type="monotone" dataKey="o" stroke={C.cyan} strokeWidth={2} fill="url(#ac)" name="Ops Score" dot={{fill:C.cyan,r:3}}/>
            </AreaChart>
          </ResponsiveContainer>
          <div style={{display:"flex",justifyContent:"space-around",marginTop:8,paddingTop:8,borderTop:"1px solid rgba(0,255,157,0.07)"}}>
            {[["$14.5K","REVENUE"],["92%","OPS SCORE"],["312","ACTIVE"]].map(([v,l])=>(
              <div key={l} style={{textAlign:"center"}}><div style={{color:C.green,fontSize:15,fontFamily:"'Orbitron',monospace",fontWeight:700}}>{v}</div><div style={{color:C.textDim,fontSize:9,letterSpacing:.5}}>{l}</div></div>
            ))}
          </div>
        </div>
        <div className="glass" style={{padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}><div style={{color:C.green,fontSize:12,fontFamily:"'Share Tech Mono'",fontWeight:600}}>ACTIVE OPS</div><span className="dots">···</span></div>
          {ops.map(p=>(
            <div key={p.n} style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{color:"rgba(0,255,157,0.72)",fontSize:11}}>{p.n}</span><span style={{color:p.c,fontSize:11,textShadow:`0 0 5px ${p.c}`}}>{p.p}%</span></div>
              <div className="pb"><div className="pf" style={{width:`${p.p}%`,background:p.c,boxShadow:`0 0 6px ${p.c}55`}}/></div>
            </div>
          ))}
        </div>
        <div className="glass" style={{padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><div style={{color:C.green,fontSize:12,fontFamily:"'Share Tech Mono'",fontWeight:600}}>TASK STATUS</div><span className="dots">···</span></div>
          <PieChart width={148} height={148} style={{margin:"0 auto"}}>
            <Pie data={tasks} cx={70} cy={70} innerRadius={38} outerRadius={64} paddingAngle={3} dataKey="v" stroke="none">
              {tasks.map((e,i)=><Cell key={i} fill={e.c} style={{filter:`drop-shadow(0 0 5px ${e.c}88)`}}/>)}
            </Pie>
          </PieChart>
          <div style={{marginTop:10}}>{tasks.map(t=>(
            <div key={t.n} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <span style={{width:8,height:8,borderRadius:"50%",background:t.c,display:"inline-block",boxShadow:`0 0 4px ${t.c}`}}/>
              <span style={{color:"rgba(0,255,157,0.58)",fontSize:10}}>{t.n} ({t.v}%)</span>
            </div>
          ))}</div>
        </div>
      </div>
      <div className="glass" style={{padding:14}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><div style={{color:C.green,fontSize:12,fontFamily:"'Share Tech Mono'",fontWeight:600}}>TEAM ACTIVITY</div><span className="dots">···</span></div>
        <div style={{display:"flex",gap:10}}>
          {names.map((n,i)=>(
            <div key={n} className="gsm" style={{flex:1,padding:"10px 12px",textAlign:"center"}}>
              <Av i={i} sz={32}/>
              <div style={{color:"rgba(0,255,157,0.72)",fontSize:10,marginTop:6}}>{n}</div>
              <div style={{color:C.textDim,fontSize:9,marginTop:2}}>{["Recon","Analysis","Exploit","Lead","Hunt"][i]}</div>
              <div style={{marginTop:6}}><Bdg label={["ACTIVE","ACTIVE","IDLE","ACTIVE","ACTIVE"][i]} t={["ok","ok","warn","ok","ok"][i]}/></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── ANALYTICS ── */
function Analytics() {
  const sess=[{m:"Jan",og:18,so:12,di:8,re:5},{m:"Feb",og:24,so:15,di:10,re:7},{m:"Mar",og:32,so:18,di:14,re:9},{m:"Apr",og:28,so:22,di:12,re:11},{m:"May",og:45,so:30,di:18,re:14},{m:"Jun",og:52,so:35,di:22,re:16}];
  const funnel=[{s:"Impressions",v:84},{s:"Clicks",v:62},{s:"Sign-ups",v:36},{s:"Purchase",v:22}];
  const roas=[{n:"Search",v:45,c:C.green},{n:"Social",v:20,c:C.cyan},{n:"Email",v:10,c:C.purple},{n:"Referral",v:25,c:C.amber}];
  return (
    <div className="fu" style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{color:C.green,fontSize:18,fontFamily:"'Orbitron',monospace",fontWeight:700,letterSpacing:2}}>ANALYTICS INSIGHTS</div>
      <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr 1fr",gap:12}}>
        <div className="glass" style={{padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><div style={{color:C.green,fontSize:12,fontFamily:"'Share Tech Mono'",fontWeight:600}}>TRAFFIC ACQUISITION</div><span className="dots">···</span></div>
          <div style={{color:C.textDim,fontSize:10,marginBottom:8,letterSpacing:.5}}>User Sessions over Time (K)</div>
          <ResponsiveContainer width="100%" height={130}>
            <AreaChart data={sess}>
              <defs>{[["ag",C.green],["ac",C.cyan],["ap",C.purple],["aa",C.amber]].map(([id,c])=><linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c} stopOpacity={.28}/><stop offset="100%" stopColor={c} stopOpacity={0}/></linearGradient>)}</defs>
              <XAxis dataKey="m" tick={{fill:C.textDim,fontSize:9}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{background:"rgba(3,13,10,0.96)",border:`1px solid ${C.gBorder}`,borderRadius:8,color:C.green,fontSize:10,fontFamily:"'Share Tech Mono'"}}/>
              <Area type="monotone" dataKey="og" stroke={C.green} strokeWidth={1.5} fill="url(#ag)"/>
              <Area type="monotone" dataKey="so" stroke={C.cyan} strokeWidth={1.5} fill="url(#ac)"/>
              <Area type="monotone" dataKey="di" stroke={C.purple} strokeWidth={1.5} fill="url(#ap)"/>
              <Area type="monotone" dataKey="re" stroke={C.amber} strokeWidth={1.5} fill="url(#aa)"/>
            </AreaChart>
          </ResponsiveContainer>
          <div style={{marginTop:8,color:C.textDim,fontSize:10,marginBottom:8}}>Traffic by Channel</div>
          <ResponsiveContainer width="100%" height={90}>
            <BarChart data={sess} barSize={8}>
              <XAxis dataKey="m" tick={{fill:C.textDim,fontSize:9}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{background:"rgba(3,13,10,0.96)",border:`1px solid ${C.gBorder}`,borderRadius:8,color:C.green,fontSize:10,fontFamily:"'Share Tech Mono'"}}/>
              <Bar dataKey="og" fill={C.green} radius={[2,2,0,0]}/><Bar dataKey="so" fill={C.cyan} radius={[2,2,0,0]}/><Bar dataKey="di" fill={C.purple} radius={[2,2,0,0]}/><Bar dataKey="re" fill={C.amber} radius={[2,2,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
          <div style={{display:"flex",justifyContent:"space-around",marginTop:10,paddingTop:10,borderTop:"1px solid rgba(0,255,157,0.07)"}}>
            {[["2.1M","TOTAL USERS"],["4m 32s","AVG SESSION"],["6.1","PG/SESS"]].map(([v,l])=>(
              <div key={l} style={{textAlign:"center"}}><div style={{color:C.green,fontSize:14,fontFamily:"'Orbitron',monospace",fontWeight:700}}>{v}</div><div style={{color:C.textDim,fontSize:8,letterSpacing:.5}}>{l}</div></div>
            ))}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div className="glass" style={{padding:16,flex:1}}>
            <div style={{color:C.green,fontSize:12,fontFamily:"'Share Tech Mono'",fontWeight:600,marginBottom:14}}>CONVERSION FUNNEL</div>
            {funnel.map(f=>(
              <div key={f.s} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{color:"rgba(0,255,157,0.7)",fontSize:11}}>{f.s}</span><span style={{color:C.cyan,fontSize:11}}>{f.v}%</span></div>
                <div className="pb"><div className="pf" style={{width:`${f.v}%`,background:`linear-gradient(90deg,${C.green},${C.cyan})`,boxShadow:`0 0 5px ${C.green}44`}}/></div>
              </div>
            ))}
          </div>
          <div className="glass" style={{padding:14}}>
            <div style={{color:C.green,fontSize:12,fontFamily:"'Share Tech Mono'",fontWeight:600,marginBottom:10}}>CHANNEL ROAS</div>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <PieChart width={78} height={78}><Pie data={roas} cx={36} cy={36} innerRadius={20} outerRadius={36} paddingAngle={2} dataKey="v" stroke="none">{roas.map((e,i)=><Cell key={i} fill={e.c}/>)}</Pie></PieChart>
              <div>{roas.map(r=><div key={r.n} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><span style={{width:7,height:7,borderRadius:"50%",background:r.c,display:"inline-block"}}/><span style={{color:"rgba(0,255,157,0.58)",fontSize:10}}>{r.n} {r.v}%</span></div>)}</div>
            </div>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div className="glass" style={{padding:16,flex:1}}>
            <div style={{color:C.green,fontSize:12,fontFamily:"'Share Tech Mono'",fontWeight:600,marginBottom:10}}>CHANNEL CONTRIBUTION</div>
            <PieChart width={148} height={148} style={{margin:"0 auto"}}><Pie data={roas} cx={70} cy={70} innerRadius={38} outerRadius={65} paddingAngle={3} dataKey="v" stroke="none">{roas.map((e,i)=><Cell key={i} fill={e.c} style={{filter:`drop-shadow(0 0 4px ${e.c}88)`}}/>)}</Pie></PieChart>
            <div style={{display:"flex",justifyContent:"space-around",marginTop:8}}>
              {roas.map((r,i)=><div key={r.n} style={{textAlign:"center"}}><div style={{color:r.c,fontSize:12,fontFamily:"'Orbitron',monospace",fontWeight:600}}>{["8.7","3.7","2.2","4.1"][i]}x</div><div style={{color:C.textFaint,fontSize:8}}>{r.n}</div></div>)}
            </div>
          </div>
          <div className="glass" style={{padding:14}}>
            <div style={{color:C.green,fontSize:12,fontFamily:"'Share Tech Mono'",fontWeight:600,marginBottom:10}}>TOP USER PATHS</div>
            {[["Home","Product","Checkout"],["Home","Pricing","Sign-up"],["Docs","API","Register"]].map((path,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:3,marginBottom:8}}>
                {path.map((p,j)=><span key={j} style={{display:"flex",alignItems:"center",gap:3}}><span className="gsm" style={{padding:"2px 6px",color:"rgba(0,255,157,0.65)",fontSize:9}}>{p}</span>{j<path.length-1&&<span style={{color:C.textFaint,fontSize:10}}>→</span>}</span>)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── PROJECTS ── */
function Projects() {
  const proj=[{n:"Phantom Network",st:"In Progress",c:C.green,p:65,d1:"05/3",d2:"Nov 01/13"},{n:"Aethel Platform",st:"Blocked",c:C.red,p:40,d1:"05/5",d2:"Sep 11/29"},{n:"ORION App MVP",st:"Completed",c:C.cyan,p:100,d1:"01/20",d2:"Nov 11/29"},{n:"Project VORTEX",st:"Completed",c:C.amber,p:100,d1:"05/9",d2:"Nov 11/29"}];
  const stT={"In Progress":"info",Blocked:"err",Completed:"ok"};
  const tl=[{op:"Phantom",c:C.green,ph:[2,3,0,0,0,0,0]},{op:"Aethel",c:C.cyan,ph:[0,2,3,0,0,0,0]},{op:"ORION MVP",c:C.amber,ph:[0,0,2,3,0,0,0]},{op:"VORTEX",c:C.purple,ph:[0,0,0,0,2,3,0]}];
  return (
    <div className="fu" style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{color:C.green,fontSize:18,fontFamily:"'Orbitron',monospace",fontWeight:700,letterSpacing:2}}>OPERATIONS OVERVIEW</div>
        <button className="btn">+ NEW OPERATION</button>
      </div>
      <div style={{display:"flex",gap:10}}>
        <input className="inp" placeholder="⌕  Search operations..." style={{maxWidth:230,padding:"8px 12px"}}/>
        {["Status: ALL ▾","Filter: Milestone ▾"].map(f=><button key={f} className="btn" style={{padding:"8px 13px",fontSize:11}}>{f}</button>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
        {proj.map(p=>(
          <div key={p.n} className="glass" style={{padding:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}><div style={{color:C.green,fontSize:12,fontWeight:600,fontFamily:"'Share Tech Mono'",lineHeight:1.4}}>{p.n}</div><span className="dots">···</span></div>
            <div className="pb" style={{marginBottom:10}}><div className="pf" style={{width:`${p.p}%`,background:p.c,boxShadow:`0 0 5px ${p.c}66`}}/></div>
            <div style={{display:"flex",gap:5,marginBottom:10}}>{[0,1,2].map(i=><Av key={i} i={i} sz={22}/>)}</div>
            <Bdg label={p.st} t={stT[p.st]}/>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:8}}><span style={{color:C.textFaint,fontSize:9}}>{p.d1}</span><span style={{color:C.textFaint,fontSize:9}}>{p.d2}</span></div>
          </div>
        ))}
      </div>
      <div className="glass" style={{padding:16}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><div style={{color:C.green,fontSize:12,fontFamily:"'Share Tech Mono'",fontWeight:600}}>OPERATION TIMELINE (GANTT)</div><span className="dots">···</span></div>
        <div style={{display:"grid",gridTemplateColumns:"110px repeat(7,1fr)",gap:3}}>
          <div/>
          {["Phase 1","Phase 2","Phase 3","Phase 4","Phase 5","Phase 6","Phase 7"].map(l=><div key={l} style={{color:C.textDim,fontSize:9,letterSpacing:.4,textAlign:"center",paddingBottom:6,borderBottom:"1px solid rgba(0,255,157,0.07)"}}>{l}</div>)}
          {tl.map(row=>[
            <div key={row.op+"l"} style={{color:"rgba(0,255,157,0.65)",fontSize:11,display:"flex",alignItems:"center",gap:6}}><span style={{width:3,height:14,background:row.c,borderRadius:2,display:"inline-block"}}/>{row.op}</div>,
            ...row.ph.map((v,i)=><div key={i} style={{height:18,borderRadius:4,background:v===2?`${row.c}44`:v===3?`${row.c}1a`:"transparent",border:v>0?`1px solid ${row.c}2a`:"none"}}/>)
          ])}
        </div>
      </div>
    </div>
  );
}

/* ── TEAM ── */
function Team() {
  const wl=[{n:"Rook",a:82,i:45},{n:"Ghost",a:55,i:60},{n:"Vex",a:91,i:20},{n:"Cipher",a:70,i:55},{n:"Nova",a:40,i:75}];
  const rev=[{n:"Under Analysis",v:40,c:C.green},{n:"Mitigated",v:35,c:C.cyan},{n:"Escalated",v:25,c:C.red}];
  const CB=({x,y,width,height,fill})=><rect x={x} y={y} width={width} height={height} rx={4} ry={4} fill={fill} style={{filter:`drop-shadow(0 0 4px ${fill}88)`}}/>;
  return (
    <div className="fu" style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{color:C.green,fontSize:18,fontFamily:"'Orbitron',monospace",fontWeight:700,letterSpacing:2}}>RED TEAM UNIT</div>
      <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr 1fr",gap:12}}>
        <div className="glass" style={{padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><div style={{color:C.green,fontSize:12,fontFamily:"'Share Tech Mono'",fontWeight:600,lineHeight:1.5}}>OPERATOR WORKLOAD<br/><span style={{color:C.textDim,fontWeight:400}}>& RESOURCE STATUS</span></div><span className="dots">···</span></div>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={wl} barCategoryGap="25%" barGap={3}>
              <XAxis dataKey="n" tick={false} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{background:"rgba(3,13,10,0.96)",border:`1px solid ${C.gBorder}`,borderRadius:8,color:C.green,fontSize:11,fontFamily:"'Share Tech Mono'"}}/>
              <Bar dataKey="a" name="Active %" fill={C.green} shape={<CB/>}/>
              <Bar dataKey="i" name="Available %" fill={C.amber} shape={<CB/>}/>
            </BarChart>
          </ResponsiveContainer>
          <div style={{display:"flex",justifyContent:"space-around",marginTop:8}}>
            {wl.map((d,i)=><div key={d.n} style={{textAlign:"center"}}><Av i={i} sz={32}/><div style={{color:C.textDim,fontSize:9,marginTop:4}}>{d.n}</div></div>)}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div className="glass" style={{padding:14,flex:1}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><div style={{color:C.green,fontSize:12,fontFamily:"'Share Tech Mono'",fontWeight:600,lineHeight:1.5}}>OPS STATUS<br/><span style={{color:C.textDim,fontWeight:400}}>– PHANTOM NET</span></div><span className="dots">···</span></div>
            {[{l:"Reconnaissance",u:"Rook",c:C.green,p:75,i:0},{l:"Exploitation",u:"Ghost",c:C.cyan,p:55,i:1},{l:"Persistence",u:"Vex",c:C.amber,p:30,i:2}].map(it=>(
              <div key={it.l} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                  <span style={{color:"rgba(0,255,157,0.7)",fontSize:11}}>{it.l}</span>
                  <div style={{display:"flex",alignItems:"center",gap:5}}><Av i={it.i} sz={20}/><span style={{color:C.textDim,fontSize:10}}>{it.u}</span></div>
                </div>
                <div className="pb"><div className="pf" style={{width:`${it.p}%`,background:it.c,boxShadow:`0 0 5px ${it.c}55`}}/></div>
              </div>
            ))}
          </div>
          <div className="glass" style={{padding:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><div style={{color:C.green,fontSize:12,fontFamily:"'Share Tech Mono'",fontWeight:600}}>WEEKLY OBJECTIVES</div><span className="dots">···</span></div>
            {[{t:"Intel Deliverables – Sprint 4",c:C.green},{t:"Red Team Report – Review",c:C.cyan},{t:"Vulnerability Disclosure",c:C.amber}].map((m,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",marginBottom:8,color:"rgba(0,255,157,0.6)",fontSize:11}}>
                <span style={{width:7,height:7,borderRadius:"50%",background:m.c,display:"inline-block",marginRight:9,boxShadow:`0 0 4px ${m.c}`,flexShrink:0}}/><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.t}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass" style={{padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><div style={{color:C.green,fontSize:12,fontFamily:"'Share Tech Mono'",fontWeight:600,lineHeight:1.5}}>THREAT REVIEW<br/>BACKLOG</div><span className="dots">···</span></div>
          <PieChart width={150} height={150} style={{margin:"0 auto"}}><Pie data={rev} cx={72} cy={72} innerRadius={38} outerRadius={65} paddingAngle={3} dataKey="v" stroke="none">{rev.map((e,i)=><Cell key={i} fill={e.c} style={{filter:`drop-shadow(0 0 5px ${e.c}88)`}}/>)}</Pie></PieChart>
          <div style={{marginTop:12}}>{rev.map(r=><div key={r.n} style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}><span style={{width:9,height:9,borderRadius:"50%",background:r.c,display:"inline-block",boxShadow:`0 0 4px ${r.c}`}}/><span style={{color:"rgba(0,255,157,0.58)",fontSize:10}}>{r.n} ({r.v}%)</span></div>)}</div>
        </div>
      </div>
      <div className="glass" style={{padding:14}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><div style={{color:C.green,fontSize:12,fontFamily:"'Share Tech Mono'",fontWeight:600}}>SYSTEM RESOURCES</div><span className="dots">···</span></div>
        <div style={{display:"flex",gap:10}}>
          {[{ic:"🛡️",n:"CipherSec Suite v5.2",t:"Updated",c:C.green},{ic:"🗄️",n:"Threat Intel Database",t:"Synced",c:C.cyan},{ic:"⚙️",n:"Exploit Framework",t:"Stable",c:C.amber}].map(r=>(
            <div key={r.n} className="gsm" style={{flex:1,padding:"11px 13px",display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:20}}>{r.ic}</span>
              <div style={{flex:1}}><div style={{color:"rgba(0,255,157,0.82)",fontSize:11,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:130}}>{r.n}</div><span className="tag" style={{color:r.c,background:`${r.c}12`,border:`1px solid ${r.c}2a`,marginTop:4}}>{r.t}</span></div>
              <span style={{color:r.c,fontSize:13,cursor:"pointer"}}>↗</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── REPORTS ── */
function Reports() {
  const [rt,setRt]=useState("Performance");const [open,setOpen]=useState(false);
  const bd=[{n:"Performance",v:30,c:C.green},{n:"Financial",v:25,c:C.cyan},{n:"Security",v:20,c:C.red},{n:"Project",v:15,c:C.amber},{n:"Custom",v:10,c:C.purple}];
  const arc=[{n:"Phantom Network",d:"03/05/2025",t:"Project",s:"Ready"},{n:"Aethel Platform",d:"03/05/2025",t:"Security",s:"Generating"},{n:"ORION App",d:"03/05/2025",t:"Project",s:"Failed"},{n:"Q1 Financials",d:"02/28/2025",t:"Financial",s:"Ready"}];
  const sT={Ready:"ok",Generating:"warn",Failed:"err"};
  return (
    <div className="fu" style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{color:C.green,fontSize:18,fontFamily:"'Orbitron',monospace",fontWeight:700,letterSpacing:2}}>INTEL REPORTS CENTER</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 280px",gap:12}}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div className="glass" style={{padding:16}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}><div style={{color:C.green,fontSize:12,fontFamily:"'Share Tech Mono'",fontWeight:600}}>REPORT WIZARD</div><span className="dots">···</span></div>
            <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
              <div style={{position:"relative",flex:1}}>
                <div className="inp" style={{cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}} onClick={()=>setOpen(!open)}><span>{rt}</span><span>▾</span></div>
                {open&&<div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:10,background:"rgba(3,13,10,0.98)",border:`1px solid ${C.gBorder}`,borderRadius:8,marginTop:4}}>
                  {["Performance","Financial","Security","Project","Custom"].map(t=><div key={t} style={{padding:"9px 13px",color:t===rt?C.green:"rgba(0,255,157,0.58)",cursor:"pointer",fontSize:12,fontFamily:"'Share Tech Mono'"}} onClick={()=>{setRt(t);setOpen(false);}}>{t}</div>)}
                </div>}
              </div>
              <div className="gsm" style={{padding:"9px 13px",display:"flex",alignItems:"center",gap:7,color:"rgba(0,255,157,0.65)",fontSize:12,fontFamily:"'Share Tech Mono'",flex:1}}>📅 Date – Dec 31</div>
              <button className="btn" style={{padding:"9px 18px",whiteSpace:"nowrap"}}>▶ GENERATE</button>
            </div>
          </div>
          <div className="glass" style={{padding:16}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}><div style={{color:C.green,fontSize:12,fontFamily:"'Share Tech Mono'",fontWeight:600}}>REPORT ARCHIVE</div><span className="dots">···</span></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto auto auto",gap:"8px 14px",alignItems:"center"}}>
              {["NAME","DATE","TYPE","STATUS"].map(h=><div key={h} style={{color:C.textDim,fontSize:10,letterSpacing:1,paddingBottom:7,borderBottom:"1px solid rgba(0,255,157,0.07)"}}>{h}</div>)}
              {arc.map(r=>[
                <div key={r.n+"n"} style={{color:"rgba(0,255,157,0.82)",fontSize:12}}>{r.n}</div>,
                <div key={r.n+"d"} style={{color:C.textDim,fontSize:11}}>{r.d}</div>,
                <div key={r.n+"t"} style={{color:"rgba(0,255,157,0.58)",fontSize:11}}>{r.t}</div>,
                <div key={r.n+"s"}><Bdg label={r.s} t={sT[r.s]}/></div>
              ])}
            </div>
          </div>
          <div className="glass" style={{padding:16}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><div style={{color:C.green,fontSize:12,fontFamily:"'Share Tech Mono'",fontWeight:600}}>SUBSCRIBED REPORTS</div><span className="dots">···</span></div>
            {[{n:"Weekly Threat Digest",sc:"Every Mon • 08:00 AM",t:"Security"},{n:"Monthly Performance",sc:"1st of Month • 09:00 AM",t:"Performance"}].map(s=>(
              <div key={s.n} className="gsm" style={{padding:"10px 12px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div><div style={{color:"rgba(0,255,157,0.82)",fontSize:12}}>{s.n}</div><div style={{color:C.textDim,fontSize:10,marginTop:3}}>{s.sc}</div></div>
                <div style={{display:"flex",alignItems:"center",gap:10}}><Bdg label={s.t} t="info"/><span style={{color:C.red,fontSize:14,cursor:"pointer"}}>🗑</span></div>
              </div>
            ))}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div className="glass" style={{padding:16}}>
            <div style={{color:C.green,fontSize:12,fontFamily:"'Share Tech Mono'",fontWeight:600,marginBottom:14}}>BREAKDOWN BY TYPE</div>
            <PieChart width={190} height={170} style={{margin:"0 auto"}}><Pie data={bd} cx={92} cy={82} innerRadius={42} outerRadius={76} paddingAngle={2} dataKey="v" stroke="none">{bd.map((e,i)=><Cell key={i} fill={e.c} style={{filter:`drop-shadow(0 0 4px ${e.c}88)`}}/>)}</Pie></PieChart>
            <div style={{marginTop:10}}>{bd.map(b=><div key={b.n} style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}><div style={{display:"flex",alignItems:"center",gap:7}}><span style={{width:8,height:8,borderRadius:"50%",background:b.c,display:"inline-block",boxShadow:`0 0 4px ${b.c}`}}/><span style={{color:"rgba(0,255,157,0.6)",fontSize:10}}>{b.n}</span></div><span style={{color:b.c,fontSize:10}}>{b.v}%</span></div>)}</div>
          </div>
          <div className="glass" style={{padding:14}}>
            <div style={{color:C.green,fontSize:12,fontFamily:"'Share Tech Mono'",fontWeight:600,marginBottom:10}}>QUICK ACTIONS</div>
            {["👁 Preview Latest","📤 Export All","🗑 Clear Archive"].map(l=><button key={l} className="btn" style={{width:"100%",marginBottom:8,textAlign:"left"}}>{l}</button>)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── MESSAGES ── */
function Messages() {
  const [inp,setInp]=useState("");
  const msgs=[{u:"Ghost",i:1,t:"7:39 PM",tx:"Just uploaded the new Phantom Network recon data. Ready for review.",self:false},{u:"Vex",i:2,t:"7:57 PM",tx:"Awesome. Did you see the client threat brief? Node 14 IOCs flagged.",self:true},{u:"Rook",i:0,t:"7:58 PM",tx:"Cipher, can you verify the lateral movement indicators on node 14?",self:false}];
  return (
    <div className="fu" style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{color:C.green,fontSize:18,fontFamily:"'Orbitron',monospace",fontWeight:700,letterSpacing:2}}>ENCRYPTED COMMS</div>
        <div style={{display:"flex",gap:10}}>
          <div className="gsm" style={{padding:"7px 13px",display:"flex",alignItems:"center",gap:7}}><span style={{color:C.textDim}}>🔍</span><input className="inp" placeholder="Search..." style={{border:"none",background:"none",width:150,padding:0}}/></div>
          <button className="btn">✏ COMPOSE</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 250px",gap:12}}>
        <div className="glass" style={{padding:16,display:"flex",flexDirection:"column"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,paddingBottom:12,borderBottom:"1px solid rgba(0,255,157,0.07)"}}>
            <div><div style={{color:C.green,fontSize:13,fontFamily:"'Share Tech Mono'",fontWeight:600}}>#ops-channel</div><div style={{color:C.textDim,fontSize:10,marginTop:2}}>OPERATION FEEDBACK — E2E ENCRYPTED</div></div>
            <div style={{display:"flex",gap:4}}>{[0,1,2,3].map(i=><Av key={i} i={i} sz={24}/>)}<span className="dots" style={{marginLeft:8}}>···</span></div>
          </div>
          <div style={{flex:1,display:"flex",flexDirection:"column",gap:12,marginBottom:14,minHeight:220}}>
            {msgs.map((m,i)=>(
              <div key={i} style={{display:"flex",gap:10,justifyContent:m.self?"flex-end":"flex-start"}}>
                {!m.self&&<Av i={m.i} sz={30}/>}
                <div style={{maxWidth:"65%"}}>
                  <div style={{display:"flex",alignItems:"baseline",gap:7,marginBottom:3,justifyContent:m.self?"flex-end":"flex-start"}}>
                    <span style={{color:aColors[m.i],fontSize:10,fontFamily:"'Share Tech Mono'"}}>{m.u.toUpperCase()}</span>
                    <span style={{color:C.textFaint,fontSize:9}}>{m.t}</span>
                  </div>
                  <div style={{background:m.self?"rgba(0,229,255,0.07)":"rgba(0,255,157,0.05)",border:`1px solid ${m.self?C.cyan:C.green}1e`,borderRadius:10,padding:"9px 12px",color:m.self?"rgba(0,229,255,0.82)":"rgba(0,255,157,0.78)",fontSize:12,lineHeight:1.5}}>{m.tx}</div>
                </div>
                {m.self&&<Av i={3} sz={30}/>}
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:10}}>
            <input className="inp" placeholder="Type encrypted message..." value={inp} onChange={e=>setInp(e.target.value)} style={{flex:1}}/>
            <button className="btn" style={{padding:"9px 15px"}}>▶ SEND</button>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div className="glass" style={{padding:14}}>
            <div style={{color:C.green,fontSize:12,fontFamily:"'Share Tech Mono'",fontWeight:600,marginBottom:12}}>DIRECT CHANNELS</div>
            {[{n:"Ghost",i:1,on:true,msg:"Recon data uploaded..."},{n:"Vex",i:2,on:true,msg:"Check node 14 IOCs..."},{n:"Nova",i:4,on:false,msg:"Threat brief ready..."}].map(d=>(
              <div key={d.n} style={{display:"flex",gap:10,alignItems:"center",padding:"7px 0",borderBottom:"1px solid rgba(0,255,157,0.05)",cursor:"pointer"}}>
                <div style={{position:"relative"}}><Av i={d.i} sz={30}/><span style={{position:"absolute",bottom:0,right:0,width:7,height:7,borderRadius:"50%",background:d.on?C.green:"rgba(0,255,157,0.18)",border:"1px solid #030d0a",boxShadow:d.on?`0 0 4px ${C.green}`:"none"}}/></div>
                <div style={{flex:1,overflow:"hidden"}}><div style={{color:"rgba(0,255,157,0.82)",fontSize:12}}>{d.n}</div><div style={{color:C.textDim,fontSize:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.msg}</div></div>
              </div>
            ))}
          </div>
          <div className="glass" style={{padding:14}}>
            <div style={{color:C.green,fontSize:12,fontFamily:"'Share Tech Mono'",fontWeight:600,marginBottom:12}}>PINNED THREADS</div>
            {["🔐 Threat Intel Feed","📋 Weekly Op Brief","⚠ Incident Response"].map(t=><div key={t} style={{padding:"7px 0",borderBottom:"1px solid rgba(0,255,157,0.05)",color:"rgba(0,255,157,0.6)",fontSize:11,cursor:"pointer"}}>{t}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── SETTINGS ── */
function Settings() {
  const [twoFa,setTwoFa]=useState(true);const [inv,setInv]=useState(false);
  const team=[{n:"Ghost",i:1,r:"Admin"},{n:"Vex",i:2,r:"Editor"},{n:"Rook",i:0,r:"Editor"},{n:"Nova",i:4,r:"Viewer"}];
  const ints=[{n:"Shodan",ic:"🌐",s:"Synced",c:C.green},{n:"VirusTotal",ic:"🛡️",s:"Active",c:C.green},{n:"Grafana",ic:"📊",s:"Active",c:C.cyan},{n:"Slack",ic:"💬",s:"Synced",c:C.green}];
  return (
    <div className="fu" style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{color:C.green,fontSize:18,fontFamily:"'Orbitron',monospace",fontWeight:700,letterSpacing:2}}>WORKSPACE CONFIG</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div className="glass" style={{padding:16}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}><div style={{color:C.green,fontSize:12,fontFamily:"'Share Tech Mono'",fontWeight:600}}>ACCOUNT & SECURITY</div><span className="dots">···</span></div>
            {[["🔑 Change Access Key","→"],["🖥 API Key Management","→"]].map(([l,r])=><div key={l} className="gsm" style={{padding:"11px 13px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}><span style={{color:"rgba(0,255,157,0.72)",fontSize:12}}>{l}</span><span style={{color:C.textDim,fontSize:14}}>{r}</span></div>)}
            <div className="gsm" style={{padding:"11px 13px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:"rgba(0,255,157,0.72)",fontSize:12}}>🔒 Two-Factor Auth</span>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <Bdg label={twoFa?"ACTIVE":"DISABLED"} t={twoFa?"ok":"err"}/>
                <div onClick={()=>setTwoFa(!twoFa)} style={{width:38,height:22,borderRadius:99,background:twoFa?"rgba(0,255,157,0.22)":"rgba(255,255,255,0.07)",border:`1px solid ${twoFa?C.green:"rgba(255,255,255,0.18)"}`,position:"relative",cursor:"pointer",transition:"all .2s",boxShadow:twoFa?`0 0 7px rgba(0,255,157,0.28)`:"none"}}>
                  <span style={{position:"absolute",top:2,[twoFa?"right":"left"]:2,width:16,height:16,borderRadius:"50%",background:twoFa?C.green:"rgba(255,255,255,0.28)",transition:"all .2s"}}/>
                </div>
              </div>
            </div>
            <div style={{marginTop:14}}>
              <div style={{color:C.textDim,fontSize:10,letterSpacing:1,marginBottom:8}}>SESSION MANAGEMENT</div>
              {["iPhone 14 Pro","MacBook Pro","Kali Linux VM","Workstation"].map(d=><div key={d} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><span style={{color:C.textFaint,fontSize:12}}>□</span><span style={{color:"rgba(0,255,157,0.62)",fontSize:11}}>{d}</span></div>)}
              <button className="btn" style={{width:"100%",marginTop:8}}>🔐 VIEW RECOVERY CODES</button>
            </div>
          </div>
          <div className="glass" style={{padding:16}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><div style={{color:C.green,fontSize:12,fontFamily:"'Share Tech Mono'",fontWeight:600}}>SYSTEM CONNECTIONS</div><span className="dots">···</span></div>
            {[{ic:"🛡️",n:"CipherSec Suite v5.2",t:"Update Available",c:C.amber,a:"SYNC NOW"},{ic:"🗄️",n:"Threat DB",t:"Up-to-Date",c:C.green,a:null}].map(s=>(
              <div key={s.n} className="gsm" style={{padding:"10px 12px",marginBottom:8,display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:18}}>{s.ic}</span>
                <div style={{flex:1}}><div style={{color:"rgba(0,255,157,0.82)",fontSize:11}}>{s.n}</div><span className="tag" style={{color:s.c,background:`${s.c}12`,border:`1px solid ${s.c}2a`,marginTop:3}}>{s.t}</span></div>
                {s.a&&<button className="btn" style={{padding:"4px 9px",fontSize:10}}>{s.a}</button>}
              </div>
            ))}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div className="glass" style={{padding:16}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}><div style={{color:C.green,fontSize:12,fontFamily:"'Share Tech Mono'",fontWeight:600}}>INTEGRATION HUB</div><span className="dots">···</span></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {ints.map(it=><div key={it.n} className="gsm" style={{padding:"12px",display:"flex",alignItems:"center",gap:9}}><span style={{fontSize:20}}>{it.ic}</span><div><div style={{color:"rgba(0,255,157,0.82)",fontSize:12}}>{it.n}</div><Bdg label={it.s} t="ok"/></div><span style={{marginLeft:"auto",color:it.c,fontSize:13}}>✓</span></div>)}
              <div className="gsm" style={{padding:"12px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",border:`1px dashed rgba(0,255,157,0.15)`}}><span style={{color:C.textDim,fontSize:11}}>+ ADD</span></div>
            </div>
          </div>
          <div className="glass" style={{padding:16}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}><div style={{color:C.green,fontSize:12,fontFamily:"'Share Tech Mono'",fontWeight:600}}>WORKSPACE ACCESS</div><span className="dots">···</span></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:"7px 14px",alignItems:"center"}}>
              <div style={{color:C.textDim,fontSize:10,letterSpacing:1,paddingBottom:6,borderBottom:"1px solid rgba(0,255,157,0.07)"}}>OPERATOR</div>
              <div style={{color:C.textDim,fontSize:10,letterSpacing:1,paddingBottom:6,borderBottom:"1px solid rgba(0,255,157,0.07)"}}>ROLE</div>
              {team.map(m=>[
                <div key={m.n+"u"} style={{display:"flex",alignItems:"center",gap:8,padding:"3px 0"}}><Av i={m.i} sz={24}/><span style={{color:"rgba(0,255,157,0.78)",fontSize:12}}>{m.n}</span></div>,
                <div key={m.n+"r"} className="gsm" style={{padding:"3px 10px",display:"flex",alignItems:"center",gap:5,cursor:"pointer"}}><span style={{color:"rgba(0,255,157,0.68)",fontSize:11}}>{m.r}</span><span style={{color:C.textFaint,fontSize:9}}>▾</span></div>
              ])}
            </div>
            <div style={{marginTop:12,display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:10,borderTop:"1px solid rgba(0,255,157,0.07)"}}>
              <span style={{color:"rgba(0,255,157,0.6)",fontSize:12}}>+ INVITE OPERATOR</span>
              <div onClick={()=>setInv(!inv)} style={{width:38,height:22,borderRadius:99,background:inv?"rgba(0,255,157,0.22)":"rgba(255,255,255,0.07)",border:`1px solid ${inv?C.green:"rgba(255,255,255,0.18)"}`,position:"relative",cursor:"pointer",transition:"all .2s"}}>
                <span style={{position:"absolute",top:2,[inv?"right":"left"]:2,width:16,height:16,borderRadius:"50%",background:inv?C.green:"rgba(255,255,255,0.28)",transition:"all .2s"}}/>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══ ROOT ══ */
const PAGES = { Dashboard, Analytics, Projects, Team, Reports, Messages, Settings };

export default function App() {
  const [page, setPage] = useState("login");
  const Page = PAGES[page];

  if (page === "login") return (
    <>
      <style>{GS}</style>
      <Login onLogin={() => setPage("Dashboard")} />
    </>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Share Tech Mono',monospace", padding: 18, boxSizing: "border-box" }} className="grid-bg">
      <style>{GS}</style>
      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse 80% 50% at 50% 0%,rgba(0,255,157,0.04) 0%,transparent 60%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", minHeight: "calc(100vh - 36px)" }}>
        <TopBar page={page} />
        <div style={{ display: "flex", gap: 14, flex: 1 }}>
          <Sidebar active={page} go={setPage} />
          <div className="scr" style={{ flex: 1, overflowY: "auto", paddingRight: 4 }}>
            {Page && <Page />}
          </div>
        </div>
      </div>
    </div>
  );
}
