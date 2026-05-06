// ==UserScript==
// @name         TMOHentai - Listas PRO
// @namespace    https://tmohentai.com/
// @version      2026.05.05
// @description  Etiquetas + modo PRO + auto listas + fix hora + SPA FIX
// @author       wernser412
// @icon         https://github.com/wernser412/TMOHentai-Tags/blob/main/ICONO.png?raw=true
// @downloadURL  https://github.com/wernser412/TMOHentai-Tags/raw/refs/heads/main/TMOHentai%20-%20Listas%20PRO.user.js
// @match        https://tmohentai.app/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// ==/UserScript==

(function () {
'use strict';

/* ================= CONFIG ================= */

const ESPERA_MS = 250;
const sleep = ms => new Promise(r=>setTimeout(r,ms));

const COLORES = [
 "#f94144","#f3722c","#f8961e","#f9c74f",
 "#90be6d","#43aa8b","#577590","#9b5de5",
 "#f15bb5","#4d96ff","#6a994e","#ffb703"
];

/* ================= MENSAJE ================= */

function msg(txt){
 let box=document.getElementById("tmo-msg");
 if(!box){
  box=document.createElement("div");
  box.id="tmo-msg";
  Object.assign(box.style,{
   position:"fixed",top:"10px",right:"10px",
   background:"#111",color:"#fff",
   padding:"10px 14px",borderRadius:"8px",
   zIndex:99999,fontSize:"13px"
  });
  document.body.appendChild(box);
 }
 box.textContent=txt;
}

function hideMsg(){
 document.getElementById("tmo-msg")?.remove();
}

/* ================= FETCH ================= */

async function fetchHTML(url){
 try{
  const res=await fetch(url,{credentials:"include"});
  const text=await res.text();
  return new DOMParser().parseFromString(text,"text/html");
 }catch(e){
  console.warn("Error:",url);
  return null;
 }
}

/* ================= LISTAS ================= */

async function capturarListas(){

 const listas = {};
 const BASE = location.origin;
 const url = BASE + "/perfil?tab=lists";

 try{
  const res = await fetch(url,{
   credentials:"include",
   headers:{
    "Accept":"text/html",
    "X-Requested-With":"XMLHttpRequest"
   }
  });

  const html = await res.text();
  const doc = new DOMParser().parseFromString(html,"text/html");

  let enlaces = doc.querySelectorAll(".pfl-list-title");

  if(!enlaces.length){
   enlaces = doc.querySelectorAll("a[href*='/lists/']");
  }

  if(!enlaces.length){
   msg("❌ No se detectaron listas");
   setTimeout(hideMsg,1500);
   return {};
  }

  enlaces.forEach(a=>{
   const nombre = a.textContent.trim();
   const link = a.href;

   if(!nombre || !link.includes("/lists/")) return;

   if(!listas[nombre]) listas[nombre]=[];
   listas[nombre].push(link);
  });

  GM_setValue("tmo_listas",listas);

  msg(`✅ Listas: ${Object.keys(listas).length}`);
  setTimeout(hideMsg,1200);

  return listas;

 }catch(e){
  console.error(e);
  msg("❌ Error capturando listas");
  setTimeout(hideMsg,1500);
  return {};
 }
}

/* ================= CARGA PRO ================= */

async function cargarPRO(){

 const listas=GM_getValue("tmo_listas",{});
 const mangas={};

 let totalListas = Object.keys(listas).length;
 let indexLista = 0;

 for(const [nombre,links] of Object.entries(listas)){
  indexLista++;

  for(const url of links){

   msg(`🚀 ${nombre} (${indexLista}/${totalListas})`);

   let page=1;
   let seguir=true;

   while(seguir){

    const doc=await fetchHTML(url+"?page="+page);
    if(!doc) break;

    const items=doc.querySelectorAll(".list-manga-wrap");
    if(!items.length){
     seguir=false;
     break;
    }

    items.forEach(wrap=>{
     const btn=wrap.querySelector(".btn-remove-from-list");
     if(!btn) return;

     const id=btn.dataset.mangaId;
     if(!id) return;

     if(!mangas[id]) mangas[id]=[];

     if(!mangas[id].includes(nombre)){
      mangas[id].push(nombre);
     }
    });

    if(page % 3 === 0){
     msg(`📄 ${nombre} - página ${page}`);
    }

    page++;
    await sleep(ESPERA_MS);
   }
  }
 }

 GM_setValue("tmo_mangas",mangas);

 msg("🎉 Listas actualizadas");
 setTimeout(hideMsg,1500);
}

/* ================= TODO EN UNO ================= */

async function todoEnUno(){
 msg("⚡ Iniciando...");
 await capturarListas();
 await cargarPRO();
 aplicarEtiquetas();
}

/* ================= LIMPIAR ================= */

function limpiarCache(){
 GM_setValue("tmo_listas",{});
 GM_setValue("tmo_mangas",{});
 GM_setValue("tmo_colores",{});
 msg("🧹 Caché limpiado");
 setTimeout(hideMsg,1200);
}

/* ================= HORA ================= */

function aplicarHora(){
 const v = GM_getValue("hora", false);
 document.querySelectorAll(".content-detail")
  .forEach(e => e.style.display = v ? "none" : "");
}

function toggleHora(){
 const v = !GM_getValue("hora", false);
 GM_setValue("hora", v);
 aplicarHora();
 msg(v ? "⏰ Hora oculta" : "⏰ Hora visible");
 setTimeout(hideMsg,1000);
}

/* ================= YAOI ================= */

function aplicarYaoi(){
 const v = GM_getValue("yaoi", false);
 document.querySelectorAll(".element-thumbnail").forEach(el=>{
  if(!el.querySelector(".data-type-yaoi")) return;
  el.style.display = v ? "none" : "";
 });
}

function toggleYaoi(){
 const v = !GM_getValue("yaoi", false);
 GM_setValue("yaoi", v);
 aplicarYaoi();
 msg(v ? "🚫 Yaoi oculto" : "👁️ Yaoi visible");
 setTimeout(hideMsg,1000);
}

/* ================= ETIQUETAS ================= */

GM_addStyle(`
.tmo-en-lista{
 outline:3px solid #ffd000;
 outline-offset:-3px;
 border-radius:8px;
 box-shadow:0 0 8px rgba(255,208,0,.6);
}
`);

function aplicarEtiquetas(){

 const mangas=GM_getValue("tmo_mangas",{});
 if(!Object.keys(mangas).length) return;

 const colores=GM_getValue("tmo_colores",{});
 let idx=0;

 document.querySelectorAll(".element-thumbnail, .list-manga-wrap").forEach(card=>{

  let id;

  const btn=card.querySelector(".btn-remove-from-list");
  if(btn){
   id=btn.dataset.mangaId;
  }else{
   const a=card.querySelector("a[href*='/library/']");
   const m=a?.href.match(/\/(\d+)\//);
   if(m) id=m[1];
  }

  if(!id) return;

  const thumb=card.querySelector(".work-thumbnail");
  if(!thumb) return;

  thumb.classList.remove("tmo-en-lista");
  thumb.querySelectorAll(".tmo-labels").forEach(e=>e.remove());

  const listas=mangas[id];
  if(!listas) return;

  thumb.classList.add("tmo-en-lista");
  thumb.style.position="relative";

  const wrap=document.createElement("div");
  wrap.className="tmo-labels";

  Object.assign(wrap.style,{
   position:"absolute",
   bottom:"6px",
   left:"6px",
   display:"flex",
   flexDirection:"column",
   gap:"3px",
   zIndex:50
  });

  listas.forEach(lista=>{
   if(!colores[lista]) colores[lista]=COLORES[idx++%COLORES.length];

   const tag=document.createElement("div");
   tag.textContent=lista;

   Object.assign(tag.style,{
    background:colores[lista],
    color:"#000",
    padding:"2px 6px",
    fontSize:"11px",
    fontWeight:"bold",
    borderRadius:"5px"
   });

   wrap.appendChild(tag);
  });

  thumb.appendChild(wrap);
 });

 GM_setValue("tmo_colores",colores);
}

/* ================= MENU ================= */

GM_registerMenuCommand("⚡ Capturar + Cargar PRO",todoEnUno);
GM_registerMenuCommand("🧹 Limpiar mangas guardados",limpiarCache);
GM_registerMenuCommand("⏰ Hora ON/OFF",toggleHora);
GM_registerMenuCommand("🚫 Yaoi ON/OFF",toggleYaoi);

/* ================= INIT ================= */

window.addEventListener("load", ()=>{
 aplicarEtiquetas();
 aplicarHora();
 aplicarYaoi();
});

/* ================= SPA FIX ================= */

let timeout;

const observer = new MutationObserver(() => {

 clearTimeout(timeout);

 timeout = setTimeout(() => {
  aplicarEtiquetas();
  aplicarHora();
  aplicarYaoi();
 }, 300);

});

observer.observe(document.body,{
 childList:true,
 subtree:true
});

})();
