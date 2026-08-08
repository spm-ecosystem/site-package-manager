(function() {
  window.alert = function(msg) {
    window.dispatchEvent(new CustomEvent('spm-show-toast', { 
      detail: { message: String(msg), type: 'info' } 
    }));
  };
  const originalConfirm = window.confirm;
  window.confirm = function(msg) {
    window.dispatchEvent(new CustomEvent('spm-show-toast', { 
      detail: { message: String(msg), type: 'warning' } 
    }));
    return originalConfirm(msg);
  };
})();
