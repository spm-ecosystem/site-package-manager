(function(){"use strict";(function(){const o=document.createElement("style");o.id="spm-anti-flicker",o.textContent=`
      html {
        background-color: var(--spm-bg-primary, #121212) !important;
      }
      body {
        opacity: 0 !important;
        transition: opacity 0.2s ease-in-out !important;
      }

      #spm-loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: var(--spm-bg-primary, #121212);
      z-index: 2147483647; /* Z-index máximo do navegador */
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 1;
      transition: opacity 0.3s ease-in-out;
      pointer-events: all;
    }

    .spm-spinner {
      width: 40px !important;
      height: 40px !important;
      background-color: transparent !important;
      border: 3px solid var(--spm-bg-tertiary, rgba(255, 255, 255, 0.1)) !important;
      border-radius: 50% !important;
      border-top-color: var(--spm-accent, #7c6af5) !important;
      animation: spm-spin 1s linear infinite !important;
      box-sizing: border-box !important;
    }

    @keyframes spm-spin {
      to { transform: rotate(360deg); }
    }
    `;const i=document.createElement("div");i.id="spm-loading-overlay";const r=document.createElement("div");r.className="spm-spinner",i.appendChild(r);const a=()=>{document.documentElement.appendChild(o),document.documentElement.appendChild(i)};document.documentElement?a():document.addEventListener("DOMContentLoaded",()=>{a()});let n="idle",s="";window.alert=function(t){const e={message:String(t),type:"info"};if(window.dispatchEvent(new CustomEvent("spm-show-toast",{detail:e})),window.top&&window.top!==window)try{window.top.dispatchEvent(new CustomEvent("spm-show-toast",{detail:e}))}catch{window.top.postMessage({type:"spm-show-toast",message:String(t),toastType:"info"},"*")}};const d=window.confirm;window.confirm=function(t){return s=String(t),window.dispatchEvent(new CustomEvent("spm-confirm-called",{detail:{message:s,mode:n}})),n==="dry-run"?!1:n==="force-true"?!0:d(t)},window.addEventListener("spm-set-confirm-mode",t=>{const e=t;e.detail&&e.detail.mode&&(n=e.detail.mode)})})()})();
