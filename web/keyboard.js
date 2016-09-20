"use strict";

let pagePort = null;
let parentOrigin = null;

let gridData = new WeakMap();


// message-origin doesn't take content script principals into account
// -> use a custom authentication mechanism 
window.onmessage = (e) => {
  browser.storage.local.get("session-secret").then(data => {
    let expect  = data[0]["session-secret"];
    let received = e.data.inject
    if(expect && expect === received) {
      parentOrigin = e.origin;
      pagePort = e.ports[0]
      document.querySelector("#unicode-char-search").focus()
      restore();
    }
  })
};

const ucdPort = browser.runtime.connect();


function updateSuggetions(e) {
  let el = this;
  saveState()
  
  if(el.value == "") {
    update([]);
    return;
  }
  
  ucdPort.postMessage({search: el.value})
}

ucdPort.onMessage.addListener(function(data) {
  if("matches" in data)
    update(data.matches)
})


function update(matches) {
  
  if(pagePort)
    pagePort.postMessage({match: matches[0]});
  
  let oldGrid = document.querySelector("#results")
  let grid = oldGrid.cloneNode();
  let template = document.querySelector("#char-template").content.firstElementChild
  
  document.body.classList.toggle("has-results", matches.length > 0)
  
  for(let match of matches) {
    
    let gridItem = document.importNode(template, true)
    gridItem.querySelector(".hexpoint").textContent = match.cp.toString(16).toUpperCase();
    gridItem.querySelector(".glyph").textContent = String.fromCodePoint(match.cp)
    gridItem.querySelector(".char-name").textContent = match.na.join(", ");
    gridItem.querySelector(".blk").textContent = match.blk
    gridItem.querySelector(".general-cat").textContent = match.gc
    gridData.set(gridItem, match)
    grid.appendChild(gridItem)
  }
  
  if(matches.length > 0) {
    copyDetails(grid.firstElementChild);
  }
  
  oldGrid.replaceWith(grid)

}

function restore() {
  browser.storage.local.get("origin:" + parentOrigin).then(data => {
    data = data[0]["origin:" + parentOrigin];
    if(!data)
      return;
    let input = document.querySelector("#unicode-char-search");
    if(input.value.trim())
      return;
    input.value = data.searchValue
    toggleLayout(data.compact)
    input.dispatchEvent(new InputEvent("input"))
    
    
  })  
}

function saveState() {
  if(!parentOrigin)
    return;
  let data = {}
  data.compact = document.body.classList.contains("compact");
  data.searchValue = document.querySelector("#unicode-char-search").value
  browser.storage.local.set({["origin:" + parentOrigin]: data})
}

function toggleLayout() {
  let cl = document.body.classList;
  if(arguments.length > 0)
    cl.toggle("compact", arguments[0])
  else {
    cl.toggle("compact")
    saveState()
  }
  
  let grid = document.querySelector("#results")
  
  let focused = document.activeElement;
  if(focused && (grid.compareDocumentPosition(focused) & Node.DOCUMENT_POSITION_CONTAINED_BY) != 0) {
    focused.scrollIntoView()
  }
  
}

function copyDetails(sourceNode) {
  let details = document.querySelector("#selected-details")
  for(let c of details.children) c.remove();
  let copy = sourceNode.cloneNode(true)
  copy.removeAttribute("tabindex")
  details.appendChild(copy)
  
}

function init() {
  let search = document.querySelector("#unicode-char-search")
  search.addEventListener("input", updateSuggetions)
  search.addEventListener("change", updateSuggetions)
  search.focus()
  
  document.documentElement.addEventListener("focus", (e) => {
    let el = e.target;
    let data = gridData.get(el);
    if(data && pagePort) {
      pagePort.postMessage({match: data});
      copyDetails(el)
    }
      
  }, {capture: true})
  
  document.addEventListener("keydown", (e) => {
    if(e.altKey && e.key == "l") {
      e.preventDefault();
      e.stopPropagation();
      toggleLayout();
    }
    /*
    if(e.altKey && e.key == "s") {
      search.focus()
      e.preventDefault()
      e.stopPropagation()
    }*/

    if(e.key == "Enter") {
      e.preventDefault();
      pagePort.postMessage({insert: true});
      if(!e.ctrlKey)
        pagePort.postMessage({close: true});
      e.preventDefault()
      e.stopPropagation()
    }
    
    let active = document.activeElement 
    let activeIsChar = active && active.classList.contains("character") 
    
    if(activeIsChar && e.key == "ArrowRight") {
      let next = active.nextElementSibling
      if(next) {
        next.focus()
        e.preventDefault()
      }       
    }
    
    if(activeIsChar && e.key == "ArrowLeft") {
      let prev = active.previousElementSibling
      if(prev) {
        prev.focus()
        e.preventDefault()
      }       
    }
    
    if(activeIsChar && e.key == "ArrowUp") {
      let rect = active.getBoundingClientRect()
      let style = window.getComputedStyle(active)
      let centerX = rect.left + rect.width/2;
      let centerY = rect.top + rect.height/2 - rect.height - (style.marginTop | 0) - (style.borderTopWidth | 0);
      let el = document.elementFromPoint(centerX,centerY);
      el = el && el.closest(".character")
      if(el) {
        el.focus()
        e.preventDefault()
      }
    }
    
    if(activeIsChar && e.key == "ArrowDown") {
      let rect = active.getBoundingClientRect()
      let style = window.getComputedStyle(active)
      let centerX = rect.left + rect.width/2;
      let centerY = rect.top + rect.height/2 + rect.height + (style.marginBottom | 0) + (style.borderBottomWidth | 0);
      let el = document.elementFromPoint(centerX,centerY);
      el = el && el.closest(".character")
      if(el) {
        el.focus()
        e.preventDefault()
      }
    }

  }, true)
  
  
}

document.addEventListener("DOMContentLoaded", init);
