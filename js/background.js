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
})


function search(query, port) {
  
  let match, blk, cat;
  
  match = /b:(\S+)/.exec(query)
  if(match) {
    blk = match[1].toLowerCase()
    query = query.replace(match[0], "")
  }
  
  match = /c:(\S+)/.exec(query)
  if(match) {
    cat = match[1].toLowerCase()
    query = query.replace(match[0], "")
  }
  
  query = query.trim()
  
  query = query.split(/\s+/)
  
  if(!ucd)
    return;
  
  let matches = ucd.chars.filter(c => {
    let matches = true;
    
    if(blk)
      matches = matches && c.blk.toLowerCase().includes(blk)
    
    if(cat)
      matches = matches && c.gc.toLowerCase().includes(cat)
      
    if(query)
      matches = matches && query.every(q => c._lname.includes(q))
    
    return matches
  })
  
  // limit results
  if(!blk && !query.some(q => q.length >= 3))
    matches = matches.slice(0,1000)
    
  port.postMessage({matches: matches})
}