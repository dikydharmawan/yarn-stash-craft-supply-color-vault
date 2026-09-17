"use strict";
const LS_KEY="yarnStash.collection.v1";
const TYPES=[
  ["worsted","Worsted"],["dk","DK"],["bulky","Tebal"],["lace","Tipis"],
  ["fabric","Kain"],["floss","Benang Sulam"],["other","Lainnya"]
];

let items=[];
let filterType="";

const $=id=>document.getElementById(id);
const grid=$("grid"),overlay=$("overlay"),form=$("form"),filter=$("filter");

function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function shade(hex,pct){
  const n=parseInt(hex.slice(1),16);
  const f=v=>Math.round(v*(1-pct));
  return `rgb(${f((n>>16)&255)},${f((n>>8)&255)},${f(n&255)})`;
}
function load(){
  try{items=JSON.parse(localStorage.getItem(LS_KEY))||[]}catch(e){items=[]}
  if(!Array.isArray(items))items=[];
}
function save(){localStorage.setItem(LS_KEY,JSON.stringify(items));}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}

function fillSelects(){
  filter.innerHTML='<option value="">Semua jenis</option>'+TYPES.map(t=>`<option value="${t[0]}">${t[1]}</option>`).join("");
  $("f-weight").innerHTML=TYPES.map(t=>`<option value="${t[0]}">${t[1]}</option>`).join("");
}
function typeLabel(id){const t=TYPES.find(x=>x[0]===id);return t?t[1]:"Lainnya";}

function render(){
  const vis=items.filter(i=>!filterType||i.weight===filterType);
  grid.innerHTML="";
  $("countEntri").textContent=items.length;
  $("countQty").textContent=items.reduce((s,i)=>s+(+i.qty||0),0);
  if(!vis.length){
    grid.innerHTML=`<div class="empty">
      <svg width="40" height="40" viewBox="0 0 32 32"><circle cx="16" cy="16" r="11" fill="none" stroke="#b0653e" stroke-width="2"/><path d="M7 14c7-6 18-1 16 9c-2 7-14 4-14-3c0-6 8-12 16-7" fill="none" stroke="#b0653e" stroke-width="2" stroke-linecap="round"/></svg>
      <p><b>Simpanan masih kosong.</b></p>
      <p>${filterType?"Tidak ada bahan dengan jenis ini.":"Klik \u201c+ Tambah Bahan\u201d untuk mulai mencatat benang Anda."}</p>
    </div>`;
    return;
  }
  for(const it of vis){
    const color=it.color||"#8a5a44";
    const code=it.colorCode||color;
    const card=document.createElement("div");
    card.className="card";
    card.innerHTML=`
      <div class="swatch" style="--c:${color};--c-dark:${shade(color,.28)}"><span>${esc(code)}</span></div>
      <div class="body">
        <p class="name">${esc(it.name)}</p>
        <span class="type">${esc(typeLabel(it.weight))}</span>
        <p class="meta"><b>${esc(it.qty||1)}</b> ${esc(it.unit||"gulungan")}${it.brand?` &middot; ${esc(it.brand)}`:""}</p>
        ${it.notes?`<p class="notes">${esc(it.notes)}</p>`:""}
        <div class="foot"><button class="del" type="button">Hapus</button></div>
      </div>`;
    const del=card.querySelector(".del");
    del.addEventListener("click",()=>{
      if(del.classList.toggle("confirm")){del.textContent="Yakin?";setTimeout(()=>{del.classList.remove("confirm");del.textContent="Hapus";},2500);}
      else{items=items.filter(x=>x.id!==it.id);save();render();}
    });
    grid.appendChild(card);
  }
}

function openForm(){
  form.reset();
  $("f-color").value="#8a5a44";$("f-code").value="#8a5a44";
  $("f-qty").value="1";$("f-weight").value="worsted";
  overlay.classList.add("open");
  setTimeout(()=>$("f-name").focus(),50);
}
function closeForm(){overlay.classList.remove("open");}

$("openBtn").addEventListener("click",openForm);
$("cancelBtn").addEventListener("click",closeForm);
overlay.addEventListener("click",e=>{if(e.target===overlay)closeForm();});
$("f-color").addEventListener("input",()=>{$("f-code").value=$("f-color").value;});
$("f-code").addEventListener("input",()=>{const v=$("f-code").value.trim();if(/^#[0-9a-fA-F]{6}$/.test(v))$("f-color").value=v;});
form.addEventListener("submit",e=>{
  e.preventDefault();
  const name=$("f-name").value.trim();
  if(!name){$("f-name").focus();return;}
  items.unshift({
    id:uid(),name,
    color:$("f-color").value,
    colorCode:$("f-code").value.trim()||$("f-color").value,
    weight:$("f-weight").value, qty:+$("f-qty").value||1,
    unit:$("f-unit").value, brand:$("f-brand").value.trim(),
    notes:$("f-notes").value.trim(), created:Date.now()
  });
  save();closeForm();render();
});
filter.addEventListener("change",()=>{filterType=filter.value;render();});

load();fillSelects();render();