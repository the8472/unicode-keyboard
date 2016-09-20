"use strict";

var ucd = {chars: [], blocks: [], emoji: []};

setTimeout(fetchUCD, 8000)

function fetchUCD() {
  let xhr = new XMLHttpRequest();
  xhr.open("GET", browser.runtime.getURL("data/ucd.nounihan.grouped.xml"), true)
  xhr.overrideMimeType('text/xml');
  xhr.responseType = "document"
  xhr.addEventListener("load", (event) => {
    parseUCD(xhr.responseXML)
  })
  xhr.addEventListener("error", (err) => console.log("could not retrieve ucd:", err))
  xhr.send()  
}


function parseUCD(xml) {
  let treeWalker = xml.createTreeWalker(xml.documentElement, NodeFilter.SHOW_ELEMENT)
  
  let batch;
  
  batch = () => {
    let i = 0
    
    while(treeWalker.nextNode()) {
      i++;
      
      if(i == 5000) {
        setTimeout(batch, 1);
        break;
      }
      
      let node = treeWalker.currentNode
      
      if(node.localName == "char") {
        let group = node.parentElement;

        let charObj = {na: null, blk: null, gc: null, cp: -1}
        
        getAndSet(charObj,  node, "na", "na")
        getAndSet(charObj,  group, "na", "na")
        getAndSet(charObj,  node, "na", "na1")
        getAndSet(charObj,  group, "na", "na1")
        
        getAndSet(charObj,  node, "blk", "blk")
        getAndSet(charObj,  group, "blk", "blk")

        getAndSet(charObj,  node, "gc", "gc")
        getAndSet(charObj,  group, "gc", "gc")
        
        charObj.na = charObj.na ? [charObj.na] : []
        
        for(let child of node.children) {
          if(child.localName == "name-alias" && child.getAttribute("type") != "correction")
            charObj.na.push(child.getAttribute("alias"))
        }
        
        
        
        if(node.hasAttribute("cp"))
          charObj.cp = parseInt(node.getAttribute("cp"), 16)
        else if(group.hasAttribute("cp"))
          charObj.cp = parseInt(group.getAttribute("cp"), 16)
          
        // some cjk characters are actually specified as ranges (first-cp/last-cp) of characters with identical metadata
        // TODO: decompose those into individual characters instead of ignoring them
        if(charObj.cp < 0)
          continue;
        
        if(charObj.na.length == 0)
          console.log(node)
        
        charObj._lname = charObj.na.map(e => e.toLowerCase()).join(" ");
        
        ucd.chars.push(charObj)
        continue;
      }
      
      if(node.localName == "block") {
        let blockObj = {}
        
        for(let attr of node.attributes) {
          blockObj[attr.localName] = attr.value
        }
        
        ucd.blocks.push(blockObj)
        continue;
      }
    }
  }
  
  batch();
}
