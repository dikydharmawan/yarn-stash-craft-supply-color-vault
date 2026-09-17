"use strict";
const LS_KEY="yarnStash.collection.v1",LS_THEME="yarnStash.theme",LS_UI="yarnStash.ui";
const TYPES=[["worsted","Worsted"],["dk","DK"],["bulky","Tebal"],["lace","Tipis"],["fabric","Kain"],["floss","Benang Sulam"],["other","Lainnya"]];
let items=[],filterType="",filterColor="",search="",sortBy="new",editingId=null,undoItem=null,undoIndex=-1,undoTimer=null,dupOnly=false;
const $=id=>document.getElementById(id);
const saveUI=()=>localStorage.setItem(LS_UI,JSON.stringify({filterType,filterColor,search,sortBy,dupOnly}));
const grid=$("grid"),overlay=$("overlay"),form=$("form"),filter=$("filter");
const searchEl=$("search"),sortEl=$("sort"),summary=$("summary"),colorbar=$("colorbar");
const toast=$("toast"),dupeHint=$("dupeHint"),dupeText=$("dupeText"),dupeForce=$("dupeForce");
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const shade=(hex,pct)=>{const n=parseInt(hex.slice(1),16),f=v=>Math.round(v*(1-pct));return `rgb(${f(n>>16&255)},${f(n>>8&255)},${f(n&255)})`;};
const rp=n=>"Rp"+Math.round(n||0).toLocaleString("id-ID");
const dupKey=(n,c,w)=>String(n||"").trim().toLowerCase()+"|"+(c||"")+"|"+(w||"");
const showToast=t=>{toast.innerHTML=`<span>${t}</span>`;toast.classList.add("show");clearTimeout(undoTimer);undoTimer=setTimeout(()=>toast.classList.remove("show"),5000);};
function load(){try{items=JSON.parse(localStorage.getItem(LS_KEY))||[]}catch(e){items=[]}if(!Array.isArray(items))items=[];}
const save=()=>localStorage.setItem(LS_KEY,JSON.stringify(items));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
function fillSelects(){
  const opt=TYPES.map(t=>`<option value="${t[0]}">${t[1]}</option>`).join("");
  filter.innerHTML='<option value="">Semua jenis</option>'+opt;
  $("f-weight").innerHTML=opt;
}
const typeLabel=id=>{const t=TYPES.find(x=>x[0]===id);return t?t[1]:"Lainnya";};
const sameName=name=>{const n=String(name||"").trim().toLowerCase();return n?items.filter(i=>i.id!==editingId&&String(i.name).trim().toLowerCase()===n):[];};
const CLOSE=48;
const hexDist=(a,b)=>{const ca=parseInt(a.slice(1),16),cb=parseInt(b.slice(1),16);return Math.hypot((ca>>16&255)-(cb>>16&255),(ca>>8&255)-(cb>>8&255),(ca&255)-(cb&255));};
const nameCounts=()=>{const c={};for(const i of items)c[i.name.trim().toLowerCase()]=(c[i.name.trim().toLowerCase()]||0)+1;return c;};
function updateDupeHint(){
  const name=$("f-name").value,color=$("f-color").value,weight=$("f-weight").value,same=sameName(name);
  const dups=same.filter(i=>i.color===color&&i.weight===weight);
  const sim=same.filter(i=>!(i.color===color&&i.weight===weight));
  const near=sim.filter(i=>hexDist(i.color,color)<=CLOSE);
  const rest=sim.filter(i=>hexDist(i.color,color)>CLOSE);
  const fmt=arr=>arr.map(i=>`${esc(i.name)} (${esc(typeLabel(i.weight))}, ${esc(i.colorCode||i.color)})`).join(", ");
  if(!dups.length&&!sim.length){dupeHint.classList.add("hidden");return;}
  let out=[];
  if(dups.length)out.push(`Tercatat persis: ${fmt(dups)}.`);
  if(near.length)out.push(`Warna hampir sama: ${fmt(near)}.`);
  if(rest.length)out.push(`Bahan bernama sama: ${fmt(rest)}.`);
  dupeText.innerHTML=out.join(" ");
  $("dupeForceRow").classList.toggle("hidden",!dups.length);
  if(!dups.length)dupeForce.checked=false;
  dupeHint.classList.remove("hidden");
}
function visItems(c){
  const q=search.toLowerCase().trim();
  const list=items.filter(i=>(!dupOnly||c[i.name.trim().toLowerCase()]>1)&&(!filterType||i.weight===filterType)&&(!filterColor||i.color===filterColor)&&(!q||`${i.name} ${i.brand||""} ${i.notes||""}`.toLowerCase().includes(q)));
  const sorts={new:(a,b)=>b.created-a.created,old:(a,b)=>a.created-b.created,az:(a,b)=>a.name.localeCompare(b.name,"id"),za:(a,b)=>b.name.localeCompare(a.name,"id"),qty:(a,b)=>((+b.qty)||0)-((+a.qty)||0)};
  return list.sort(sorts[sortBy]||sorts.new);
}
function renderSummary(){
  summary.innerHTML="";
  const counts={};
  for(const t of TYPES)counts[t[0]]=0;
  for(const i of items)counts[i.weight]=(counts[i.weight]||0)+1;
  for(const t of TYPES){
    if(!counts[t[0]])continue;
    const b=document.createElement("button");
    b.type="button";b.className="chip"+(filterType===t[0]?" on":"");b.textContent=`${t[1]} ${counts[t[0]]}`;
    b.addEventListener("click",()=>{filterType=filter.value=(filterType===t[0])?"":t[0];saveUI();render();});
    summary.appendChild(b);
  }
}
function renderColors(){
  const used=Array.from(new Set(items.map(i=>i.color).filter(Boolean)));
  if(!used.length&&!filterColor){colorbar.innerHTML="";return;}
  let html=filterColor?`<button type="button" class="chip" id="cclear">Semua warna</button>`:"";
  html+=used.map(c=>`<button type="button" class="chip sw${filterColor===c?" on":""}" data-c="${c}" style="--c:${c}"><span></span>${c}</button>`).join("");
  colorbar.innerHTML=html;
  for(const b of colorbar.children){
    if(b.id==="cclear"){b.addEventListener("click",()=>{filterColor="";saveUI();render();});continue;}
    b.addEventListener("click",()=>{filterColor=(filterColor===b.dataset.c)?"":b.dataset.c;saveUI();render();});
  }
}
const EMPTY='<div class="empty"><svg width="40" height="40" viewBox="0 0 32 32"><circle cx="16" cy="16" r="11" fill="none" stroke="#b0653e" stroke-width="2"/><path d="M7 14c7-6 18-1 16 9c-2 7-14 4-14-3c0-6 8-12 16-7" fill="none" stroke="#b0653e" stroke-width="2" stroke-linecap="round"/></svg>';
function render(){
  const counts=nameCounts();
  const vis=visItems(counts);
  grid.innerHTML="";
  $("countEntri").textContent=items.length;
  $("countQty").textContent=items.reduce((s,i)=>s+(+i.qty||0),0);
  $("countVal").textContent=rp(items.reduce((s,i)=>s+(+i.price||0)*(+i.qty||1),0));
  $("brands").innerHTML=[...new Set(items.map(i=>i.brand).filter(Boolean))].map(b=>`<option value="${esc(b)}">`).join("");
  const dupN=items.filter(i=>counts[i.name.trim().toLowerCase()]>1).length;
  $("dupBtn").textContent=`Mirip ${dupN}`;
  $("dupBtn").classList.toggle("on",dupOnly);
  renderSummary();renderColors();
  if(!items.length||!vis.length){
    grid.innerHTML=EMPTY+`<p><b>${items.length?"Tidak ada bahan yang cocok.":"Simpanan masih kosong."}</b></p><p>${items.length?"Ubah pencarian atau filter.":"Mulai dengan \u201c+ Tambah Bahan\u201d."}</p></div>`;
    return;
  }
  for(const it of vis){
    const color=it.color||"#8a5a44",code=it.colorCode||color;
    const card=document.createElement("div");
    card.className="card"+(counts[it.name.trim().toLowerCase()]>1?" dup":"");
    card.innerHTML=`<div class="swatch" style="--c:${color};--c-dark:${shade(color,.28)}"><span>${esc(code)}</span></div><div class="body"><p class="name">${esc(it.name)}</p><span class="type">${esc(typeLabel(it.weight))}</span><p class="meta"><b>${esc(it.qty||1)}</b> ${esc(it.unit||"gulungan")}${it.length?` &middot; ${esc(it.length)}m`:""}${it.price?` &middot; ${rp(it.price)}`:""}${it.brand?` &middot; ${esc(it.brand)}`:""}</p>${it.notes?`<p class="notes">${esc(it.notes)}</p>`:""}<div class="foot"><button class="edit" type="button">Edit</button><button class="del" type="button">Hapus</button></div></div>`;
    card.querySelector(".edit").addEventListener("click",()=>openEdit(it));
    const del=card.querySelector(".del");
    del.addEventListener("click",()=>{
      if(del.classList.toggle("confirm")){del.textContent="Yakin?";setTimeout(()=>{del.classList.remove("confirm");del.textContent="Hapus";},2500);}
      else{
        undoIndex=items.findIndex(x=>x.id===it.id);
        undoItem=items.find(x=>x.id===it.id);
        items=items.filter(x=>x.id!==it.id);
        save();render();
        clearTimeout(undoTimer);
        toast.innerHTML=`<span>${esc(it.name)} dihapus.</span><button type="button" id="undoBtn">Urungkan</button>`;
        toast.classList.add("show");
        toast.querySelector("#undoBtn").addEventListener("click",()=>{
          if(undoItem){items.splice(Math.min(undoIndex,items.length),0,undoItem);save();render();}
          toast.classList.remove("show");undoItem=null;
        });
        undoTimer=setTimeout(()=>{toast.classList.remove("show");undoItem=null;},5000);
      }
    });
    grid.appendChild(card);
  }
}
function openForm(){
  form.reset();editingId=null;
  $("f-color").value="#8a5a44";$("f-code").value="#8a5a44";$("f-qty").value="1";$("f-weight").value="worsted";
  $("formTitle").textContent="Tambah ke Simpanan";$("submitTxt").textContent="Simpan";
  dupeHint.classList.add("hidden");dupeForce.checked=false;
  overlay.classList.add("open");setTimeout(()=>$("f-name").focus(),50);
}
function openEdit(it){
  editingId=it.id;
  $("f-name").value=it.name||"";
  $("f-color").value=it.color||"#8a5a44";
  $("f-code").value=it.colorCode||it.color||"#8a5a44";
  $("f-weight").value=it.weight||"other";
  $("f-qty").value=it.qty||1;$("f-unit").value=it.unit||"gulungan";
  $("f-length").value=it.length||"";$("f-price").value=it.price||"";
  $("f-brand").value=it.brand||"";$("f-notes").value=it.notes||"";
  $("formTitle").textContent="Edit Entri";$("submitTxt").textContent="Perbarui";
  dupeForce.checked=false;updateDupeHint();
  overlay.classList.add("open");setTimeout(()=>$("f-name").focus(),50);
}
function closeForm(){overlay.classList.remove("open");editingId=null;}
$("openBtn").addEventListener("click",openForm);
$("cancelBtn").addEventListener("click",closeForm);
overlay.addEventListener("click",e=>{if(e.target===overlay)closeForm();});
$("f-color").addEventListener("input",()=>{$("f-code").value=$("f-color").value;updateDupeHint();});
$("f-code").addEventListener("input",()=>{const v=$("f-code").value.trim();if(/^#[0-9a-fA-F]{6}$/.test(v))$("f-color").value=v;});
$("f-name").addEventListener("input",updateDupeHint);
$("f-weight").addEventListener("change",updateDupeHint);
form.addEventListener("submit",e=>{
  e.preventDefault();
  const name=$("f-name").value.trim(),color=$("f-color").value,colorCode=$("f-code").value.trim()||color,weight=$("f-weight").value;
  const qty=+$("f-qty").value||1,unit=$("f-unit").value,brand=$("f-brand").value.trim(),notes=$("f-notes").value.trim();
  const length=+$("f-length").value||0,price=+$("f-price").value||0;
  if(!name){$("f-name").focus();return;}
  if(sameName(name).some(i=>i.color===color&&i.weight===weight)&&!dupeForce.checked){
    updateDupeHint();
    if(dupeHint.scrollIntoView)dupeHint.scrollIntoView({behavior:"smooth",block:"nearest"});
    $("f-name").focus();return;
  }
  if(editingId){const it=items.find(x=>x.id===editingId);if(it)Object.assign(it,{name,color,colorCode,weight,qty,unit,length,price,brand,notes});}
  else items.unshift({id:uid(),name,color,colorCode,weight,qty,unit,length,price,brand,notes,created:Date.now()});
  save();closeForm();render();
});
searchEl.addEventListener("input",()=>{search=searchEl.value;saveUI();render();});
sortEl.addEventListener("change",()=>{sortBy=sortEl.value;saveUI();render();});
filter.addEventListener("change",()=>{filterType=filter.value;saveUI();render();});
$("dupBtn").addEventListener("click",()=>{dupOnly=!dupOnly;saveUI();render();});
$("clearAllBtn").addEventListener("click",()=>{if(items.length&&confirm(`Hapus semua ${items.length} entri?`)){items=[];save();render();}});
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){closeForm();return;}
  const t=e.target&&e.target.tagName;
  if(t==="INPUT"||t==="TEXTAREA"||t==="SELECT")return;
  if(e.key==="/"){e.preventDefault();searchEl.focus();}
  else if((e.key==="n"||e.key==="N")&&!overlay.classList.contains("open"))openForm();
});
const themeBtn=$("themeBtn"),printBtn=$("printBtn"),exportBtn=$("exportBtn"),csvBtn=$("csvBtn"),importBtn=$("importBtn"),importFile=$("importFile");
function applyTheme(d){document.body.classList.toggle("dark",d);themeBtn.textContent=d?"Mode Terang":"Mode Gelap";}
applyTheme(localStorage.getItem(LS_THEME)==="dark");
themeBtn.addEventListener("click",()=>{const d=!document.body.classList.contains("dark");localStorage.setItem(LS_THEME,d?"dark":"light");applyTheme(d);});
printBtn.addEventListener("click",()=>window.print());
exportBtn.addEventListener("click",()=>{
  const blob=new Blob([JSON.stringify(items,null,2)],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);a.download="koleksi-benang.json";
  document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(a.href);
});
csvBtn.addEventListener("click",()=>{
  const q=v=>{v=String(v==null?"":v);return /[",\n]/.test(v)?`"${v.replace(/"/g,'""')}"`:v;};
  const head=["name","color","colorCode","weight","qty","unit","length","price","brand","notes"];
  const blob=new Blob([head.join(",")+"\n"+items.map(i=>head.map(k=>q(i[k])).join(",")).join("\n")],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);a.download="koleksi-benang.csv";
  document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(a.href);
});
importBtn.addEventListener("click",()=>importFile.click());
importFile.addEventListener("change",()=>{
  const f=importFile.files[0];
  if(!f)return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      const data=JSON.parse(r.result);
      const valid=Array.isArray(data)?data.filter(x=>x&&x.name&&String(x.name).trim()):[];
      if(!valid.length)throw new Error("badjson");
      if(!items.length){items=valid;save();render();}
      else if(confirm(`Gabungkan ${valid.length} entri berkas dengan data yang ada?\n(OK = gabung, Batal = timpa semua)`)){
        const have=new Set(items.map(i=>dupKey(i.name,i.color,i.weight)));
        const added=valid.filter(i=>!have.has(dupKey(i.name,i.color,i.weight))).map(i=>({id:uid(),created:Date.now(),...i}));
        if(added.length){items=[...added,...items];save();render();showToast(`+${added.length} entri diimpor.`);}
        else showToast("Semua entri sudah ada — tidak ada yang ditambahkan.");
      }
      else if(confirm(`Hapus ${items.length} entri saat ini dan pakai ${valid.length} entri dari berkas?`)){items=valid;save();render();}
    }catch(err){alert("Berkas JSON tidak valid.");}
  };
  r.readAsText(f);importFile.value="";
});
load();fillSelects();
try{const u=JSON.parse(localStorage.getItem(LS_UI))||{};filterType=u.filterType||"";filterColor=u.filterColor||"";search=u.search||"";sortBy=u.sortBy||"new";dupOnly=!!u.dupOnly;}catch(e){}
filter.value=filterType;sortEl.value=sortBy;searchEl.value=search;
render();