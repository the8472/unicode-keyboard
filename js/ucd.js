"use strict";

var ucd = {chars: new Array(100000), blocks: []};

setTimeout(fetchUCD, 8000)

function fetchUCD() {
  let xhr = new XMLHttpRequest();
  xhr.open("GET", browser.runtime.getURL("web/ucd.nounihan.grouped.xml"), true)
  xhr.responseType = "xml"
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

        let charObj = {}
        
        for(let attr of group.attributes) {
          charObj[attr.localName] = attr.value
        }
        
        for(let attr of node.attributes) {
          charObj[attr.localName] = attr.value
        }
        
        charObj._lname = (charObj.na || charObj.na1).toLowerCase();
        
        ucd.chars.push(charObj)
      }
      
      if(node.localName == "block") {
        let blockObj = {}
        
        for(let attr of node.attributes) {
          blockObj[attr.localName] = attr.value
        }
        
        ucd.blocks.push(blockObj)
      }
    }
  }
  
  batch();
}
