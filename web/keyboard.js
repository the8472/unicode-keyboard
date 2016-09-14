"use strict";

let pagePort = null;

let gridData = new WeakMap();

window.onmessage = (e) => {
  pagePort = e.ports[0]
  document.querySelector("#unicode-char-search").focus()
};

const ucdPort = browser.runtime.connect();


function updateSuggetions(e) {
  let el = this;
  
  ucdPort.postMessage({search: el.value})
}

ucdPort.onMessage.addListener(function(data) {
  if("matches" in data)
    update(data.matches)
})


function update(matches) {
  
  if(pagePort)
    pagePort.postMessage({match: matches[0]});
  
  let grid = document.querySelector("#results")
  
  while(grid.firstChild)
    grid.firstChild.remove();
  
  for(let match of matches) {
    let gridItem = document.createElement("div");
    gridItem.tabIndex = "0"
    gridItem.className = "character"
    gridItem.insertAdjacentHTML("beforeend", `
        <span class="hexpoint">${match.cp}</span>
        <span class="glyph">${String.fromCodePoint(("0x" + match.cp)|0)}</span>
        <span class="char-name">${match.na || match.na1}</span>
        <span class="blk">${match.blk}</span>
        <span class="general-cat">${match.gc}</span>
        
    `)
    gridData.set(gridItem, match)
    grid.appendChild(gridItem)
  }

}



function toggleLayout() {
  let grid = document.querySelector("#results")
  
  let layouts = ["compact", "details"]
  
  let idx = layouts.findIndex(l => grid.classList.contains(l))
  
  for(let l of layouts) {
    grid.classList.remove(l)
  }
  
  grid.classList.add(layouts[(idx+1)%layouts.length])
  
  let focused = document.activeElement;
  if(focused && (grid.compareDocumentPosition(focused) & Node.DOCUMENT_POSITION_CONTAINED_BY) != 0) {
    focused.scrollIntoView()
  }
  
}

function init() {
  let search = document.querySelector("#unicode-char-search")
  search.addEventListener("keyup", updateSuggetions)
  search.focus()
  
  document.documentElement.addEventListener("focus", (e) => {
    let el = e.target;
    let data = gridData.get(el);
    if(data && pagePort)
      pagePort.postMessage({match: data});
  }, {capture: true})
  
  document.addEventListener("keydown", (e) => {
    if(e.altKey && e.key == "l") {
      e.preventDefault();
      e.stopPropagation();
      toggleLayout();
    }
    
    if(e.altKey && e.key == "s") {
      search.focus()
      e.preventDefault()
      e.stopPropagation()
    }

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

  })
  
  
}

document.addEventListener("DOMContentLoaded", init);
