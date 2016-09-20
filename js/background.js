"use strict";

browser.commands.onCommand.addListener((command) => {
  if(command == "open-keyboard")
    openKeyboard();
})

function openKeyboard() {
  browser.tabs.query({currentWindow: true, active: true}).then(tabs => {
    return tabs[0];
  }).then(tab => {
    browser.tabs.sendMessage(tab.id, "toggle-keyboard")
  })
}

browser.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener((msg) => {
    if("search" in msg) {
      search(msg.search, port)
    } 
  })
});


(function() {
  let secret = new Uint8Array(16);
  window.crypto.getRandomValues(secret)
  browser.storage.local.set({
    "session-secret": btoa(secret) 
  });
})();

function search(query, port) {
  
  let match, blk, cat;
  
  match = /b:(\S+)/.exec(query)
  if(match) {
    blk = new RegExp(match[1], "i")
    query = query.replace(match[0], "")
  }
  
  match = /c:(\S+)/.exec(query)
  if(match) {
    cat = new RegExp(match[1], "i")
    query = query.replace(match[0], "")
  }
  
  query = query.trim()
  
  query = query.split(/\s+/).filter(e => e.length > 0)
  // longest terms first so string match algorithms can bail out faster
  query = query.sort((a, b) => a.length - b.length).reverse()
  query = query.map(q => new RegExp(q, "i"))
  if(query.length == 0)
    query = null;
  
  if(!ucd)
    return;
  
  let matches = ucd.chars.filter(c => {
    let matches = true;
    
    if(blk)
      matches = matches && blk.test(c.blk)
    
    if(cat)
      matches = matches && cat.test(c.gc)
      
    if(query)
      matches = matches && query.every(q => q.test(c._lname))
    
    return matches
  })
  
  // limit results
  if(!blk && !(query || []).some(q => q.source.length >= 3))
    matches = matches.slice(0,1000)
    
  port.postMessage({matches: matches})
}