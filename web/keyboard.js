"use strict";

let parentOrigin = null;

let gridData = new WeakMap();

let displayedResults;

class ResultSet {
  constructor({matches, query}) {
    this.matches = matches
    this.query = query
    this.gridData = new WeakMap()    
  }
  
  forNode(n) {
    return this.gridData.get(n)
  }
  
  draw() {
    let matches = this.matches;
    
    browser.runtime.sendMessage({broadcast: {match: matches[0]}})
    
    let oldGrid = document.querySelector("#results")
    let grid = oldGrid.cloneNode();
    let template = document.querySelector("#char-template").content.firstElementChild
    
    document.body.classList.toggle("has-results", matches.length > 0)
    
    let i = 0;
    let batch = () => {
      while(true) {
        let match = matches[i]
        let gridItem = document.importNode(template, true)
        gridItem.querySelector(".hexpoint").textContent = match.cp.toString(16).toUpperCase();
        gridItem.querySelector(".glyph").textContent = String.fromCodePoint(match.cp)
        gridItem.querySelector(".char-name").textContent = match.na.join(", ");
        gridItem.querySelector(".blk").textContent = match.blk
        gridItem.querySelector(".general-cat").textContent = match.gc
        this.gridData.set(gridItem, match)
        grid.appendChild(gridItem)
        
        i++;
        
        if(i>=matches.length)
          break;
        
        if(i % 1000 == 0) {
          setTimeout(batch, 1)          
          break;
        }
        
      }
    }
    
    batch();
    
    if(matches.length > 0) {
      copyDetails(grid.firstElementChild);
    }
    
    oldGrid.replaceWith(grid)
    
    displayedResults = this;
  }
  
}

displayedResults = new ResultSet({matches: [], query: ""});


const ucdPort = browser.runtime.connect();

let inFlight = false;

function currentSearch() {
  return document.querySelector("#unicode-char-search").value
}

function updateSuggetions() {
  if(inFlight)
    return;
  
  saveState()
  
  let val = currentSearch();
  
  if(val  == "") {
    processResults({matches: [], query: ""});
    return;
  }
  
  inFlight = true;
  
  ucdPort.postMessage({search: val})
}

ucdPort.onMessage.addListener(function(data) {
  if("tabUrl" in data) {
    parentOrigin = new URL(data.tabUrl).origin
    restore()
  }
  
  if("searchResult" in data) {
    processResults(data.searchResult)
  }
})

function processResults(res) {
  inFlight = false;
  
  if(displayedResults.query != res.query) {
    let r = new ResultSet({matches: res.matches, query: res.query})
    r.draw()
  }
    
  let currentQuery  = currentSearch();
  if(currentQuery != res.query)
    updateSuggetions();  
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
    updateSuggetions()
    
    
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
    let data = displayedResults.forNode(el);
    if(data) {
      browser.runtime.sendMessage({broadcast: {match: data}})
      copyDetails(el)
    }
  }, {capture: true})
  
  document.addEventListener("keydown", (e) => {
    if(e.altKey && e.key == "l") {
      e.preventDefault();
      e.stopPropagation();
      toggleLayout();
    }
    
    if(e.key == "Escape") {
      browser.runtime.sendMessage({broadcast: {restoreFocus: true}})
      e.preventDefault()
    }

    if(e.key == "Enter") {
      browser.runtime.sendMessage({broadcast: {insert: true}})
      if(!e.ctrlKey)
        browser.runtime.sendMessage({broadcast: {close: true}})
      e.preventDefault()
      e.stopPropagation()
    }
    
    if(e.key == " " && e.ctrlKey) {
      browser.runtime.sendMessage({broadcast: {insert: true, restoreFocus: true}})
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
