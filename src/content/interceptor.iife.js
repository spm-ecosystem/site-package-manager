(function(){"use strict";(function(){let t=!0;try{t=window.localStorage.getItem("__spm_global_enabled_cache")!=="false"}catch{t=!0}t&&d()})();function d(){const t=document.createElement("style");t.id="spm-anti-flicker",t.textContent=`
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
    `;const o=document.createElement("div");o.id="spm-loading-overlay";const a=document.createElement("div");a.className="spm-spinner",o.appendChild(a);const r=()=>{document.documentElement.appendChild(t),document.documentElement.appendChild(o)};document.documentElement?r():document.addEventListener("DOMContentLoaded",()=>{r()});let i="idle",s="";window.alert=function(e){const n={message:String(e),type:"info"};if(window.dispatchEvent(new CustomEvent("spm-show-toast",{detail:n})),window.top&&window.top!==window)try{window.top.dispatchEvent(new CustomEvent("spm-show-toast",{detail:n}))}catch{window.top.postMessage({type:"spm-show-toast",message:String(e),toastType:"info"},window.location.origin)}};const m=window.confirm;window.confirm=function(e){return s=String(e),window.dispatchEvent(new CustomEvent("spm-confirm-called",{detail:{message:s,mode:i}})),i==="dry-run"?!1:i==="force-true"?!0:m(e)},window.addEventListener("spm-set-confirm-mode",e=>{const n=e;n.detail&&n.detail.mode&&(i=n.detail.mode)})}})();
