"use strict";

(function() {
  if(window.location.href == browser.extension.getURL("web/keyboard.html"))
    return;
  

  let kbdOn = false;
  let currentMatch = null;
  let recentSelection = null;
  let processLatex = false;
  
  let topOrigin;

  browser.runtime.onMessage.addListener((message) => {
    if(!(message instanceof Object))
      return;
    
    if("top-url" in message) {
      console.log("child url", message)
      topOrigin = new URL(message["top-url"]).origin;
    }
    
    if(message.toggleLatex)
      toggleLatex();
    
    if("keyboardEnabled" in message) {
      kbdOn = message.keyboardEnabled 
    }
    
    if("match" in message) {
      currentMatch = message.match
    }
    
    if("insert" in message && currentMatch && recentSelection && "selectionStart" in recentSelection) {
      let str = String.fromCodePoint(currentMatch.cp);
      let input = recentSelection;
      input.setRangeText(str, input.selectionStart, input.selectionEnd, "end");
    }
    
    if(message["invalidate-remembered-focus"] && recentSelection && "selectionStart" in recentSelection) {
      recentSelection = null;
    }
    
    if(message["restoreFocus"] && recentSelection && recentSelection != document.activeElement)
      recentSelection.focus()
      //document.activeElement.scrollIntoView();
  });
  
  browser.runtime.sendMessage({"top-url": true})

  function updateRememberedFocus(el) {
    if(el == recentSelection)
      return;
    if(!(el instanceof Element))
      return;
    
    let isFrame = el.localName == "iframe";
    
    if(document.hasFocus() && (!isFrame || el.src != browser.extension.getURL("web/keyboard.html"))) {
      browser.runtime.sendMessage({broadcast: {"invalidate-remembered-focus": true}}).then((rsp) => {
        recentSelection = el;
      })
      
    }
  }
  
  function toggleLatex() {
    if(!topOrigin)
      return;
    
    let key = "latex|"+topOrigin;
    browser.storage.local.get(key).then(data => {
      data = data && data[0];
      processLatex = !!(data[key] && data[key].latex)
      document.documentElement.classList.toggle("latex-input-enabled", processLatex)
    })
  }

  document.addEventListener("focus", (e) => {
    let el = e.target;
    updateRememberedFocus(el);

    if("selectionStart" in el) {
      toggleLatex();      
    }
    
  }, {capture: true})
  
  document.addEventListener("input", (e) => {
    let el = e.target;
    if(!"selectionStart" in el)
      return;
    if(!processLatex)
      return;
    
    let start = el.selectionStart
    let end = el.selectionEnd
    
    if(end < 1 || start != end)
      return;
    
    // grab everything left of the previous whitespace char
    let toProcess = el.value.substring(0,start).replace(/\s?\S*$/,"");
    browser.runtime.sendMessage({processLatex: toProcess}).then(rsp => {
      // skip if things changed asynchronously in the meantime
      if(!el.value.startsWith(toProcess))
        return;
      console.log(start, end, toProcess, rsp)
      el.setRangeText(rsp, 0, toProcess.length);
    })
    
    
  })
  
  let head = document.querySelector("head");
  if(head) {
      head.insertAdjacentHTML("beforeend", `<style>
        .latex-input-enabled input[type=text]:focus, .latex-input-enabled textarea:focus {
          background-repeat: no-repeat;
          background-size: auto auto;
          background-position: bottom right;
          background-origin: content-box;
          background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="10" height="18"><text y="18" style="font-size:18px">𝔏 </text></svg>');
        }
      </style>`)
  }
  
})();
