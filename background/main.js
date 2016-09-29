"use strict";

browser.commands.onCommand.addListener((command) => {
  if(command == "open-keyboard")
    openKeyboard();
  if(command == "latex-input")
    toggleLatex();
})

function openKeyboard() {
  browser.tabs.query({currentWindow: true, active: true}).then(tabs => {
    return tabs[0];
  }).then(tab => {
    browser.tabs.sendMessage(tab.id,{tabId: tab.id, "toggle-keyboard": true}, {frameId: 0})
  })
};

function toggleLatex() {
  browser.tabs.query({currentWindow: true, active: true}).then(tabs => {
    let tab = tabs[0];
    let origin = new URL(tab.url).origin;
    let key = "latex|"+origin;
    
    browser.storage.local.get(key).then(data => {
      let newData = {[key]: {latex: true}};
      if(data[key]) {
        newData[key].latex = !data[key].latex;
      }
      return browser.storage.local.set(newData)
    }).then(() => {
      browser.tabs.sendMessage(tab.id, {"toggleLatex": true});
    })
    
  })
  //browser.tabs.sendMessage(null, {toggleLatex: true});
};

browser.runtime.onMessage.addListener((message, sender, response) => {
  if("top-url" in message) {
    browser.tabs.sendMessage(sender.tab.id, {"top-url": sender.tab.url}, {frameId: sender.frameID})
  }
  
  if("processLatex" in message) {
    response(require("latex-to-unicode")(message.processLatex))
    return;
  }
  
  if("broadcast" in message) {
    let reflected = message.broadcast
    reflected["top-url"] = sender.tab.url
    browser.tabs.sendMessage(sender.tab.id, reflected)
  }
  
  response("_brd")
})

browser.runtime.onConnect.addListener((port) => {
  port.postMessage({tabId: port.sender.tab.id, tabUrl: port.sender.tab.url})
  port.onMessage.addListener((msg) => {
    if("search" in msg) {
      search(msg.search, port)
    } 
  })
});


function search(query, port) {
  
  const orgQuery = query;
  
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
  
  let matches = []
  let limit = !blk && !(query || []).some(q => q.source.length >= 3) ? 1000 : Number.MAX_SAFE_INTEGER
  
  for(let c of ucd.chars) {
    let pred = true;
    
    if(blk)
      pred = matches && blk.test(c.blk)
    
    if(cat)
      pred = matches && cat.test(c.gc)
      
    if(query)
      pred = matches && query.every(q => q.test(c._lname))
    
    if(pred)
      matches.push(c)
    
    if(matches.length > limit)
      break;
  }
    
  port.postMessage({searchResult: {matches: matches, query: orgQuery}})
}