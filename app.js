"use strict";
const LS_KEY="yarnStash.collection.v1",LS_THEME="yarnStash.theme";
const TYPES=[["worsted","Worsted"],["dk","DK"],["bulky","Tebal"],["lace","Tipis"],["fabric","Kain"],["floss","Benang Sulam"],["other","Lainnya"]];
let items=[],filterType="",filterColor="",search="",sortBy="new",editingId=null,undoItem=null,undoIndex=-1,undoTimer=null;
const $=id=>document.getElementById(id);
const grid=$("grid"),overlay=$("overlay"),form=$("form"),filter=$("filter");
const searchEl=$("search"),sortEl=$("sort"),summary=$("summary"),colorbar=$("colorbar");
const toast=$("toast"),dupeHint=$("dupeHint"),dupeText=$("dupeText"),dupeForce=$("dupeForce");
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function shade(hex,pct){const n=parseInt(hex.slice(1),16),f=v=>Math.round(v*(1-pct));return `rgb(${f(n>>16&255)},${f(n>>8&255)},${f(n&255)})`;}
function load(){try{items=JSON.parse(localStorage.getItem(LS_KEY))||[]}catch(e){items=[]}if(!Array.isArray(items))items=[];}
function save(){localStorage.setItem(LS_KEY,JSON.stringify(items));}
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
function fillSelects(){
  filter.innerHTML='<option value="">Semua jenis</option>'+TYPES.map(t=>`<option value="${t[0]}">${t[1]}</option>`).join("");
  $("f-weight").innerHTML=TYPES.map(t=>`<option value="${t[0]}">${t[1]}</option>`).join("");
}
const typeLabel=id=>{const t=TYPES.find(x=>x[0]===id);return t?t[1]:"Lainnya";};
function sameName(name){const n=String(name||"").trim().toLowerCase();return n?items.filter(i=>i.id!==editingId&&String(i.name).trim().toLowerCase()===n):[];}
function updateDupeHint(){
  const name=$("f-name").value,color=$("f-color").value,weight=$("f-weight").value,same=sameName(name);
  const dups=same.filter(i=>i.color===color&&i.weight===weight);
  const sim=same.filter(i=>!(i.color===color&&i.weight===weight));
  const fmt=arr=>arr.map(i=>`${esc(i.name)} (${esc(typeLabel(i.weight))}, ${esc(i.colorCode||i.color)})`).join(", ");
  if(!dups.length&&!sim.length){dupeHint.classList.add("hidden");return;}
  let out=[];
  if(dups.length)out.push(`Tercatat persis: ${fmt(dups)}.`);
  if(sim.length)out.push(`Bahan bernama sama: ${fmt(sim)}.`);
  dupeText.innerHTML=out.join(" ");
  $("dupeForceRow").classList.toggle("hidden",!dups.length);
  if(!dups.length)dupeForce.checked=false;
  dupeHint.classList.remove("hidden");
}
function visItems(){
  const q=search.toLowerCase().trim();
  const list=items.filter(i=>(!filterType||i.weight===filterType)&&(!filterColor||i.color===filterColor)&&(!q||`${i.name} ${i.brand||""} ${i.notes||""}`.toLowerCase().includes(q)));
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
    b.addEventListener("click",()=>{filterType=filter.value=(filterType===t[0])?"":t[0];render();});
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
    if(b.id==="cclear"){b.addEventListener("click",()=>{filterColor="";render();});continue;}
    b.addEventListener("click",()=>{filterColor=(filterColor===b.dataset.c)?"":b.dataset.c;render();});
  }
}
function render(){
  const vis=visItems();
  grid.innerHTML="";
  $("countEntri").textContent=items.length;
  $("countQty").textContent=items.reduce((s,i)=>s+(+i.qty||0),0);
  renderSummary();renderColors();
  if(!items.length||!vis.length){
    grid.innerHTML=`<div class="empty">
      <svg width="40" height="40" viewBox="0 0 32 32"><circle cx="16" cy="16" r="11" fill="none" stroke="#b0653e" stroke-width="2"/><path d="M7 14c7-6 18-1 16 9c-2 7-14 4-14-3c0-6 8-12 16-7" fill="none" stroke="#b0653e" stroke-width="2" stroke-linecap="round"/></svg>
      <p><b>${items.length?"Tidak ada bahan yang cocok.":"Simpanan masih kosong."}</b></p>
      <p>${items.length?"Coba ubah pencarian atau hapus filter.":"Klik \u201c+ Tambah Bahan\u201d untuk mulai mencatat benang Anda."}</p>
    </div>`;
    return;
  }
  for(const it of vis){
    const color=it.color||"#8a5a44",code=it.colorCode||color;
    const card=document.createElement("div");
    card.className="card";
    card.innerHTML=`
      <div class="swatch" style="--c:${color};--c-dark:${shade(color,.28)}"><span>${esc(code)}</span></div>
      <div class="body">
        <p class="name">${esc(it.name)}</p>
        <span class="type">${esc(typeLabel(it.weight))}</span>
        <p class="meta"><b>${esc(it.qty||1)}</b> ${esc(it.unit||"gulungan")}${it.brand?` &middot; ${esc(it.brand)}`:""}</p>
        ${it.notes?`<p class="notes">${esc(it.notes)}</p>`:""}
        <div class="foot"><button class="edit" type="button">Edit</button><button class="del" type="button">Hapus</button></div>
      </div>`;
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
  if(!name){$("f-name").focus();return;}
  if(sameName(name).some(i=>i.color===color&&i.weight===weight)&&!dupeForce.checked){
    updateDupeHint();
    if(dupeHint.scrollIntoView)dupeHint.scrollIntoView({behavior:"smooth",block:"nearest"});
    $("f-name").focus();return;
  }
  if(editingId){const it=items.find(x=>x.id===editingId);if(it)Object.assign(it,{name,color,colorCode,weight,qty,unit,brand,notes});}
  else items.unshift({id:uid(),name,color,colorCode,weight,qty,unit,brand,notes,created:Date.now()});
  save();closeForm();render();
});
searchEl.addEventListener("input",()=>{search=searchEl.value;render();});
sortEl.addEventListener("change",()=>{sortBy=sortEl.value;render();});
filter.addEventListener("change",()=>{filterType=filter.value;render();});
const themeBtn=$("themeBtn"),printBtn=$("printBtn"),exportBtn=$("exportBtn"),importBtn=$("importBtn"),importFile=$("importFile");
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
      if(!items.length||confirm(`Mengganti ${items.length} entri yang ada dengan ${valid.length} entri dari berkas?`)){items=valid;save();render();}
    }catch(err){alert("Berkas JSON tidak valid.");}
  };
  r.readAsText(f);importFile.value="";
});
load();fillSelects();render();